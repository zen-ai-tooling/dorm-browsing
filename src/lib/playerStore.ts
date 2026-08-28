import { useSyncExternalStore } from "react";
import { ROOMS, type PlacedItem, type Song } from "@/data/dorm";
import { ITEM_CATALOG } from "@/data/items";
import { DAILY_COIN_REWARD, todayKey } from "@/data/prompts";
import { setSfxMuted, sfx } from "@/game/sounds";

const STORAGE_KEY = "dorm-vibes-player-state";
const STARTING_COINS = 50;

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
  muted: boolean;
  /** editable content for "Your Room" — seeded from ROOMS[0] */
  mySongs: Song[];
  myBulletin: { interests: string[]; event: string };
  myNowWatching: { title: string; status?: string };
}

const seed = ROOMS[0]!;

const defaultState = (): PlayerState => ({
  coins: STARTING_COINS,
  ownedItemIds: Object.values(ITEM_CATALOG)
    .filter((i) => i.unlockedByDefault)
    .map((i) => i.id),
  roomLayout: DEFAULT_MY_ROOM_LAYOUT.map((p) => ({ ...p })),
  lastDailyAnswerDate: null,
  muted: false,
  mySongs: seed.songs.map((s) => ({ ...s })),
  myBulletin: {
    interests: [...seed.bulletin.interests],
    event: seed.bulletin.event,
  },
  myNowWatching: { ...(seed.nowWatching ?? { title: "Nothing yet", status: "" }) },
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
    if (state.lastDailyAnswerDate === todayKey()) return false;
    set({ coins: state.coins + DAILY_COIN_REWARD, lastDailyAnswerDate: todayKey() });
    sfx.coin();
    return true;
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
  toggleMute() {
    const muted = !state.muted;
    setSfxMuted(muted);
    set({ muted });
    if (!muted) sfx.uiClick();
    return muted;
  },
};

export const usePlayerState = () => useSyncExternalStore(subscribe, getPlayerState, getPlayerState);
