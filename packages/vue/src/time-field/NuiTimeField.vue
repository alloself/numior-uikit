<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      ref="root"
      class="nui-time-field"
      :class="[
        `nui-time-field--size-${size}`,
        {
          'nui-time-field--open': open,
          'nui-time-field--invalid': isInvalid,
          'nui-time-field--disabled': isDisabled,
          'nui-time-field--readonly': isReadonly,
        },
      ]"
      v-bind="split.rootAttrs()"
      @pointerdown="onRootPointerdown"
    >
      <div
        ref="group"
        role="group"
        class="nui-time-field__segments"
        :id="`${controlAttrs.id}-group`"
        :aria-labelledby="field?.labelledBy.value"
        :aria-describedby="controlAttrs['aria-describedby']"
        v-bind="split.controlAttrs()"
        @keydown="onGroupKeydown"
        @focusin="onGroupFocusin"
        @focusout="onGroupFocusout"
      >
        <template v-for="(segment, index) in layout.segments" :key="index">
          <span
            v-if="segment.type === DateTimePart.Literal"
            class="nui-time-field__literal"
            aria-hidden="true"
          >
            {{ segment.text }}
          </span>
          <NuiTimeSegment
            v-else
            :ref="segments.ref(segment.type)"
            :type="segment.type"
            :text="segmentText(segment.type)"
            :label="labels[segment.type]"
            :value="times.valueOf(segment.type)"
            :min="segmentBounds(segment.type, layout.cycle).min"
            :max="segmentBounds(segment.type, layout.cycle).max"
            :value-text="segmentText(segment.type) || undefined"
            :id="segment.type === TimeSegmentType.Hour ? controlAttrs.id : undefined"
            :tab-stop="index === firstSegment"
            :last="index === lastSegment"
            :disabled="isDisabled"
            :readonly="isReadonly"
            :invalid="isInvalid"
            :required="isRequired"
            @char="onChar(segment.type, $event)"
            @step="times.step(segment.type, $event)"
            @edge="times.setEdge(segment.type, $event)"
            @clear="times.clear(segment.type)"
          />
        </template>
      </div>
      <NuiButton
        ref="clock"
        variant="ghost"
        tone="neutral"
        size="xs"
        icon-only
        class="nui-time-field__clock"
        :aria-label="clockText"
        :disabled="isDisabled || isReadonly"
        v-bind="control.invokerAttrs.value"
        icon="clock"
      />
      <div
        :ref="setPanel"
        class="nui-time-field__panel nui-layer"
        role="group"
        :aria-label="clockText"
        v-bind="control.contentAttrs.value"
        @keydown="onPanelKeydown"
        @focusout="onPanelFocusout"
        @toggle="onPanelToggle"
      >
        <NuiTimeWheels
          v-if="open || rendered"
          ref="wheels"
          :columns="columns"
          :labels="labels"
          :empty-text="emptyText"
          @select="pickWheel"
          @focus-wheel="onFocusWheel"
        />
      </div>
      <input v-if="name" type="hidden" :name="name" :value="model ?? ''" :disabled="isDisabled" />
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  createCollection,
  formatSegment,
  formatTimeModel,
  parseTime,
  segmentBounds,
  segmentLabels,
  timeLayout,
  useFieldControl,
  useFloating,
  useListNavigation,
  useLocale,
  useMessages,
  usePopover,
  useSplitAttrs,
  DateTimePart,
  DayPeriod,
  FloatingPlacement,
  HourCycle,
  Key,
  ListOrientation,
  PopoverMode,
  PopoverState,
  TimeSegmentType,
  type TimeValue,
} from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import { NuiSize } from '../shared/scale.types';
import NuiButton from '../button/NuiButton.vue';
import { useTriggerElement } from '../shared/trigger-ref';
import NuiTimeSegment from './NuiTimeSegment.vue';
import NuiTimeWheels from './NuiTimeWheels.vue';
import { timeFieldMessages } from './time-field.messages';
import type { NuiTimeFieldProps } from './time-field.types';
import { hasWheelTimes, pickedTime, settledTime, wheelColumns } from './time-wheels';
import { useTimeDraft } from './use-time-draft';

const LATIN_INITIALS: Readonly<Record<DayPeriod, string>> = {
  [DayPeriod.Am]: 'a',
  [DayPeriod.Pm]: 'p',
};

defineOptions({ inheritAttrs: false });

const {
  id,
  size = NuiSize.Md,
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
  seconds = false,
  hourCycle,
  locale: localeProp,
  min,
  max,
  step = 15,
  readonly = undefined,
  name,
  placement = FloatingPlacement.BottomStart,
  clockLabel,
  emptyLabel,
} = defineProps<NuiTimeFieldProps>();

const model = defineModel<string | null>({ default: null });

const split = useSplitAttrs();

const {
  frame: fieldFrame,
  field,
  attrs: controlAttrs,
  invalid: isInvalid,
  required: isRequired,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  { commit: () => times.settle() },
);

const locale = useLocale(() => localeProp);
const messages = useMessages(timeFieldMessages, locale);

const clockText = computed(() => clockLabel ?? messages.value.clock);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const layout = computed(() => timeLayout(locale.value, { seconds, hourCycle }));
const labels = computed(() => segmentLabels(locale.value));

const firstSegment = computed(() =>
  layout.value.segments.findIndex((segment) => segment.type !== DateTimePart.Literal),
);

const lastSegment = computed(() =>
  layout.value.segments.findLastIndex((segment) => segment.type !== DateTimePart.Literal),
);

const segmentTypes = computed(() =>
  layout.value.segments.flatMap((segment) =>
    segment.type === DateTimePart.Literal ? [] : [segment.type],
  ),
);

const flow: { type: TimeSegmentType | null } = { type: null };
const minTime = computed(() => parseTime(min));
const maxTime = computed(() => parseTime(max));

const times = useTimeDraft({
  model,
  layout: () => layout.value,
  seconds: () => seconds,
  min: () => minTime.value,
  max: () => maxTime.value,
});

const rootElement = useTemplateRef<HTMLDivElement>('root');
const groupElement = useTemplateRef<HTMLDivElement>('group');

const segments = createCollection<TimeSegmentType>();
const clock = useTemplateRef<InstanceType<typeof NuiButton>>('clock');

const navigation = useListNavigation(groupElement, {
  items: segments.elements,
  orientation: ListOrientation.Horizontal,
  loop: false,
  typeahead: false,
  rtl: false,
});

const segmentText = (type: TimeSegmentType): string => {
  if (type !== TimeSegmentType.DayPeriod) {
    return formatSegment(times.valueOf(type), layout.value.digits);
  }
  const period = times.draft.value.period;
  return period === null ? '' : layout.value.periods[period === DayPeriod.Am ? 0 : 1];
};

const digitOf = (char: string): number | null => {
  const ascii = '0123456789'.indexOf(char);
  if (ascii >= 0) {
    return ascii;
  }
  const local = layout.value.digits.indexOf(char);
  return local >= 0 ? local : null;
};

const periodOf = (char: string): DayPeriod | null => {
  const lower = char.toLocaleLowerCase(locale.value);

  const initials = layout.value.periods.map((period) =>
    period.charAt(0).toLocaleLowerCase(locale.value),
  );

  if (lower === LATIN_INITIALS[DayPeriod.Am] || lower === initials[0]) {
    return DayPeriod.Am;
  }
  return lower === LATIN_INITIALS[DayPeriod.Pm] || lower === initials[1] ? DayPeriod.Pm : null;
};

const nextType = (type: TimeSegmentType): TimeSegmentType | null => {
  const index = segmentTypes.value.indexOf(type);
  return segmentTypes.value[index + 1] ?? null;
};

const onChar = (type: TimeSegmentType, char: string): void => {
  if (isReadonly.value) {
    return;
  }
  const target = flow.type ?? type;
  const digit = digitOf(char);
  if (digit !== null) {
    if (target !== TimeSegmentType.DayPeriod && times.typeDigit(target, digit)) {
      navigation.focusNext();
      flow.type = nextType(target);
    }
    return;
  }
  const period = periodOf(char);
  if (
    period !== null &&
    (target === TimeSegmentType.DayPeriod || layout.value.cycle === HourCycle.H12)
  ) {
    times.setPeriod(period);
  }
};

const segmentTypeOf = (target: EventTarget | null): TimeSegmentType | undefined =>
  segmentTypes.value.find((type) => segments.get(type) === target);

const focusSegment = (type: TimeSegmentType): void => {
  const segment = segments.get(type);

  if (segment !== undefined) {
    navigation.setActive(segment);
  }
};

const clockElement = (): Element | null => {
  const element: unknown = clock.value?.$el;

  return element instanceof Element ? element : null;
};

const isInteractive = (target: Element): boolean =>
  navigation.itemFrom(target) !== null ||
  clockElement()?.contains(target) === true ||
  panelElement.value?.contains(target) === true;

const focusHour = (): void => {
  focusSegment(TimeSegmentType.Hour);
};

const state: { inside: boolean; segment: TimeSegmentType } = {
  inside: false,
  segment: TimeSegmentType.Hour,
};

const onGroupFocusin = (event: FocusEvent): void => {
  flow.type = null;
  state.segment = segmentTypeOf(event.target) ?? state.segment;
  navigation.onFocusin(event);
};

const focusFromClick = (): void => {
  const empty = navigation
    .items()
    .find((item) => item instanceof HTMLInputElement && item.value === '');

  if (empty) {
    navigation.setActive(empty);
  } else {
    focusHour();
  }
};

const onRootPointerdown = (event: PointerEvent): void => {
  const target = event.target;
  if (isDisabled.value || !(target instanceof Element) || isInteractive(target)) {
    return;
  }
  event.preventDefault();
  focusFromClick();
};

const hasNextSegment = (): boolean => {
  const items = navigation.items();
  const active = navigation.activeElement();
  return active !== null && items.indexOf(active) < items.length - 1;
};

const shiftByPage = (event: KeyboardEvent): boolean => {
  if (event.key !== Key.PageUp && event.key !== Key.PageDown) {
    return false;
  }
  event.preventDefault();
  if (!isReadonly.value) {
    times.shift(event.key === Key.PageUp ? step : -step);
  }
  return true;
};

const onGroupKeydown = (event: KeyboardEvent): void => {
  if (isDisabled.value || shiftByPage(event)) {
    return;
  }
  if (event.key === Key.ArrowDown && event.altKey) {
    event.preventDefault();
    control.show();
    return;
  }
  if (event.key === Key.Enter && hasNextSegment()) {
    event.preventDefault();
    navigation.focusNext();
    return;
  }
  if (event.key === Key.Enter) {
    times.settle();
    return;
  }
  navigation.onKeydown(event);
};

const onGroupFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (next instanceof Node && groupElement.value?.contains(next) === true) {
    return;
  }

  times.settle();
  navigation.reset();
};

const open = ref(false);
const rendered = ref(false);
const panelId = computed(() => `${controlAttrs.value.id}-wheels`);
const { trigger: panelElement, setTrigger: setPanel } = useTriggerElement();
const control = usePopover(panelElement, { open, id: panelId, mode: PopoverMode.Auto });

useFloating(rootElement, panelElement, {
  placement: () => placement,
  offset: 4,
  enabled: open,
});

const wheels = useTemplateRef<{ focus: (type: TimeSegmentType) => void; reveal: () => void }>(
  'wheels',
);

const wheelInput = computed(() => ({
  layout: layout.value,
  draft: times.draft.value,
  seconds,
  step,
  min: minTime.value,
  max: maxTime.value,
}));

const columns = computed(() => wheelColumns(wheelInput.value));

const setWheelTime = (time: TimeValue): void => {
  if (!isReadonly.value && formatTimeModel(time, seconds) !== model.value) {
    times.setTime(time);
  }
};

const pickWheel = (type: TimeSegmentType, index: number): void => {
  const option = columns.value.find((column) => column.type === type)?.options[index];

  if (option) {
    setWheelTime(pickedTime(wheelInput.value, type, option.value));
  }
};

const onFocusWheel = (type: TimeSegmentType): void => {
  state.inside = true;
  state.segment = type;
};

const returnFocus = (): void => {
  if (!state.inside) {
    return;
  }

  state.inside = false;
  focusSegment(state.segment);
};

const confirmWheels = (): void => {
  if (hasWheelTimes(columns.value)) {
    setWheelTime(settledTime(wheelInput.value));
  }
  returnFocus();
  control.hide();
};

const onPanelToggle = (event: Event): void => {
  if ('newState' in event && event.newState === PopoverState.Open) {
    rendered.value = true;
    wheels.value?.reveal();
    wheels.value?.focus(state.segment);
  } else {
    returnFocus();
  }
};

const onPanelKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Enter) {
    event.preventDefault();
    confirmWheels();
  } else if (event.key === Key.Tab) {
    state.inside = false;
    control.hide();
  }
};

const onPanelFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  const within =
    next instanceof Node &&
    (panelElement.value?.contains(next) === true || rootElement.value?.contains(next) === true);

  if (within) {
    return;
  }

  state.inside = false;
  control.hide();
};

onMounted(() => {
  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        wheels.value?.focus(state.segment);
      }
    },
    { flush: 'post' },
  );
});

defineExpose({ focus: focusHour });
</script>
