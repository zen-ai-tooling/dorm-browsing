import { useSyncExternalStore } from "react";
import { ROOMS, type Bulletin, type NowWatching, type PlacedItem, type Song } from "@/data/dorm";
import { normalizeBulletin, normalizeSongs, normalizeWatching } from "@/data/interests";
import { ITEM_CATALOG, newlyCompletedSets, SET_REWARD } from "@/data/items";
import { migrateMountLayout } from "@/data/placement";
import { DAILY_COIN_REWARD, todayKey } from "@/data/prompts";
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
});

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
    return {
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
    };
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
    });
  },
  allowDailyAgain() {
    if (!dev.enabled) return;
    set({ lastDailyAnswerDate: todayKey(new Date(Date.now() - 86_400_000)) });
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
/** sets the most recent successful buy() completed (and paid out), for the shop's celebration */
export const takeCompletedSets = () => {
  const out = lastCompletedSets;
  lastCompletedSets = [];
  return out;
};

export const playerActions = {
  buy(itemId: string) {
    const item = ITEM_CATALOG[itemId];
    if (!item || state.ownedItemIds.includes(itemId) || !canAfford(item.price)) return false;
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
    return true;
  },
  setRoomLayout(layout: PlacedItem[]) {
    set({ roomLayout: layout.map((p) => ({ ...p })) });
  },
  answerDaily() {
    const today = todayKey();
    if (state.lastDailyAnswerDate === today) return false;
    // gentle streak: yesterday continues it, a gap just starts over — nothing is lost
    const yesterday = todayKey(new Date(Date.now() - 86_400_000));
    const currentStreak = state.lastDailyAnswerDate === yesterday ? state.currentStreak + 1 : 1;
    const bonus = Math.min(currentStreak, STREAK_BONUS_CAP);
    set({
      coins: state.coins + DAILY_COIN_REWARD + bonus,
      lastDailyAnswerDate: today,
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
    });
    sfx.coin();
    return true;
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
