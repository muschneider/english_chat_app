/**
 * Recursive "deep partial" type — every field optional, every array element
 * deep-partial. Lightweight standalone helper so we don't pull in `ts-toolbelt`
 * or similar. Used for `streamObject`'s partials, which fill in incrementally.
 */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T | undefined;