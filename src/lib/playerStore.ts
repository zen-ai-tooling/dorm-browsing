import { useSyncExternalStore } from "react";
import {
  BULLETIN_MAX_PINS,
  MOODS,
  ROOMS,
  type Bulletin,
  type MoodKey,
  type NowWatching,
  type PlacedItem,
  type Pin,
  type Song,
} from "@/data/dorm";
import { cleanName, DEFAULT_LOOK, normalizeAvatar, randomLook, type AvatarLook } from "@/data/avatar";
import { normalizeBulletin, normalizeSongs, normalizeWatching } from "@/data/interests";
import { ITEM_CATALOG, newlyCompletedSets, SET_REWARD } from "@/data/items";
import { migrateMountLayout } from "@/data/placement";
import {
  DAILY_COIN_REWARD,
  normalizeDailyAnswers,
  promptForToday,
  todayKey,
  trimDailyAnswers,
  type DailyAnswer,
} from "@/data/prompts";
import { nextSinceExclusive, rollPackage, type PackageReward } from "@/data/mail";
import { autoCompleteQuests, QUEST_BY_ID, type QuestId } from "@/data/quests";
import { setSfxMuted, sfx } from "@/game/sounds";

const STORAGE_KEY = "dorm-vibes-player-state";
const STARTING_COINS = 50;
/** escalating daily bonus, capped so shop prices stay meaningful */
const STREAK_BONUS_CAP = 10;

/** seed layout for "Your Room" — tile coords are the footprint's top-left, room-relative */
export const DEFAULT_MY_ROOM_LAYOUT: PlacedItem[] = [
  { itemId: "poster_default", gx: 4, gy: 0 },
  { itemId: "bed_basic", gx: 9, gy: 5 },
  { itemId: "tv_basic", gx: 9, gy: 3 },
  { itemId: "desk_basic", gx: 1, gy: 7 },
  { itemId: "speaker_basic", gx: 1, gy: 2 },
  { itemId: "board_basic", gx: 9, gy: 0 },
  { itemId: "plant_basic", gx: 1, gy: 4 },
];

export interface PlayerState {
  coins: number;
  ownedItemIds: string[];
  roomLayout: PlacedItem[];
  lastDailyAnswerDate: string | null;
  currentStreak: number;
  longestStreak: number;
  lastShopSeenDate: string | null;
  muted: boolean;
  /** editable content for "Your Room" — seeded from ROOMS[0] */
  mySongs: Song[];
  myBulletin: Bulletin;
  myNowWatching: NowWatching;
  /** equipped wallpaper catalog id; falsy / unknown ids fall back to the mood default */
  myWallpaperId: string;
  /** collapses the controls hint card for returning players */
  seenControls: boolean;
  /** collection sets already rewarded — each grants its bonus exactly once, ever */
  completedSets: string[];
  /** daily question answers by date key, last 30 days */
  dailyAnswers: Record<string, DailyAnswer>;
  /** date the daily mail package was last opened */
  lastPackageDate: string | null;
  /** the last opened package, so its reward shows the same all day (and dev reset can undo it) */
  lastPackage: LastPackage | null;
  /** pity counter: packages opened in a row without a mail exclusive */
  packagesSinceExclusive: number;
  /** welcome quests finished (rewarded, or auto-ticked for older saves) */
  questsDone: string[];
  /** the one-time "Welcome to Floor 3" celebration has been shown */
  questsCelebrated: boolean;
  /** your character (Iteration 25) */
  avatar: AvatarLook;
  /** max 16 chars; display only — your room's id and ROOMS[0].name never change */
  playerName: string;
  /** Your Room's mood (wall/floor/accent colours) — seeded from ROOMS[0] */
  myMood: MoodKey;
  /** finished (or skipped) Move-In Day */
  onboarded: boolean;
  /** older saves see a one-time "make your avatar" toast */
  avatarNewsSeen: boolean;
}

export interface LastPackage {
  date: string;
  reward: PackageReward;
  /** pity counter before this package — restored by the dev reset */
  prevSince: number;
}

const seed = ROOMS[0]!;

const defaultState = (): PlayerState => ({
  coins: STARTING_COINS,
  ownedItemIds: Object.values(ITEM_CATALOG)
    .filter((i) => i.unlockedByDefault)
    .map((i) => i.id),
  roomLayout: DEFAULT_MY_ROOM_LAYOUT.map((p) => ({ ...p })),
  lastDailyAnswerDate: null,
  currentStreak: 0,
  longestStreak: 0,
  lastShopSeenDate: null,
  muted: false,
  mySongs: seed.songs.map((s) => ({ ...s })),
  myBulletin: { pins: seed.bulletin.pins.map((p) => ({ ...p })) },
  myNowWatching: seed.nowWatching
    ? { ...seed.nowWatching, upNext: [...(seed.nowWatching.upNext ?? [])] }
    : { title: "Nothing yet", status: "" },
  myWallpaperId: seed.wallpaperId,
  seenControls: false,
  completedSets: [],
  dailyAnswers: {},
  lastPackageDate: null,
  lastPackage: null,
  packagesSinceExclusive: 0,
  questsDone: [],
  questsCelebrated: false,
  avatar: randomLook(),
  playerName: "",
  myMood: seed.mood,
  onboarded: false,
  avatarNewsSeen: true,
});

const normalizeLastPackage = (raw: unknown): LastPackage | null => {
  const p = raw as Partial<LastPackage> | null;
  if (!p || typeof p.date !== "string" || !p.reward || typeof p.reward !== "object") return null;
  const kind = (p.reward as { kind?: unknown }).kind;
  if (!["coins", "postcard", "item", "allFound", "jackpot"].includes(kind as string)) return null;
  return { date: p.date, reward: p.reward as PackageReward, prevSince: typeof p.prevSince === "number" ? p.prevSince : 0 };
};

/** older saves predate the poster catalog item and the TV's side-wall spot */
export const migrateLayout = (layout: PlacedItem[]): PlacedItem[] => {
  const next = layout.map((p) => ({ ...p }));
  const tv = next.find((p) => p.itemId === "tv_basic");
  if (tv && tv.gx === 5 && tv.gy === 1) {
    tv.gx = 9;
    tv.gy = 3;
  }
  if (!next.some((p) => p.itemId === "poster_default"))
    next.unshift({ itemId: "poster_default", gx: 4, gy: 0 });
  // Iteration 17: row 0 is the back-wall face — wall items go there, floor items move off it
  return migrateMountLayout(next);
};

/**
 * Iteration 25 fields. Saves from before avatars existed keep the old default look,
 * skip Move-In Day (onboarded) and get a one-time toast instead.
 */
export const migrateMoveIn = (parsed: Partial<PlayerState>) => {
  const legacy = !("onboarded" in parsed);
  return {
    avatar: normalizeAvatar(parsed.avatar, legacy ? DEFAULT_LOOK : randomLook()),
    playerName: cleanName(parsed.playerName).trim(),
    myMood: typeof parsed.myMood === "string" && parsed.myMood in MOODS ? parsed.myMood : seed.mood,
    onboarded: legacy ? true : parsed.onboarded === true,
    avatarNewsSeen: legacy ? false : parsed.avatarNewsSeen !== false,
  };
};

/** quests an older save already satisfies — ticked without paying their rewards */
export const migrateQuests = (s: PlayerState): string[] =>
  autoCompleteQuests(s.questsDone, {
    lastDailyAnswerDate: s.lastDailyAnswerDate,
    lastPackageDate: s.lastPackageDate,
    ownedItemIds: s.ownedItemIds,
    roomLayout: s.roomLayout,
    defaultLayout: DEFAULT_MY_ROOM_LAYOUT,
  });

let state: PlayerState = defaultState();

let hydrated = false;
const listeners = new Set<() => void>();

const read = (): PlayerState => {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<PlayerState>;
    const base = defaultState();
    const next: PlayerState = {
      coins: typeof parsed.coins === "number" ? parsed.coins : base.coins,
      ownedItemIds: Array.isArray(parsed.ownedItemIds)
        ? Array.from(new Set([...base.ownedItemIds, ...parsed.ownedItemIds])).filter(
            (id) => !!ITEM_CATALOG[id],
          )
        : base.ownedItemIds,
      roomLayout: Array.isArray(parsed.roomLayout)
        ? migrateLayout(parsed.roomLayout.filter((p) => !!ITEM_CATALOG[p?.itemId]))
        : base.roomLayout,

      lastDailyAnswerDate:
        typeof parsed.lastDailyAnswerDate === "string" ? parsed.lastDailyAnswerDate : null,
      currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
      longestStreak: typeof parsed.longestStreak === "number" ? parsed.longestStreak : 0,
      lastShopSeenDate:
        typeof parsed.lastShopSeenDate === "string" ? parsed.lastShopSeenDate : null,
      seenControls: parsed.seenControls === true,
      completedSets: Array.isArray(parsed.completedSets)
        ? parsed.completedSets.filter((x): x is string => typeof x === "string")
        : [],
      muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
      mySongs: normalizeSongs(parsed.mySongs, base.mySongs),
      // Iteration 21: legacy { interests, event } boards become pins — nothing is dropped
      myBulletin: normalizeBulletin(parsed.myBulletin, base.myBulletin),
      myNowWatching: normalizeWatching(parsed.myNowWatching, base.myNowWatching),
      myWallpaperId:
        typeof parsed.myWallpaperId === "string" ? parsed.myWallpaperId : base.myWallpaperId,
      // Iteration 24: daily answers, mail package and welcome quests
      dailyAnswers: normalizeDailyAnswers(parsed.dailyAnswers),
      lastPackageDate: typeof parsed.lastPackageDate === "string" ? parsed.lastPackageDate : null,
      lastPackage: normalizeLastPackage(parsed.lastPackage),
      packagesSinceExclusive:
        typeof parsed.packagesSinceExclusive === "number" ? parsed.packagesSinceExclusive : 0,
      questsDone: Array.isArray(parsed.questsDone)
        ? parsed.questsDone.filter((x): x is string => typeof x === "string")
        : [],
      questsCelebrated: parsed.questsCelebrated === true,
      ...migrateMoveIn(parsed),
    };
    // a worn outfit you no longer own (dev reset) falls back to your own pieces
    if (next.avatar.outfitItemId && !next.ownedItemIds.includes(next.avatar.outfitItemId))
      delete next.avatar.outfitItemId;
    // saves from before quests existed: tick what they've already done, with no rewards
    if (!Array.isArray(parsed.questsDone)) next.questsDone = migrateQuests(next);
    return next;
  } catch {
    return defaultState();
  }
};

const persist = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked — in-memory state still works this session */
  }
};

const set = (next: Partial<PlayerState>) => {
  state = { ...state, ...next };
  persist();
  listeners.forEach((l) => l());
};

export const hydratePlayerState = () => {
  if (hydrated) return;
  hydrated = true;
  state = read();
  setSfxMuted(state.muted);
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getPlayerState = () => state;

/** tests only: forget hydration so each test file starts from its own stubbed storage */
export const __resetStoreForTests = () => {
  hydrated = false;
  devHydrated = false;
  state = defaultState();
  dev = DEV_OFF;
  lastCompletedSets = [];
};

// ---------- dev mode ----------
// Lives under its own key (not PlayerState) so wiping the save never flips it.
// It only ever bypasses rules (coins, ownership, the daily lock) — it never changes them.

const DEV_KEY = "dorm-vibes-dev";
export interface DevState {
  enabled: boolean;
  unlimited: boolean;
}
const DEV_OFF: DevState = { enabled: false, unlimited: false };
let dev: DevState = DEV_OFF;
let devHydrated = false;
const devListeners = new Set<() => void>();

const writeDev = (next: DevState) => {
  dev = next;
  try {
    if (next.enabled) window.localStorage.setItem(DEV_KEY, JSON.stringify({ unlimited: next.unlimited }));
    else window.localStorage.removeItem(DEV_KEY);
  } catch {
    /* storage blocked — dev mode still works this session */
  }
  devListeners.forEach((l) => l());
};

/** reads `?dev=1` / `?dev=0`, strips it from the URL, then loads the stored dev flag */
export const hydrateDevMode = () => {
  if (devHydrated || typeof window === "undefined") return;
  devHydrated = true;
  let next: DevState = DEV_OFF;
  try {
    const raw = window.localStorage.getItem(DEV_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { unlimited?: unknown };
      next = { enabled: true, unlimited: parsed?.unlimited !== false };
    }
  } catch {
    next = { enabled: true, unlimited: true };
  }
  const url = new URL(window.location.href);
  const param = url.searchParams.get("dev");
  if (param === "1") next = { enabled: true, unlimited: true };
  else if (param === "0") next = DEV_OFF;
  if (param !== null) {
    url.searchParams.delete("dev");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  writeDev(next);
};

const subscribeDev = (l: () => void) => {
  devListeners.add(l);
  return () => devListeners.delete(l);
};
const getDev = () => dev;
const getDevServer = () => DEV_OFF;
export const useDevMode = () => useSyncExternalStore(subscribeDev, getDev, getDevServer);

/** dev mode with unlimited coins on */
export const isUnlimited = () => dev.enabled && dev.unlimited;

/** the single affordability rule used by every buy button and price check */
export const canAfford = (price: number) => isUnlimited() || state.coins >= price;

const defaultOwned = () => defaultState().ownedItemIds;

export const devActions = {
  /** hidden triple-tap switch — the only dev action that works while dev mode is off */
  toggleEnabled() {
    writeDev(dev.enabled ? DEV_OFF : { enabled: true, unlimited: true });
    return dev.enabled;
  },
  setUnlimited(on: boolean) {
    if (!dev.enabled) return;
    writeDev({ ...dev, unlimited: on });
  },
  addCoins(n: number) {
    if (!dev.enabled) return;
    set({ coins: state.coins + n });
  },
  zeroCoins() {
    if (!dev.enabled) return;
    set({ coins: 0 });
    writeDev({ ...dev, unlimited: false });
  },
  unlockAll() {
    if (!dev.enabled) return;
    set({ ownedItemIds: Array.from(new Set([...state.ownedItemIds, ...Object.keys(ITEM_CATALOG)])) });
  },
  resetPurchases() {
    if (!dev.enabled) return;
    const owned = defaultOwned();
    const keep = new Set(owned);
    set({
      ownedItemIds: owned,
      roomLayout: state.roomLayout.filter((p) => keep.has(p.itemId)),
      myWallpaperId: keep.has(state.myWallpaperId) ? state.myWallpaperId : seed.wallpaperId,
      avatar: dropOutfit(state.avatar),
    });
  },
  allowDailyAgain() {
    if (!dev.enabled) return;
    const dailyAnswers = { ...state.dailyAnswers };
    delete dailyAnswers[todayKey()];
    set({ lastDailyAnswerDate: todayKey(new Date(Date.now() - 86_400_000)), dailyAnswers });
  },
  /** undoes today's package (reward, pity counter) so it can be opened again — same roll */
  resetPackage() {
    if (!dev.enabled) return;
    const last = state.lastPackage;
    if (!last || last.date !== todayKey()) {
      set({ lastPackageDate: null });
      return;
    }
    const itemId = last.reward.kind === "item" ? last.reward.itemId : null;
    set({
      coins: Math.max(0, state.coins - last.reward.coins),
      ownedItemIds: itemId ? state.ownedItemIds.filter((id) => id !== itemId) : state.ownedItemIds,
      roomLayout: itemId ? state.roomLayout.filter((p) => p.itemId !== itemId) : state.roomLayout,
      packagesSinceExclusive: last.prevSince,
      lastPackageDate: null,
      lastPackage: null,
    });
  },
  resetQuests() {
    if (!dev.enabled) return;
    set({ questsDone: [], questsCelebrated: false });
  },
  /** runs Move-In Day again on the current save (nothing else is reset) */
  replayMoveIn() {
    if (!dev.enabled) return;
    set({ onboarded: false });
  },
  resetStreak() {
    if (!dev.enabled) return;
    set({ currentStreak: 0 });
  },
  resetEverything() {
    if (!dev.enabled) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  },
};

let lastCompletedSets: string[] = [];

/** finishes a welcome quest once: pays its coins (or item) and plays the coin sound */
const completeQuest = (id: QuestId) => {
  if (state.questsDone.includes(id)) return false;
  const q = QUEST_BY_ID[id];
  let coins = state.coins + q.coins;
  let ownedItemIds = state.ownedItemIds;
  if (q.itemId) {
    // already bought the gift? pay its shop price instead so the reward is never empty
    if (ownedItemIds.includes(q.itemId)) coins += ITEM_CATALOG[q.itemId]?.price ?? 0;
    else ownedItemIds = [...ownedItemIds, q.itemId];
  }
  set({ questsDone: [...state.questsDone, id], coins, ownedItemIds });
  sfx.coin();
  return true;
};
/** sets the most recent successful buy() completed (and paid out), for the shop's celebration */
export const takeCompletedSets = () => {
  const out = lastCompletedSets;
  lastCompletedSets = [];
  return out;
};

const dropOutfit = (look: AvatarLook): AvatarLook => {
  const { outfitItemId: _o, ...rest } = look;
  void _o;
  return rest;
};

/** your 3 sticker picks replace the board's interest pins; other pins stay */
export const pinsWithInterests = (pins: Pin[], stickerIds: string[]): Pin[] => {
  const picks: Pin[] = stickerIds.slice(0, 3).map((stickerId) => ({ kind: "interest", stickerId }));
  return [...picks, ...pins.filter((p) => p.kind !== "interest")].slice(0, BULLETIN_MAX_PINS);
};

export const playerActions = {
  setAvatar(look: AvatarLook) {
    const next = normalizeAvatar(look);
    if (next.outfitItemId && !state.ownedItemIds.includes(next.outfitItemId)) delete next.outfitItemId;
    set({ avatar: next });
  },
  /** wear an owned outfit, or null to go back to your own pieces */
  wearOutfit(itemId: string | null) {
    if (itemId === null) {
      set({ avatar: dropOutfit(state.avatar) });
      return true;
    }
    if (!state.ownedItemIds.includes(itemId) || ITEM_CATALOG[itemId]?.category !== "outfit") return false;
    set({ avatar: { ...state.avatar, outfitItemId: itemId } });
    sfx.placeItem();
    return true;
  },
  setPlayerName(name: string) {
    set({ playerName: cleanName(name) });
  },
  setMyMood(mood: MoodKey) {
    if (!(mood in MOODS) || state.myMood === mood) return;
    set({ myMood: mood });
  },
  /** Move-In Day "Unpack": 3 interest stickers + the song on repeat */
  unpack(stickerIds: string[], song: Song | null) {
    const mySongs = state.mySongs.map((s) => ({ ...s }));
    if (song && song.title.trim()) mySongs[0] = { title: song.title.trim(), artist: song.artist.trim() };
    set({
      myBulletin: { pins: stickerIds.length ? pinsWithInterests(state.myBulletin.pins, stickerIds) : state.myBulletin.pins },
      mySongs,
    });
  },
  finishMoveIn() {
    set({ onboarded: true, playerName: state.playerName.trim(), seenControls: true });
  },
  markAvatarNewsSeen() {
    if (state.avatarNewsSeen) return;
    set({ avatarNewsSeen: true });
  },
  buy(itemId: string) {
    const item = ITEM_CATALOG[itemId];
    if (!item || item.exclusive || state.ownedItemIds.includes(itemId) || !canAfford(item.price))
      return false;
    // dev "unlimited" runs the full purchase flow but never touches the real balance
    const coins = isUnlimited() ? state.coins : state.coins - item.price;
    const ownedItemIds = [...state.ownedItemIds, itemId];
    // only sets this purchase finished — sets completed by other means (dev unlock) aren't paid out later
    const finished = newlyCompletedSets(ownedItemIds, state.completedSets).filter((id) => id === item.set);
    set({
      coins: coins + finished.length * SET_REWARD,
      ownedItemIds,
      completedSets: [...state.completedSets, ...finished],
    });
    lastCompletedSets = finished;
    sfx.purchase();
    sfx.coin();
    completeQuest("buy");
    return true;
  },
  /** the editor's commit path: every move, rotate, place or remove in Your Room */
  setRoomLayout(layout: PlacedItem[]) {
    set({ roomLayout: layout.map((p) => ({ ...p })) });
    completeQuest("room");
  },
  answerDaily(answer: string) {
    const today = todayKey();
    if (state.lastDailyAnswerDate === today) return false;
    const dailyAnswers = trimDailyAnswers({
      ...state.dailyAnswers,
      [today]: { promptId: promptForToday().id, answer },
    });
    // gentle streak: yesterday continues it, a gap just starts over — nothing is lost
    const yesterday = todayKey(new Date(Date.now() - 86_400_000));
    const currentStreak = state.lastDailyAnswerDate === yesterday ? state.currentStreak + 1 : 1;
    const bonus = Math.min(currentStreak, STREAK_BONUS_CAP);
    set({
      coins: state.coins + DAILY_COIN_REWARD + bonus,
      lastDailyAnswerDate: today,
      dailyAnswers,
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
    });
    sfx.coin();
    completeQuest("daily");
    return true;
  },
  /** opens today's package once; the roll is seeded by date so a refresh can't change it */
  openPackage(): PackageReward {
    const today = todayKey();
    if (state.lastPackageDate === today && state.lastPackage?.date === today) return state.lastPackage.reward;
    const prevSince = state.packagesSinceExclusive;
    const reward = rollPackage(today, prevSince, state.ownedItemIds);
    set({
      coins: state.coins + reward.coins,
      ownedItemIds:
        reward.kind === "item" && !state.ownedItemIds.includes(reward.itemId)
          ? [...state.ownedItemIds, reward.itemId]
          : state.ownedItemIds,
      packagesSinceExclusive: nextSinceExclusive(prevSince, reward),
      lastPackageDate: today,
      lastPackage: { date: today, reward, prevSince },
    });
    sfx.coin();
    completeQuest("mail");
    return reward;
  },
  /** quests completed from the UI (e.g. spotting something in common with Sam) */
  completeQuest(id: QuestId) {
    return completeQuest(id);
  },
  markQuestsCelebrated() {
    if (state.questsCelebrated) return;
    set({ questsCelebrated: true });
  },
  markShopSeen() {
    if (state.lastShopSeenDate === todayKey()) return;
    set({ lastShopSeenDate: todayKey() });
  },
  setSongs(songs: Song[]) {
    set({ mySongs: songs.map((s) => ({ ...s })) });
  },
  setBulletin(bulletin: Bulletin) {
    set({ myBulletin: { pins: bulletin.pins.map((p) => ({ ...p })) } });
  },
  setNowWatching(nowWatching: NowWatching) {
    set({ myNowWatching: { ...nowWatching, upNext: [...(nowWatching.upNext ?? [])] } });
  },
  setWallpaper(itemId: string) {
    if (state.myWallpaperId === itemId) return;
    set({ myWallpaperId: itemId });
    sfx.placeItem();
  },
  markControlsSeen() {
    if (state.seenControls) return;
    set({ seenControls: true });
  },
  toggleMute() {
    const muted = !state.muted;
    setSfxMuted(muted);
    set({ muted });
    if (!muted) sfx.uiClick();
    return muted;
  },
};

export const usePlayerState = () => useSyncExternalStore(subscribe, getPlayerState, getPlayerState);
