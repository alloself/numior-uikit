type Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Blob
  | ((...args: never[]) => unknown);

type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7];

type PathsOf<T, D extends number> = [D] extends [never]
  ? never
  : T extends Leaf
    ? never
    : T extends readonly (infer Item)[]
      ? `${number}` | `${number}.${PathsOf<NonNullable<Item>, Depth[D]>}`
      : {
          [K in keyof T & string]-?: K | `${K}.${PathsOf<NonNullable<T[K]>, Depth[D]>}`;
        }[keyof T & string];

export type FormPath<T> = string extends keyof T
  ? string
  : [keyof T] extends [never]
    ? string
    : PathsOf<T, 7>;

type SlotPathsOf<T, D extends number> = [D] extends [never]
  ? never
  : T extends Leaf
    ? never
    : T extends readonly (infer Item)[]
      ? SlotPathsOf<NonNullable<Item>, Depth[D]>
      : {
          [K in keyof T & string]-?: K | `${K}.${SlotPathsOf<NonNullable<T[K]>, Depth[D]>}`;
        }[keyof T & string];

export type FormSlotPath<T> = string extends FormPath<T> ? string : SlotPathsOf<T, 7>;

export type FormAfterSlotPath<T> =
  FormSlotPath<T> extends infer P extends string ? `${P}:after` : never;

type Child<T, K extends string> = T extends readonly (infer Item)[]
  ? K extends `${number}`
    ? Item
    : never
  : K extends keyof T
    ? T[K]
    : never;

export type FormPathValue<T, P extends string> = string extends P | FormPath<T>
  ? unknown
  : P extends `${infer Head}.${infer Rest}`
    ? FormPathValue<NonNullable<Child<T, Head>>, Rest>
    : Child<T, P>;

export type DeepPartial<T> = T extends Leaf | readonly unknown[]
  ? T
  : { [K in keyof T]?: DeepPartial<T[K]> };

type Opaque = Leaf | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>;

export type SubmittedValues<T> = T extends Opaque
  ? T
  : T extends readonly (infer Item)[]
    ? (SubmittedValues<Item> | undefined)[]
    : { [K in keyof T]?: SubmittedValues<T[K]> };

export type KeepValue<R> = undefined extends R ? boolean : true;

export const PathToken = { Wildcard: '*' } as const;
