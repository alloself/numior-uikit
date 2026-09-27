import { onKeyStroke } from '@vueuse/core';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { hasModifier, isEditableTarget, matchesHotkey, parseHotkey } from './hotkey';

export interface HotkeyOptions {
  readonly enabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly target?: MaybeRefOrGetter<EventTarget | null | undefined>;
  readonly inEditable?: boolean | undefined;
  readonly preventDefault?: boolean | undefined;
}

export const useHotkey = (
  combo: MaybeRefOrGetter<string>,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {},
): void => {
  const hotkey = computed(() => parseHotkey(toValue(combo)));
  const target = options.target;

  const matches = (event: KeyboardEvent): boolean =>
    !event.defaultPrevented &&
    toValue(options.enabled) !== false &&
    matchesHotkey(event, hotkey.value) &&
    ((options.inEditable ?? hasModifier(hotkey.value)) || !isEditableTarget(event.target));

  const run = (event: KeyboardEvent): void => {
    if (options.preventDefault !== false) {
      event.preventDefault();
    }
    handler(event);
  };

  onKeyStroke(matches, run, target === undefined ? {} : { target: () => toValue(target) });
};
