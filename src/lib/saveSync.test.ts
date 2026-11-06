import { beforeAll, describe, expect, test } from "bun:test";
import { decideBoot } from "./saveSync";
import { __resetStoreForTests, normalizeSave } from "./playerStore";

beforeAll(() => { __resetStoreForTests(); });
const fresh = () => normalizeSave({ onboarded: true, savedAt: 2000 });
const progress = () => normalizeSave({ onboarded: true, ownedItemIds: ["disco_ball"], savedAt: 2000 });
const cloud = (ms: number) => ({ state: progress(), updated_at: new Date(ms).toISOString() });
describe("account-safe boot", () => {
  test("same account compares timestamps", () => {
    expect(decideBoot({ uid: "real", localOwner: "real", local: progress(), cloud: cloud(3000) })).toBe("useCloud");
    expect(decideBoot({ uid: "real", localOwner: "real", local: progress(), cloud: cloud(1000) })).toBe("uploadLocal");
  });
  test("new account carries guest progress when no cloud row exists", () => {
    for (const localOwner of [null, "guest"]) expect(decideBoot({ uid: "real", localOwner, local: progress(), cloud: null })).toBe("uploadLocal");
  });
  test("foreign empty local save always loads an existing dorm", () => {
    for (const localOwner of [null, "guest"]) expect(decideBoot({ uid: "real", localOwner, local: fresh(), cloud: cloud(1000) })).toBe("useCloud");
  });
  test("foreign real progress requires a choice regardless of timestamp", () => {
    for (const localOwner of [null, "guest"]) expect(decideBoot({ uid: "real", localOwner, local: progress(), cloud: cloud(3000) })).toBe("conflict");
  });
  test("new-device email sign-in after skipping move-in cannot overwrite an older dorm", () => {
    expect(decideBoot({ uid: "returning", localOwner: "guest", local: fresh(), cloud: cloud(100) })).toBe("useCloud");
  });
  test("OAuth redirect reload with null previous session still protects guest progress", () => {
    expect(decideBoot({ uid: "google", localOwner: "guest", local: progress(), cloud: cloud(100) })).toBe("conflict");
  });
});