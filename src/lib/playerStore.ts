import { useSyncExternalStore } from "react";
import { ROOMS, type PlacedItem, type Song } from "@/data/dorm";
import { ITEM_CATALOG } from "@/data/items";
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
  { itemId: "board_basic", gx: 9, gy: 1 },
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
  myBulletin: { interests: string[]; event: string };
  myNowWatching: { title: string; status?: string };
  /** equipped wallpaper catalog id; falsy / unknown ids fall back to the mood default */
  myWallpaperId: string;
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
  myBulletin: {
    interests: [...seed.bulletin.interests],
    event: seed.bulletin.event,
  },
  myNowWatching: { ...(seed.nowWatching ?? { title: "Nothing yet", status: "" }) },
  myWallpaperId: seed.wallpaperId,
});

/** older saves predate the poster catalog item and the TV's side-wall spot */
const migrateLayout = (layout: PlacedItem[]): PlacedItem[] => {
  const next = layout.map((p) => ({ ...p }));
  const tv = next.find((p) => p.itemId === "tv_basic");
  if (tv && tv.gx === 5 && tv.gy === 1) {
    tv.gx = 9;
    tv.gy = 3;
  }
  if (!next.some((p) => p.itemId === "poster_default"))
    next.unshift({ itemId: "poster_default", gx: 4, gy: 0 });
  return next;
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
      muted: typeof parsed.muted === "boolean" ? parsed.muted : false,
      mySongs:
        Array.isArray(parsed.mySongs) && parsed.mySongs.length > 0
          ? parsed.mySongs.map((s) => ({ title: String(s?.title ?? ""), artist: String(s?.artist ?? "") }))
          : base.mySongs,
      myBulletin:
        parsed.myBulletin && Array.isArray(parsed.myBulletin.interests)
          ? {
              interests: parsed.myBulletin.interests.map((i) => String(i)),
              event: String(parsed.myBulletin.event ?? ""),
            }
          : base.myBulletin,
      myNowWatching: parsed.myNowWatching?.title
        ? { title: String(parsed.myNowWatching.title), status: String(parsed.myNowWatching.status ?? "") }
        : base.myNowWatching,
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

export const playerActions = {
  buy(itemId: string) {
    const item = ITEM_CATALOG[itemId];
    if (!item || state.ownedItemIds.includes(itemId) || state.coins < item.price) return false;
    set({ coins: state.coins - item.price, ownedItemIds: [...state.ownedItemIds, itemId] });
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
  setBulletin(bulletin: { interests: string[]; event: string }) {
    set({ myBulletin: { interests: [...bulletin.interests], event: bulletin.event } });
  },
  setNowWatching(nowWatching: { title: string; status?: string }) {
    set({ myNowWatching: { ...nowWatching } });
  },
  setWallpaper(itemId: string) {
    if (state.myWallpaperId === itemId) return;
    set({ myWallpaperId: itemId });
    sfx.placeItem();
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
