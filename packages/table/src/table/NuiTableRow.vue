<template>
  <tr
    class="nui-table__row"
    :class="rowClass"
    role="row"
    :aria-rowindex="shownIndex"
    :aria-level="level"
    :aria-expanded="expanded"
    :aria-selected="selected"
    :aria-busy="busy"
    :aria-hidden="hiddenRow"
    :style="rowStyle"
  >
    <template v-for="view in views" :key="view.key">
      <component
        :is="view.tag"
        v-if="view.gap"
        :class="view.className"
        role="presentation"
        :colspan="view.colspan"
        :style="view.style"
      ></component>
      <component
        :is="view.tag"
        v-else
        :class="view.className"
        :role="view.role"
        :scope="view.scope"
        :rowspan="view.rowspan"
        :colspan="view.colspan"
        :aria-colindex="view.colIndex"
        :aria-colspan="view.colSpan"
        :aria-sort="view.sort"
        :aria-selected="view.selected"
        :tabindex="view.tabindex"
        :style="view.style"
      >
        <div
          class="nui-table__content"
          :class="{ 'nui-table__content--text': view.bare !== undefined }"
        >
          <template v-if="view.bare !== undefined">{{ view.bare }}</template>
          <span
            v-else-if="view.piece !== undefined"
            :class="view.pieceClass"
            :aria-hidden="view.pieceHidden"
            >{{ view.piece }}</span
          >
          <slot
            v-else
            :name="view.slot"
            :column="view.key"
            :merge="view.merge"
            :revision="ownRevision"
            :position="position"
            :icon="view.icon"
          />
        </div>
        <NuiTableResizer
          v-if="view.resizer"
          v-bind="view.resizer"
          @grab="emit('resize', view.handle, $event, position)"
          @reset="emit('resetSize', view.handle, position)"
        />
      </component>
    </template>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { versionOf } from '@numior/primitives';
import NuiTableResizer from './NuiTableResizer.vue';
import { rowCellViews, rowPlainTexts } from './table-row-view';
import {
  TableRowPart,
  type NuiTableCellIcon,
  type NuiTableRowProps,
  type TableLeadSpan,
} from './table.types';

const {
  cells,
  rowIndex,
  part = TableRowPart.Body,
  wraps = true,
  position,
  paint,
  active = 0,
  revision,
  revisionOf,
  level,
  group,
  expanded = undefined,
  loading = false,
  selected = undefined,
  stripe = false,
  dragging = false,
  ranged,
  rangedAt,
  spans,
  ally,
  marks,
  sized,
  sizable = false,
  sizing = false,
  frozen,
  head,
  plainText,
} = defineProps<NuiTableRowProps>();

const emit = defineEmits<{
  resize: [key: string, event: PointerEvent, position: number | undefined];
  resetSize: [key: string, position: number | undefined];
}>();

defineSlots<{
  default(props: {
    column: string;
    merge: TableLeadSpan | undefined;
    revision: number;
    position: number | undefined;
    icon: NuiTableCellIcon | undefined;
  }): unknown;
  utility(props: { column: string; position: number | undefined }): unknown;
}>();

const heading = computed(() => part === TableRowPart.Head || part === TableRowPart.Band);

const sticky = computed(
  () => part === TableRowPart.Head || part === TableRowPart.Band || part === TableRowPart.Pinned,
);

const hiddenRow = computed(() => (part === TableRowPart.Skeleton ? true : undefined));

const shownIndex = computed(() => (hiddenRow.value ? undefined : rowIndex));

const busy = computed(() => loading || undefined);

const wrapsText = computed(
  () =>
    part === TableRowPart.Body ||
    ((part === TableRowPart.Foot || part === TableRowPart.Pinned) && wraps),
);

const rowClass = computed(() => [
  `nui-table__row--${part}`,
  {
    'nui-table__row--group': group !== undefined,
    'nui-table__row--expanded': expanded === true,
    'nui-table__row--selected': selected === true,
    'nui-table__row--odd': stripe,
    'nui-table__row--dragging': dragging,
    'nui-table__row--frozen': frozen !== undefined,
  },
]);

const rowStyle = computed(() => {
  if (sticky.value) {
    return { '--_top': `calc(var(--_row) * ${rowIndex - 1})` };
  }
  return frozen === undefined
    ? sized
    : { ...sized, '--_top': `calc(var(--_head-size) + ${frozen}px)` };
});

const ownRevision = computed(() => (position === undefined ? 0 : (revisionOf?.(position) ?? 0)));

const drawn = versionOf(() => (revision ?? 0) + ownRevision.value);

const paints = computed(() =>
  position === undefined ? undefined : drawn.read(() => paint?.(position, spans)),
);

const plainTexts = computed((): ReadonlyMap<string, string> | undefined =>
  plainText === undefined || position === undefined
    ? undefined
    : drawn.read(() =>
        rowPlainTexts(cells.cells, spans, paints.value, (key) => plainText(position, key)),
      ),
);

const views = computed(() =>
  rowCellViews(cells.cells, spans, {
    part,
    position,
    active,
    heading: heading.value,
    wrapsText: wrapsText.value,
    ranged,
    rangedAt,
    marks,
    ally,
    head,
    paints: paints.value,
    plain: plainTexts.value,
    sizable,
    sizing,
  }),
);
</script>
