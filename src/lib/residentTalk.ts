import { MOODS, ROOMS } from "@/data/dorm";
import { pinMatches, songMatches } from "@/data/interests";
import { ITEM_CATALOG, type ItemDef } from "@/data/items";
import { promptForToday, residentPick, todayKey } from "@/data/prompts";
import { RESIDENTS, type ResidentId, type RoomInfo, type TalkContext } from "@/data/residents";
import { stickerFor } from "@/data/stickers";
import type { PlayerState } from "./playerStore";

/** everything a resident might mention about you, read from your save */
export const talkContextFor = (id: ResidentId, s: PlayerState, hour: number): TalkContext => {
  const r = RESIDENTS[id];
  const room = ROOMS.find((x) => x.id === r.roomId)!;
  const prompt = promptForToday();
  const entry = s.dailyAnswers[todayKey()];
  const dailyAnswer = entry && entry.promptId === prompt.id ? entry.answer : null;
  const songHit = room.songs.find((_, i) => songMatches(room.songs, s.mySongs)[i]);
  const pins = pinMatches(room.bulletin, s.myBulletin);
  const pinHit = room.bulletin.pins.find((p, i) => pins[i] && p.kind === "interest");
  const outfit = s.avatar.outfitItemId ? ITEM_CATALOG[s.avatar.outfitItemId]?.name ?? null : null;
  return {
    hour,
    dailyAnswer,
    theirDaily: residentPick(r.roomId, prompt),
    commonArtist: songHit?.artist ?? null,
    commonInterest: pinHit && pinHit.kind === "interest" ? stickerFor(pinHit.stickerId).label : null,
    newestItem: s.newestItemId ? ITEM_CATALOG[s.newestItemId]?.name ?? null : null,
    outfit,
  };
};

const PLANT_TEXTURES = new Set(["plant", "bonsai"]);

/** what a visitor can see in Your Room */
export const roomInfoFor = (s: PlayerState): RoomInfo => {
  const items = s.roomLayout.map((p) => ITEM_CATALOG[p.itemId]).filter((i): i is ItemDef => !!i);
  const newest = s.newestItemId && s.roomLayout.some((p) => p.itemId === s.newestItemId) ? s.newestItemId : null;
  const paper = ITEM_CATALOG[s.myWallpaperId];
  return {
    plants: items.filter((i) => PLANT_TEXTURES.has(i.textureKey)).length,
    lights: items.filter((i) => !!i.light).length,
    newestItem: newest ? ITEM_CATALOG[newest]!.name : null,
    wallpaper: paper && paper.wallColor !== undefined ? paper.name.replace(/\s*wallpaper\s*/i, "") : null,
    mood: MOODS[s.myMood]?.label ?? "cozy",
  };
};
