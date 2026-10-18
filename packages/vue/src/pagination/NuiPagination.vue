<template>
  <nav class="nui-pagination" :class="`nui-pagination--size-${size}`" :aria-label="texts.label">
    <span v-if="showRange" class="nui-pagination__range">{{ rangeText }}</span>
    <div v-if="pageSizes" class="nui-pagination__page-size">
      <span :id="`${baseId}-page-size`" class="nui-pagination__page-size-label">
        {{ texts.pageSize }}
      </span>
      <NuiSelect
        :model-value="pageSize"
        :options="sizeOptions"
        size="sm"
        class="nui-pagination__select"
        :aria-labelledby="`${baseId}-page-size`"
        @update:model-value="changePageSize"
      />
    </div>
    <ul class="nui-pagination__list">
      <li v-if="edges" class="nui-pagination__item nui-pagination__item--edge">
        <NuiPaginationControl v-bind="controlProps(1, texts.first, page === 1)" @select="go">
          <NuiIcon icon="chevrons-left" class="nui-pagination__arrow" />
        </NuiPaginationControl>
      </li>
      <li class="nui-pagination__item">
        <NuiPaginationControl
          v-bind="controlProps(page - 1, texts.previous, page === 1)"
          class="nui-pagination__previous"
          @select="go"
        >
          <NuiIcon icon="chevron-left" class="nui-pagination__arrow" />
        </NuiPaginationControl>
      </li>
      <li class="nui-pagination__item nui-pagination__item--status" aria-hidden="true">
        <span class="nui-pagination__status">{{ page }} / {{ pageCount }}</span>
      </li>
      <li
        v-for="entry in entries"
        :key="String(entry)"
        class="nui-pagination__item"
        :class="
          typeof entry === 'number'
            ? 'nui-pagination__item--page'
            : 'nui-pagination__item--ellipsis'
        "
      >
        <span v-if="typeof entry === 'string'" class="nui-pagination__ellipsis" aria-hidden="true">
          …
        </span>
        <NuiPaginationControl
          v-else
          v-bind="controlProps(entry, pageText(entry), false)"
          :current="entry === page"
          class="nui-pagination__page"
          @select="go"
        >
          {{ entry }}
        </NuiPaginationControl>
      </li>
      <li class="nui-pagination__item">
        <NuiPaginationControl
          v-bind="controlProps(page + 1, texts.next, page === pageCount)"
          class="nui-pagination__next"
          @select="go"
        >
          <NuiIcon icon="chevron-right" class="nui-pagination__arrow" />
        </NuiPaginationControl>
      </li>
      <li v-if="edges" class="nui-pagination__item nui-pagination__item--edge">
        <NuiPaginationControl
          v-bind="controlProps(pageCount, texts.last, page === pageCount)"
          @select="go"
        >
          <NuiIcon icon="chevrons-right" class="nui-pagination__arrow" />
        </NuiPaginationControl>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useControlId, useMessages } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiSelect from '../select/NuiSelect.vue';
import type { NuiOption } from '../shared/options';
import NuiPaginationControl from './NuiPaginationControl.vue';
import { clampPage, pageCountOf, paginationRange } from './pagination-range';
import { paginationMessages } from './pagination.messages';
import type { NuiPaginationProps } from './pagination.types';

const {
  total,
  siblings = 1,
  boundaries = 1,
  edges = false,
  href,
  as = 'a',
  pageSizes,
  showRange = true,
  size = 'md',
  label,
  previousLabel,
  nextLabel,
  firstLabel,
  lastLabel,
  pageSizeLabel,
  pageLabel,
  rangeLabel,
} = defineProps<NuiPaginationProps>();

const pageModel = defineModel<number>('page', { default: 1 });
const pageSize = defineModel<number>('pageSize', { default: 20 });

const baseId = useControlId();
const messages = useMessages(paginationMessages);

const pageCount = computed(() => pageCountOf(total, pageSize.value));
const page = computed(() => clampPage(pageModel.value, pageCount.value));

watch(
  [page, () => pageModel.value],
  ([clamped, requested]) => {
    if (clamped !== requested) {
      pageModel.value = clamped;
    }
  },
  { immediate: true },
);

const entries = computed(() => paginationRange(page.value, pageCount.value, siblings, boundaries));

const rangeText = computed(() => {
  const from = total === 0 ? 0 : (page.value - 1) * pageSize.value + 1;
  const to = Math.min(page.value * pageSize.value, total);
  return rangeLabel ? rangeLabel(from, to, total) : messages.value.range({ from, to, total });
});

const texts = computed(() => ({
  label: label ?? messages.value.label,
  previous: previousLabel ?? messages.value.previous,
  next: nextLabel ?? messages.value.next,
  first: firstLabel ?? messages.value.first,
  last: lastLabel ?? messages.value.last,
  pageSize: pageSizeLabel ?? messages.value.pageSize,
}));

const pageText = (target: number): string =>
  pageLabel ? pageLabel(target) : messages.value.page({ page: target });

const sizeOptions = computed<NuiOption<number>[]>(() =>
  (pageSizes ?? []).map((value) => ({ value, label: String(value) })),
);

const go = (target: number): void => {
  pageModel.value = clampPage(target, pageCount.value);
};

const changePageSize = (value: number | null): void => {
  if (value !== null) {
    pageSize.value = value;
  }
};

const controlProps = (target: number, name: string, disabled: boolean) => ({
  page: target,
  label: name,
  disabled,
  as,
  ...(href === undefined || disabled ? {} : { href: href(target) }),
});
</script>
