import { useAttrs } from 'vue';

export type AttrRecord = Readonly<Record<string, unknown>>;

export interface SplitAttrs {
  rootAttrs(): AttrRecord;
  controlAttrs(): AttrRecord;
}

const ROOT_KEYS: ReadonlySet<string> = new Set(['class', 'style']);

export const useSplitAttrs = (rootKeys: ReadonlySet<string> = ROOT_KEYS): SplitAttrs => {
  const attrs = useAttrs();
  const pick = (test: (key: string) => boolean): AttrRecord => {
    const picked: Record<string, unknown> = {};
    for (const key of Object.keys(attrs)) {
      if (test(key)) {
        picked[key] = attrs[key];
      }
    }
    return picked;
  };
  return {
    rootAttrs: () => pick((key) => rootKeys.has(key)),
    controlAttrs: () => pick((key) => !rootKeys.has(key)),
  };
};
