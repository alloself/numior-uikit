import { computed, onMounted, onScopeDispose, toValue, type MaybeRefOrGetter } from 'vue';
import { isEditableTarget, matchesHotkey, parseHotkey } from './hotkey';

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

  const onKeydown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || event.defaultPrevented) {
      return;
    }
    if (toValue(options.enabled) === false || !matchesHotkey(event, hotkey.value)) {
      return;
    }
    if (!options.inEditable && isEditableTarget(event.target)) {
      return;
    }
    if (options.preventDefault !== false) {
      event.preventDefault();
    }
    handler(event);
  };

  onMounted(() => {
    const target = toValue(options.target) ?? window;

    target.addEventListener('keydown', onKeydown);
    onScopeDispose(() => target.removeEventListener('keydown', onKeydown));
  });
};
