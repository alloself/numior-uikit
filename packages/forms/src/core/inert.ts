import { toValue, type MaybeRefOrGetter } from 'vue';

export interface InertOptions {
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly readonly?: MaybeRefOrGetter<boolean | undefined>;
}

export const inertOf = (options: InertOptions): boolean =>
  (toValue(options.disabled) ?? false) || (toValue(options.readonly) ?? false);
