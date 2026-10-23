import { listMoveFor, listTargetIndex } from '@numior/primitives';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { hitAt, hitsOf, type ChartHit, type ChartScene } from '../core';

export type ChartFocusSource = 'pointer' | 'keyboard';

export interface ChartPointerOptions {
  readonly scene: () => ChartScene;
  readonly frame: Readonly<Ref<HTMLElement | null>>;
  readonly rtl: () => boolean;
  readonly selected: Ref<ChartHit | null>;
}

export interface ChartPointer {
  readonly hovered: ComputedRef<ChartHit | undefined>;
  readonly source: Readonly<Ref<ChartFocusSource>>;
  readonly onPointermove: (event: PointerEvent) => void;
  readonly onPointerleave: () => void;
  readonly onClick: (event: MouseEvent) => void;
  readonly onKeydown: (event: KeyboardEvent) => void;
  readonly onBlur: () => void;
}

const PAGE = 5;

const sameHit = (left: ChartHit | null | undefined, right: ChartHit | null | undefined): boolean =>
  left?.index === right?.index && left?.series === right?.series;

export const useChartPointer = (options: ChartPointerOptions): ChartPointer => {
  const pointed = ref<ChartHit>();
  const keyed = ref<ChartHit>();
  const source = ref<ChartFocusSource>('pointer');

  const hovered = computed(() => (source.value === 'pointer' ? pointed.value : keyed.value));

  const hitOf = (event: MouseEvent): ChartHit | undefined => {
    const box = options.frame.value?.getBoundingClientRect();

    return box === undefined
      ? undefined
      : hitAt(options.scene(), { x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const toggle = (hit: ChartHit | undefined): void => {
    if (hit !== undefined) {
      options.selected.value = sameHit(options.selected.value, hit) ? null : hit;
    }
  };

  const onPointermove = (event: PointerEvent): void => {
    source.value = 'pointer';
    pointed.value = hitOf(event);
  };

  const onPointerleave = (): void => {
    pointed.value = undefined;
  };

  const onClick = (event: MouseEvent): void => {
    toggle(hitOf(event));
  };

  const move = (event: KeyboardEvent): boolean => {
    const step = listMoveFor(event.key, 'both', options.rtl());
    const targets = hitsOf(options.scene());

    if (step === undefined || targets.length === 0) {
      return false;
    }

    const current = targets.findIndex((hit) => sameHit(hit, keyed.value));

    keyed.value = targets[listTargetIndex(step, current, targets.length, false, PAGE)];
    return true;
  };

  const onKeydown = (event: KeyboardEvent): void => {
    source.value = 'keyboard';
    if (move(event)) {
      event.preventDefault();
      return;
    }

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggle(keyed.value);
        return;
      case 'Escape':
        keyed.value = undefined;
        return;
      default:
    }
  };

  const onBlur = (): void => {
    keyed.value = undefined;
  };

  return { hovered, source, onPointermove, onPointerleave, onClick, onKeydown, onBlur };
};
