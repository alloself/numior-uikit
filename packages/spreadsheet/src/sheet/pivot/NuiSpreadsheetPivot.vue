<template>
  <div
    ref="panel"
    class="nui-spreadsheet-pivot"
    :class="{ 'nui-spreadsheet-pivot--dragging': drag.dragging.value }"
    @keydown="onKeydown"
    @pointermove="drag.onPointermove"
    @pointerup="drag.onPointerup"
    @pointercancel="drag.cancel"
    @click.capture="drag.onClickCapture"
  >
    <div class="nui-spreadsheet-pivot__header">
      <h2 :id="titleId" class="nui-spreadsheet-pivot__title">{{ texts.title }}</h2>
      <NuiButton
        ref="closeButton"
        variant="ghost"
        tone="neutral"
        size="xs"
        icon-only
        :aria-label="texts.close"
        @click="emit('close')"
      >
        <NuiIcon icon="x" />
      </NuiButton>
    </div>
    <p v-if="fields === undefined" class="nui-spreadsheet-pivot__lost">{{ texts.sourceLost }}</p>
    <template v-else>
      <ul
        ref="list"
        class="nui-spreadsheet-pivot__fields"
        :class="{ 'nui-spreadsheet-pivot__fields--target': listTarget }"
        role="list"
        :aria-label="texts.fields"
      >
        <li
          v-for="item in fieldViews"
          :key="item.field"
          class="nui-spreadsheet-pivot__field"
          @pointerdown="onFieldDown(item, $event)"
        >
          <NuiCheckbox
            :model-value="item.used"
            :label="item.name"
            :disabled="readonly"
            @update:model-value="check(item.field, $event)"
          />
        </li>
      </ul>
      <div class="nui-spreadsheet-pivot__areas">
        <NuiSpreadsheetPivotArea
          v-for="view in areaViews"
          :key="view.area"
          :view="view"
          :target="targetIndex(view.area)"
          :grabbed="grabbed"
          :readonly="readonly"
          :empty="texts.dropHere"
          :menu-of="menuOf"
          :menu-label="menuLabel"
          @grab="onChipDown"
          @chip-keydown="onChipKeydown"
        />
      </div>
    </template>
    <span
      ref="ghost"
      class="nui-spreadsheet-pivot__ghost"
      :class="{ 'nui-spreadsheet-pivot__ghost--shown': drag.dragging.value }"
      aria-hidden="true"
      >{{ ghostLabel }}</span
    >
    <span class="nui-spreadsheet-pivot__live" role="status" aria-live="polite">{{
      announcement
    }}</span>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Columns3,
  ListFilter,
  Rows3,
  Sigma,
} from '@lucide/vue';
import { Key, useLocale, useMessages } from '@numior/primitives';
import { NuiButton, NuiCheckbox, NuiIcon, type NuiMenuEntry } from '@numior/vue';
import { computed, markRaw, ref, useTemplateRef, watch } from 'vue';
import {
  PivotArea,
  PivotLanguage,
  VALUES_FIELD,
  checkField,
  moveField,
  pivotAreas,
  placeField,
  removeField,
  usedFields,
  type PivotDefinition,
  type PivotPlacement,
  type PivotSpot,
} from '../../core';
import NuiSpreadsheetPivotArea from './NuiSpreadsheetPivotArea.vue';
import { spreadsheetPivotMessages } from './pivot-panel.messages';
import {
  PivotDragKind,
  PivotDragPhase,
  PivotDropKind,
  type PivotAreaView,
  type PivotChip,
  type PivotDragOrigin,
  type PivotDropTarget,
  type PivotFieldView,
  type SheetPivotProps,
} from './pivot-panel.types';
import { usePivotDrag } from './use-pivot-drag';

interface FocusTarget {
  readonly area: PivotArea;
  readonly field: number;
}

const AREA_ORDER: readonly PivotArea[] = [
  PivotArea.Filters,
  PivotArea.Columns,
  PivotArea.Rows,
  PivotArea.Values,
];

const AREA_ICONS = {
  filters: markRaw(ListFilter),
  columns: markRaw(Columns3),
  rows: markRaw(Rows3),
  values: markRaw(Sigma),
} as const;

const MOVE_ICONS = {
  up: markRaw(ArrowUp),
  down: markRaw(ArrowDown),
  first: markRaw(ArrowUpToLine),
  last: markRaw(ArrowDownToLine),
} as const;

const AREA_SELECTOR = '.nui-spreadsheet-pivot__area';

const CHIP_SELECTOR = '.nui-spreadsheet-pivot__chip';

const { definition, fields, titleId, readonly = false } = defineProps<SheetPivotProps>();

const emit = defineEmits<{
  close: [];
  change: [definition: PivotDefinition];
}>();

const panel = useTemplateRef<HTMLElement>('panel');
const list = useTemplateRef<HTMLElement>('list');
const ghost = useTemplateRef<HTMLElement>('ghost');
const closeButton = useTemplateRef<{ $el: HTMLElement }>('closeButton');

const texts = useMessages(spreadsheetPivotMessages);

const locale = useLocale(() => undefined);

const announcement = ref('');

const focusAfter = ref<FocusTarget>();

const placement = computed((): PivotPlacement => ({
  fields: fields ?? [],
  language: locale.value.startsWith('ru') ? PivotLanguage.Ru : PivotLanguage.En,
}));

const areas = computed(() => pivotAreas(definition));

const areaLabel = (area: PivotArea): string => {
  switch (area) {
    case PivotArea.Filters:
      return texts.value.filtersArea;
    case PivotArea.Columns:
      return texts.value.columnsArea;
    case PivotArea.Rows:
      return texts.value.rowsArea;
    case PivotArea.Values:
      return texts.value.valuesArea;
  }
};

const moveToLabel = (area: PivotArea): string => {
  switch (area) {
    case PivotArea.Filters:
      return texts.value.moveToFilters;
    case PivotArea.Columns:
      return texts.value.moveToColumns;
    case PivotArea.Rows:
      return texts.value.moveToRows;
    case PivotArea.Values:
      return texts.value.moveToValues;
  }
};

const fieldName = (field: number): string =>
  field === VALUES_FIELD ? texts.value.valuesField : (fields?.[field]?.name ?? '');

const chipOf = (area: PivotArea, field: number, index: number): PivotChip => {
  const value = area === PivotArea.Values ? definition.values[index] : undefined;
  const label = value?.name ?? fieldName(field);

  return {
    key: value === undefined ? `${area}:${String(field)}` : `values:${value.name}`,
    spot: { area, index },
    field,
    label,
    values: field === VALUES_FIELD,
  };
};

const areaViews = computed((): PivotAreaView[] =>
  AREA_ORDER.map((area) => ({
    area,
    label: areaLabel(area),
    chips: areas.value[area].map((field, index) => chipOf(area, field, index)),
  })),
);

const fieldViews = computed((): PivotFieldView[] => {
  const used = usedFields(definition);

  return (fields ?? []).map((field, index) => ({
    field: index,
    name: field.name,
    used: used.has(index),
  }));
});

const changed = (next: PivotDefinition, focus: FocusTarget | undefined, text: string): void => {
  if (next === definition) {
    return;
  }
  focusAfter.value = focus;
  announcement.value = text;
  emit('change', next);
};

const moved = (chip: PivotChip, to: PivotSpot): void => {
  const next = moveField(definition, chip.spot, to, placement.value);

  changed(
    next,
    { area: to.area, field: chip.field },
    texts.value.fieldPlaced({ field: fieldName(chip.field), area: areaLabel(to.area) }),
  );
};

const removed = (chip: PivotChip): void => {
  const neighbour =
    areas.value[chip.spot.area][chip.spot.index + 1] ??
    areas.value[chip.spot.area][chip.spot.index - 1];

  changed(
    removeField(definition, chip.spot),
    neighbour === undefined ? undefined : { area: chip.spot.area, field: neighbour },
    texts.value.fieldRemoved({ field: chip.label }),
  );
};

const placed = (field: number, to: PivotSpot): void => {
  changed(
    placeField(definition, field, to, placement.value),
    { area: to.area, field },
    texts.value.fieldPlaced({ field: fieldName(field), area: areaLabel(to.area) }),
  );
};

const check = (field: number, on: boolean): void => {
  const next = checkField(definition, field, on, placement.value);

  if (next !== definition) {
    emit('change', next);
  }
};

const appendTo = (area: PivotArea): PivotSpot => ({ area, index: areas.value[area].length });

const destinations = (chip: PivotChip): PivotArea[] =>
  AREA_ORDER.filter(
    (area) =>
      area !== chip.spot.area &&
      (!chip.values || area === PivotArea.Rows || area === PivotArea.Columns),
  );

const orderItems = (chip: PivotChip): NuiMenuEntry[] => {
  const { area, index } = chip.spot;
  const last = areas.value[area].length - 1;

  return [
    {
      key: 'up',
      label: texts.value.moveUp,
      icon: MOVE_ICONS.up,
      disabled: index === 0,
      onSelect: () => moved(chip, { area, index: index - 1 }),
    },
    {
      key: 'down',
      label: texts.value.moveDown,
      icon: MOVE_ICONS.down,
      disabled: index >= last,
      onSelect: () => moved(chip, { area, index: index + 2 }),
    },
    {
      key: 'first',
      label: texts.value.moveFirst,
      icon: MOVE_ICONS.first,
      disabled: index === 0,
      onSelect: () => moved(chip, { area, index: 0 }),
    },
    {
      key: 'last',
      label: texts.value.moveLast,
      icon: MOVE_ICONS.last,
      disabled: index >= last,
      onSelect: () => moved(chip, { area, index: last + 1 }),
    },
  ];
};

const removeItems = (chip: PivotChip): NuiMenuEntry[] =>
  chip.values
    ? []
    : [
        { type: 'separator', key: 'remove-group' },
        {
          key: 'remove',
          label: texts.value.removeField,
          icon: 'trash',
          tone: 'error',
          onSelect: () => removed(chip),
        },
      ];

const menuOf = (chip: PivotChip): readonly NuiMenuEntry[] => [
  ...orderItems(chip),
  { type: 'separator', key: 'areas' },
  ...destinations(chip).map((area): NuiMenuEntry => ({
    key: area,
    label: moveToLabel(area),
    icon: AREA_ICONS[area],
    onSelect: () => moved(chip, appendTo(area)),
  })),
  ...removeItems(chip),
];

const menuLabel = (chip: PivotChip): string => texts.value.fieldMenu({ field: chip.label });

const areaElements = (): Map<PivotArea, HTMLElement> => {
  const found = panel.value?.querySelectorAll(AREA_SELECTOR);

  return AREA_ORDER.reduce((elements, area, at) => {
    const element = found?.[at];

    return element instanceof HTMLElement ? elements.set(area, element) : elements;
  }, new Map<PivotArea, HTMLElement>());
};

const drop = (origin: PivotDragOrigin, target: PivotDropTarget): void => {
  if (origin.kind === PivotDragKind.Field) {
    if (target.kind === PivotDropKind.Area) {
      placed(origin.field, target.spot);
    }
    return;
  }
  if (target.kind === PivotDropKind.List) {
    removed(origin.chip);
  } else {
    moved(origin.chip, target.spot);
  }
};

const drag = usePivotDrag({
  panel: () => panel.value,
  ghost: () => ghost.value,
  list: () => list.value,
  areas: areaElements,
  drop,
  cancelled: () => {
    announcement.value = texts.value.dragCancelled;
  },
});

const dropTarget = computed((): PivotDropTarget | undefined => {
  const state = drag.state.value;

  return state.phase === PivotDragPhase.Dragging ? state.target : undefined;
});

const targetIndex = (area: PivotArea): number | undefined => {
  const target = dropTarget.value;

  return target?.kind === PivotDropKind.Area && target.spot.area === area
    ? target.spot.index
    : undefined;
};

const listTarget = computed(() => dropTarget.value?.kind === PivotDropKind.List);

const origin = computed((): PivotDragOrigin | undefined => {
  const state = drag.state.value;

  return state.phase === PivotDragPhase.Dragging ? state.origin : undefined;
});

const grabbed = computed(() =>
  origin.value?.kind === PivotDragKind.Chip ? origin.value.chip.key : undefined,
);

const ghostLabel = computed(() => {
  const current = origin.value;

  if (current === undefined) {
    return '';
  }
  return current.kind === PivotDragKind.Chip ? current.chip.label : current.label;
});

const onFieldDown = (item: PivotFieldView, event: PointerEvent): void => {
  if (!readonly) {
    drag.onPointerdown({ kind: PivotDragKind.Field, field: item.field, label: item.name }, event);
  }
};

const onChipDown = (chip: PivotChip, event: PointerEvent): void => {
  if (!readonly) {
    drag.onPointerdown({ kind: PivotDragKind.Chip, chip }, event);
  }
};

const onChipKeydown = (chip: PivotChip, event: KeyboardEvent): void => {
  if (readonly) {
    return;
  }

  const { area, index } = chip.spot;

  if ((event.key === Key.Delete || event.key === Key.Backspace) && !chip.values) {
    event.preventDefault();
    removed(chip);
  } else if (event.altKey && event.key === Key.ArrowUp && index > 0) {
    event.preventDefault();
    moved(chip, { area, index: index - 1 });
  } else if (event.altKey && event.key === Key.ArrowDown) {
    event.preventDefault();
    moved(chip, { area, index: index + 2 });
  }
};

const popupOpen = (): boolean =>
  (panel.value?.querySelector('[aria-expanded="true"]') ?? null) !== null;

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key !== Key.Escape || event.defaultPrevented || popupOpen()) {
    return;
  }
  event.preventDefault();

  if (drag.state.value.phase === PivotDragPhase.Idle) {
    emit('close');
  } else {
    drag.cancel();
  }
};

const focusChip = (target: FocusTarget): void => {
  const at = areaViews.value.findIndex((view) => view.area === target.area);
  const chips = areaViews.value[at]?.chips ?? [];
  const index = chips.findLastIndex((chip) => chip.field === target.field);
  const element = areaElements().get(target.area)?.querySelectorAll(CHIP_SELECTOR)[index];

  if (element instanceof HTMLElement) {
    element.focus();
  }
};

watch(
  areaViews,
  () => {
    const target = focusAfter.value;

    focusAfter.value = undefined;

    if (target !== undefined) {
      focusChip(target);
    }
  },
  { flush: 'post' },
);

const focusStart = (): void => {
  const first = list.value?.querySelector('input');

  if (first instanceof HTMLElement) {
    first.focus();
  } else {
    closeButton.value?.$el.focus();
  }
};

defineExpose({ focusStart });
</script>
