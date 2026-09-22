import { useAttrs } from 'vue';

export type AttrRecord = Readonly<Record<string, unknown>>;

export interface SplitAttrs {
  /** class and style, for the wrapper element */
  rootAttrs(): AttrRecord;
  /** everything else, for the native control: name, placeholder, aria-*, listeners */
  controlAttrs(): AttrRecord;
}

const ROOT_KEYS: ReadonlySet<string> = new Set(['class', 'style']);

/**
 * Split fallthrough attrs between a wrapper and its native control; the component sets
 * inheritAttrs: false. These are functions rather than computeds on purpose: attrs are
 * not reactive, and the component re-renders whenever the parent passes different ones.
 */
export function useSplitAttrs(rootKeys: ReadonlySet<string> = ROOT_KEYS): SplitAttrs {
  const attrs = useAttrs();
  const pick = (test: (key: string) => boolean): AttrRecord => {
    const picked: Record<string, unknown> = {};
    for (const key of Object.keys(attrs)) {
      if (test(key)) picked[key] = attrs[key];
    }
    return picked;
  };
  return {
    rootAttrs: () => pick((key) => rootKeys.has(key)),
    controlAttrs: () => pick((key) => !rootKeys.has(key)),
  };
}
