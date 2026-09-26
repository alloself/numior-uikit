<template>
  <div
    ref="root"
    class="nui-time-field"
    :class="[
      `nui-time-field--size-${size}`,
      {
        'nui-time-field--open': open,
        'nui-time-field--invalid': isInvalid,
        'nui-time-field--disabled': isDisabled,
        'nui-time-field--readonly': readonly,
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
        <span v-if="segment.type === 'literal'" class="nui-time-field__literal" aria-hidden="true">
          {{ segment.text }}
        </span>
        <NuiTimeSegment
          v-else
          :type="segment.type"
          :text="segmentText(segment.type)"
          :label="labels[segment.type]"
          :value="times.valueOf(segment.type)"
          :min="segmentBounds(segment.type, layout.cycle).min"
          :max="segmentBounds(segment.type, layout.cycle).max"
          :value-text="segmentText(segment.type) || undefined"
          :id="segment.type === 'hour' ? controlAttrs.id : undefined"
          :tab-stop="index === firstSegment"
          :last="index === lastSegment"
          :disabled="isDisabled"
          :readonly="readonly"
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
      variant="ghost"
      tone="neutral"
      size="sm"
      icon-only
      class="nui-time-field__clock"
      :aria-label="clockText"
      :disabled="isDisabled || readonly"
      v-bind="control.invokerAttrs.value"
    >
      <NuiIcon alias="clock" />
    </NuiButton>
    <NuiList
      :ref="setListbox"
      class="nui-time-field__listbox"
      variant="floating"
      :model-value="model ?? undefined"
      :items="suggestions"
      selectable="single"
      :keyboard="false"
      :active-id="list.activeId.value"
      :empty-label="emptyText"
      :labelled-by="field?.labelledBy.value"
      v-bind="control.contentAttrs.value"
      @select="choose"
      @keydown="onListboxKeydown"
      @pointermove="activateHovered"
      @pointerleave="restActive"
      @focusin="onListFocusin"
      @focusout="onListFocusout"
    />
    <input v-if="name" type="hidden" :name="name" :value="model ?? ''" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  formatSegment,
  formatTimeLabel,
  formatTimeModel,
  parseTime,
  segmentBounds,
  segmentLabels,
  timeLayout,
  timeOptions,
  useField,
  useFieldControl,
  useListNavigation,
  useLocale,
  useMessages,
  useSplitAttrs,
  type TimeSegmentType,
} from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiList from '../list/NuiList.vue';
import type { NuiOption } from '../shared/options';
import { useListboxSurface } from '../shared/use-listbox-surface';
import NuiTimeSegment from './NuiTimeSegment.vue';
import { timeFieldMessages } from './time-field.messages';
import type { NuiTimeFieldProps } from './time-field.types';
import { useTimeDraft, type TimePeriod } from './use-time-draft';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  seconds = false,
  hourCycle,
  locale: localeProp,
  min,
  max,
  step = 15,
  readonly = false,
  name,
  placement = 'bottom-start',
  clockLabel,
  emptyLabel,
} = defineProps<NuiTimeFieldProps>();

const model = defineModel<string | null>({ default: null });

const split = useSplitAttrs();
const field = useField();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  required: isRequired,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));

const locale = useLocale(() => localeProp);
const messages = useMessages(timeFieldMessages, locale);

const clockText = computed(() => clockLabel ?? messages.value.clock);
const emptyText = computed(() => emptyLabel ?? messages.value.empty);
const layout = computed(() => timeLayout(locale.value, { seconds, hourCycle }));
const labels = computed(() => segmentLabels(locale.value));

const firstSegment = computed(() =>
  layout.value.segments.findIndex((segment) => segment.type !== 'literal'),
);

const lastSegment = computed(() =>
  layout.value.segments.findLastIndex((segment) => segment.type !== 'literal'),
);

const segmentTypes = computed(() =>
  layout.value.segments.flatMap((segment) => (segment.type === 'literal' ? [] : [segment.type])),
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

const navigation = useListNavigation(groupElement, {
  selector: '.nui-time-field__segment',
  orientation: 'horizontal',
  loop: false,
  typeahead: false,
  rtl: false,
});

const segmentText = (type: TimeSegmentType): string => {
  if (type !== 'dayPeriod') {
    return formatSegment(times.valueOf(type), layout.value.digits);
  }
  const period = times.draft.value.period;
  return period === null ? '' : layout.value.periods[period === 'am' ? 0 : 1];
};

const digitOf = (char: string): number | null => {
  const ascii = '0123456789'.indexOf(char);
  if (ascii >= 0) {
    return ascii;
  }
  const local = layout.value.digits.indexOf(char);
  return local >= 0 ? local : null;
};

const periodOf = (char: string): TimePeriod | null => {
  const lower = char.toLocaleLowerCase(locale.value);

  const initials = layout.value.periods.map((period) =>
    period.charAt(0).toLocaleLowerCase(locale.value),
  );

  if (lower === 'a' || lower === initials[0]) {
    return 'am';
  }
  return lower === 'p' || lower === initials[1] ? 'pm' : null;
};

const nextType = (type: TimeSegmentType): TimeSegmentType | null => {
  const index = segmentTypes.value.indexOf(type);
  return segmentTypes.value[index + 1] ?? null;
};

const onChar = (type: TimeSegmentType, char: string): void => {
  if (readonly) {
    return;
  }
  const target = flow.type ?? type;
  const digit = digitOf(char);
  if (digit !== null) {
    if (target !== 'dayPeriod' && times.typeDigit(target, digit)) {
      navigation.focusNext();
      flow.type = nextType(target);
    }
    return;
  }
  const period = periodOf(char);
  if (period !== null && (target === 'dayPeriod' || layout.value.cycle === 'h12')) {
    times.setPeriod(period);
  }
};

const onGroupFocusin = (event: FocusEvent): void => {
  flow.type = null;
  navigation.onFocusin(event);
};

const focusHour = (): void => {
  const hour = groupElement.value?.querySelector('.nui-time-field__segment--type-hour');
  if (hour instanceof HTMLElement) {
    navigation.setActive(hour);
  }
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
  const interactive = '.nui-time-field__segment, .nui-time-field__clock, [role="listbox"]';
  if (isDisabled.value || !(target instanceof Element) || target.closest(interactive)) {
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
  if (event.key !== 'PageUp' && event.key !== 'PageDown') {
    return false;
  }
  event.preventDefault();
  if (!readonly) {
    times.shift(event.key === 'PageUp' ? step : -step);
  }
  return true;
};

const onGroupKeydown = (event: KeyboardEvent): void => {
  if (isDisabled.value || shiftByPage(event)) {
    return;
  }
  if (event.key === 'ArrowDown' && event.altKey) {
    event.preventDefault();
    control.show();
    return;
  }
  if (event.key === 'Enter' && hasNextSegment()) {
    event.preventDefault();
    navigation.focusNext();
    return;
  }
  if (event.key === 'Enter') {
    times.settle();
    return;
  }
  navigation.onKeydown(event);
};

const onGroupFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;
  if (!(next instanceof Node && groupElement.value?.contains(next) === true)) {
    times.settle();
    navigation.reset();
  }
};

const open = ref(false);
const listboxId = computed(() => `${controlAttrs.value.id}-listbox`);

const {
  listboxElement,
  setListbox,
  control,
  navigation: list,
  activateHovered,
  restActive,
} = useListboxSurface({
  anchor: rootElement,
  open,
  id: listboxId,
  mode: 'auto',
  placement: () => placement,
  maxBlockSize: 288,
  loop: true,
  typeahead: false,
  restOnSelected: true,
});

const state = { inside: false };

watch(open, () => list.reset());

const suggestions = computed<NuiOption<string>[]>(() =>
  timeOptions({ step, min: minTime.value, max: maxTime.value }).map((time) => ({
    value: formatTimeModel(time, seconds),
    label: formatTimeLabel(time, locale.value, layout.value.cycle, seconds),
  })),
);

const choose = (option: NuiOption<string>): void => {
  const time = parseTime(option.value);
  if (time) {
    times.setTime(time);
  }
  control.hide();
  focusHour();
};

const onListboxKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Tab') {
    control.hide();
    return;
  }
  if (event.key !== 'Enter' && event.key !== ' ') {
    list.onKeydown(event);
    return;
  }
  event.preventDefault();
  list.activeElement()?.click();
};

const onListFocusin = (event: FocusEvent): void => {
  state.inside = true;
  list.onFocusin(event);
};

const onListFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget;

  const within =
    next instanceof Node &&
    (listboxElement.value?.contains(next) === true || rootElement.value?.contains(next) === true);

  if (!within) {
    state.inside = false;
    control.hide();
  }
};

onMounted(() => {
  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        list.reveal();
        list.activeElement()?.focus({ preventScroll: true });
      } else if (state.inside) {
        state.inside = false;
        focusHour();
      }
    },
    { flush: 'post' },
  );
});

defineExpose({ focus: focusHour });
</script>
