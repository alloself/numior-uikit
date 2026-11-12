import { Settings2, Trash2 } from '@lucide/vue';
import { PointerType, useAfterRelease } from '@numior/primitives';
import { NuiMenuFocus, NuiMenuItemTone, type NuiMenuEntry } from '@numior/vue';
import { onLongPress } from '@vueuse/core';
import { computed, markRaw, ref, shallowRef } from 'vue';
import {
  ShownDrawingKind,
  type DrawingMenu,
  type DrawingMenuOptions,
  type ShownDrawing,
} from './drawings.types';

const SETTINGS_ICON = markRaw(Settings2);

const REMOVE_ICON = markRaw(Trash2);

const SELECTED_FRAME = '.nui-spreadsheet__drawing-frame--selected';

const DRAWING = '.nui-spreadsheet__drawing';

const LONG_PRESS = 500;

const TOUCH_GAP = 16;

const gapOf = (event: MouseEvent): number =>
  'pointerType' in event && event.pointerType !== PointerType.Mouse ? TOUCH_GAP : 0;

const inDrawing = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(DRAWING) !== null;

export const useSheetDrawingMenu = (options: DrawingMenuOptions): DrawingMenu => {
  const open = ref(false);

  const anchor = shallowRef<HTMLElement | null>(null);

  const target = shallowRef<ShownDrawing>();

  const afterRelease = useAfterRelease();

  const place = (x: number, y: number): HTMLElement | null => {
    const body = options.body.value;
    const spot = options.spot.value;

    if (body === null || spot === null) {
      return null;
    }

    const rect = body.getBoundingClientRect();

    spot.style.setProperty('top', `${String(y - rect.top)}px`);
    spot.style.setProperty('left', `${String(x - rect.left)}px`);
    return spot;
  };

  const frameAnchor = (): HTMLElement | null => {
    const frame = options.root.value?.querySelector(SELECTED_FRAME);

    return frame instanceof HTMLElement ? frame : null;
  };

  const show = (shown: ShownDrawing, event: MouseEvent | undefined): void => {
    target.value = shown;

    if (event === undefined) {
      anchor.value = frameAnchor();
      options.show(NuiMenuFocus.First);
      return;
    }

    anchor.value = place(event.clientX, event.clientY + gapOf(event));

    afterRelease(event, () => {
      options.show(undefined);
    });
  };

  const items = computed((): readonly NuiMenuEntry[] => {
    const shown = target.value;
    const texts = options.messages();

    if (shown === undefined) {
      return [];
    }

    const remove: NuiMenuEntry = {
      key: 'remove',
      label: texts.removeDrawing,
      icon: REMOVE_ICON,
      tone: NuiMenuItemTone.Error,
      onSelect: () => {
        options.remove(shown);
      },
    };

    if (shown.kind !== ShownDrawingKind.Chart) {
      return [remove];
    }

    return [
      {
        key: 'settings',
        label: texts.chartSettings,
        icon: SETTINGS_ICON,
        onSelect: () => {
          options.openSettings(shown);
        },
      },
      remove,
    ];
  });

  onLongPress(
    options.body,
    (event) => {
      const shown = options.pressed();

      if (shown === undefined || event.pointerType === PointerType.Mouse) {
        return;
      }
      if (!inDrawing(event.target)) {
        return;
      }

      options.request(event, shown);
    },
    { delay: LONG_PRESS },
  );

  return { open, anchor, items, show };
};
