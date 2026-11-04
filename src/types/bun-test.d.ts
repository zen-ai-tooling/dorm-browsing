// Minimal typings for Bun's built-in test runner, so `tsgo` can typecheck *.test.ts
// without pulling bun-types (which clashes with the DOM lib) into the app build.
declare module "bun:test" {
  interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toHaveLength(n: number): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeUndefined(): void;
    toContain(item: unknown): void;
    readonly not: Matchers;
  }
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export const it: typeof test;
  export function expect(value: unknown): Matchers;
}
