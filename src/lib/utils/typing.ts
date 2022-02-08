/**
 * XOR in typescript. Amazing.
 *
 * @credit tjjfvi <https://stackoverflow.com/users/11860232/tjjfvi>
 * @see https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types#comment123255834_53229567
 * @demo https://tsplay.dev/wgLpBN
 */

type UnionKeys<T> = T extends T ? keyof T : never

// Improve intellisense
type Expand<T> = T extends T ? { [K in keyof T]: T[K] } : never

export type OneOf<T extends unknown[]> = {
  [K in keyof T]: Expand<T[K] & Partial<Record<Exclude<UnionKeys<T[number]>, keyof T[K]>, never>>>
}[number]
