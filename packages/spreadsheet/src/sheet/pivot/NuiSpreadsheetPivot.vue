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
      <div class="nui-spreadsheet-pivot__tools">
        <NuiMenu
          v-if="!readonly"
          :items="optionItems"
          :label="texts.options"
          placement="bottom-end"
          lazy
        >
          <template #trigger="{ attrs }">
            <NuiButton
              v-bind="attrs"
              variant="ghost"
              tone="neutral"
              size="xs"
              icon-only
              :aria-label="texts.options"
            >
              <NuiIcon :icon="SETTINGS_ICON" />
            </NuiButton>
          </template>
        </NuiMenu>
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
    </div>
    <NuiSpreadsheetPivotItems
      v-if="itemsView !== undefined"
      v-bind="itemsView"
      @apply="applyItems"
      @cancel="back"
    />
    <NuiSpreadsheetPivotValue
      v-else-if="valueView !== undefined"
      v-bind="valueView"
      @apply="applyValue"
      @cancel="back"
    />
    <p v-else-if="fields === undefined" class="nui-spreadsheet-pivot__lost">
      {{ texts.sourceLost }}
    </p>
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
  Funnel,
  ListFilter,
  Rows3,
  Settings2,
  Sigma,
} from '@lucide/vue';
import { Key, isComposing, useLocale, useMessages } from '@numior/primitives';
import { NuiButton, NuiCheckbox, NuiIcon, NuiMenu, type NuiMenuEntry } from '@numior/vue';
import { computed, markRaw, ref, shallowRef, useTemplateRef, watch } from 'vue';
import {
  PivotArea,
  PivotLanguage,
  PivotLayout,
  VALUES_FIELD,
  checkField,
  moveField,
  pivotAreas,
  pivotFieldOf,
  placeField,
  removeField,
  setPivotValue,
  showItems,
  showSubtotals,
  shownItems,
  sortField,
  usedFields,
  type CellValue,
  type PivotDefinition,
  type PivotSort,
  type PivotValue,
  type PivotPlacement,
  type PivotSpot,
} from '../../core';
import NuiSpreadsheetPivotArea from './NuiSpreadsheetPivotArea.vue';
import NuiSpreadsheetPivotItems from './NuiSpreadsheetPivotItems.vue';
import NuiSpreadsheetPivotValue from './NuiSpreadsheetPivotValue.vue';
import { spreadsheetPivotMessages } from './pivot-panel.messages';
import {
  PivotDragKind,
  PivotDragPhase,
  PivotDropKind,
  PivotPanelViewKind,
  type PivotAreaView,
  type PivotChip,
  type PivotDragOrigin,
  type PivotDropTarget,
  type PivotFieldView,
  type PivotPanelView,
  type SheetPivotItemsProps,
  type SheetPivotProps,
  type SheetPivotValueProps,
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

const FILTER_ICON = markRaw(Funnel);

const SETTINGS_ICON = markRaw(Settings2);

const FIELDS_VIEW: PivotPanelView = { kind: PivotPanelViewKind.Fields };

const AREA_SELECTOR = '.nui-spreadsheet-pivot__area';

const CHIP_SELECTOR = '.nui-spreadsheet-pivot__chip';

const {
  definition,
  fields,
  titleId,
  items,
  format,
  readonly = false,
} = defineProps<SheetPivotProps>();

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

const view = shallowRef<PivotPanelView>(FIELDS_VIEW);

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

const openView = (
  kind: typeof PivotPanelViewKind.Items | typeof PivotPanelViewKind.Value,
  chip: PivotChip,
): void => {
  view.value = { kind, chip };
};

const toggleSubtotals = (chip: PivotChip, on: boolean): void => {
  changed(
    showSubtotals(definition, chip.field, on),
    { area: chip.spot.area, field: chip.field },
    '',
  );
};

const axisItems = (chip: PivotChip): NuiMenuEntry[] => {
  const axis = chip.spot.area !== PivotArea.Filters;

  const subtotals: NuiMenuEntry[] = axis
    ? [
        {
          type: 'checkbox',
          key: 'subtotals',
          label: texts.value.subtotals,
          checked: pivotFieldOf(definition, chip.field).subtotal,
          onCheckedChange: (on) => toggleSubtotals(chip, on),
        },
      ]
    : [];

  return [
    { type: 'separator', key: 'settings' },
    ...subtotals,
    {
      key: 'items',
      label: axis ? texts.value.filterAndSort : texts.value.filterItems,
      icon: FILTER_ICON,
      onSelect: () => openView(PivotPanelViewKind.Items, chip),
    },
  ];
};

const settingsItems = (chip: PivotChip): NuiMenuEntry[] => {
  if (chip.values) {
    return [];
  }
  if (chip.spot.area !== PivotArea.Values) {
    return axisItems(chip);
  }
  return [
    { type: 'separator', key: 'settings' },
    {
      key: 'value',
      label: texts.value.valueSettings,
      icon: SETTINGS_ICON,
      onSelect: () => openView(PivotPanelViewKind.Value, chip),
    },
  ];
};

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
  ...settingsItems(chip),
];

const layoutOf = (value: string): PivotLayout | undefined =>
  Object.values(PivotLayout).find((layout) => layout === value);

const setOption = (next: PivotDefinition): void => {
  changed(next, undefined, texts.value.optionsChanged);
};

const setLayout = (value: string): void => {
  const layout = layoutOf(value);

  if (layout !== undefined && layout !== definition.layout) {
    setOption({ ...definition, layout });
  }
};

const optionItems = computed((): NuiMenuEntry[] => [
  { type: 'label', key: 'layout-title', label: texts.value.reportLayout },
  {
    type: 'radio-group',
    key: 'layout',
    value: definition.layout,
    onChange: setLayout,
    items: [
      { value: PivotLayout.Compact, label: texts.value.layoutCompact },
      { value: PivotLayout.Outline, label: texts.value.layoutOutline },
      { value: PivotLayout.Tabular, label: texts.value.layoutTabular },
    ],
  },
  { type: 'separator', key: 'totals' },
  {
    type: 'checkbox',
    key: 'row-totals',
    label: texts.value.rowGrandTotals,
    checked: definition.rowTotals,
    onCheckedChange: (rowTotals) => setOption({ ...definition, rowTotals }),
  },
  {
    type: 'checkbox',
    key: 'column-totals',
    label: texts.value.columnGrandTotals,
    checked: definition.columnTotals,
    onCheckedChange: (columnTotals) => setOption({ ...definition, columnTotals }),
  },
  { type: 'separator', key: 'autofit' },
  {
    type: 'checkbox',
    key: 'autofit',
    label: texts.value.autofit,
    checked: definition.autofit,
    onCheckedChange: (autofit) => setOption({ ...definition, autofit }),
  },
]);

const back = (): void => {
  const current = view.value;

  if (current.kind === PivotPanelViewKind.Fields) {
    return;
  }

  focusAfter.value = { area: current.chip.spot.area, field: current.chip.field };
  view.value = FIELDS_VIEW;
};

const itemsView = computed((): SheetPivotItemsProps | undefined => {
  const current = view.value;

  if (current.kind !== PivotPanelViewKind.Items) {
    return undefined;
  }

  const { field, label, spot } = current.chip;
  const fieldItems = items(field) ?? [];

  return {
    name: label,
    items: fieldItems,
    shown: shownItems(
      definition,
      field,
      fieldItems.map((item) => item.value),
    ),
    sort: spot.area === PivotArea.Filters ? undefined : pivotFieldOf(definition, field).sort,
  };
});

const takenNames = (index: number): Set<string> => {
  const taken = new Set((fields ?? []).map((field) => field.name.toLowerCase()));

  definition.values.forEach((value, at) => {
    if (at !== index) {
      taken.add(value.name.toLowerCase());
    }
  });

  return taken;
};

const valueView = computed((): SheetPivotValueProps | undefined => {
  const current = view.value;

  const value =
    current.kind === PivotPanelViewKind.Value
      ? definition.values[current.chip.spot.index]
      : undefined;

  if (current.kind !== PivotPanelViewKind.Value || value === undefined) {
    return undefined;
  }

  return {
    value,
    fieldName: fieldName(value.field),
    fields: fields ?? [],
    bases: [...definition.rows, ...definition.columns].filter((field) => field !== VALUES_FIELD),
    taken: takenNames(current.chip.spot.index),
    items,
    format,
    language: placement.value.language,
  };
});

const applyItems = (shown: readonly CellValue[], sort: PivotSort | undefined): void => {
  const current = view.value;

  if (current.kind !== PivotPanelViewKind.Items) {
    return;
  }

  const { field, label } = current.chip;
  const values = (items(field) ?? []).map((item) => item.value);
  const filtered = showItems(definition, field, shown, values);

  back();

  changed(
    sort === undefined ? filtered : sortField(filtered, field, sort),
    focusAfter.value,
    texts.value.itemsApplied({ field: label }),
  );
};

const applyValue = (next: PivotValue): void => {
  const current = view.value;

  if (current.kind !== PivotPanelViewKind.Value) {
    return;
  }

  back();

  changed(
    setPivotValue(definition, current.chip.spot.index, next),
    { area: PivotArea.Values, field: next.field },
    texts.value.valueApplied({ name: next.name }),
  );
};

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
  if (event.key !== Key.Escape || isComposing(event) || event.defaultPrevented || popupOpen()) {
    return;
  }
  event.preventDefault();

  if (view.value.kind !== PivotPanelViewKind.Fields) {
    back();
  } else if (drag.state.value.phase === PivotDragPhase.Idle) {
    emit('close');
  } else {
    drag.cancel();
  }
};

const focusChip = (target: FocusTarget): void => {
  const at = areaViews.value.findIndex((each) => each.area === target.area);
  const chips = areaViews.value[at]?.chips ?? [];
  const index = chips.findLastIndex((chip) => chip.field === target.field);
  const element = areaElements().get(target.area)?.querySelectorAll(CHIP_SELECTOR)[index];

  if (element instanceof HTMLElement) {
    element.focus();
  }
};

watch(
  [areaViews, view],
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
