<template>
  <section class="flex flex-col gap-6">
    <h3 v-if="heading" :id="anchorOf(component.name)">{{ component.name }}</h3>
    <ApiTable
      v-if="component.props.length > 0"
      :title="texts.apiProps"
      :columns="propColumns"
      :rows="component.props"
      :locale="locale"
      :stacked="narrow"
      :default-label="texts.apiDefault"
      :required-label="texts.apiRequired"
    />
    <ApiTable
      v-if="component.models.length > 0"
      :title="texts.apiModels"
      :columns="modelColumns"
      :rows="component.models"
      :locale="locale"
      :stacked="narrow"
      :default-label="texts.apiDefault"
    />
    <ApiTable
      v-if="component.events.length > 0"
      :title="texts.apiEvents"
      :columns="memberColumns(texts.apiPayload)"
      :rows="component.events"
      :locale="locale"
      :stacked="narrow"
      :default-label="texts.apiDefault"
    />
    <ApiTable
      v-if="component.slots.length > 0"
      :title="texts.apiSlots"
      :columns="memberColumns(texts.apiSlotProps)"
      :rows="component.slots"
      :locale="locale"
      :stacked="narrow"
      :default-label="texts.apiDefault"
    />
    <ApiTable
      v-if="component.exposed.length > 0"
      :title="texts.apiExposed"
      :columns="memberColumns(texts.apiType)"
      :rows="component.exposed"
      :locale="locale"
      :stacked="narrow"
      :default-label="texts.apiDefault"
    />
    <ApiTexts v-if="catalog" :catalog="catalog" :texts="texts" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NuiTableColumn } from '@numior/table';
import { useMediaQuery } from '@numior/vue';
import type {
  LocalizedText,
  ReferenceMember,
  ReferenceModel,
  ReferenceProp,
} from '../../reference/reference.types';
import type { ApiComponentProps, ApiRow } from '../theme.types';
import ApiTable from './ApiTable.vue';
import ApiTexts from './ApiTexts.vue';

const { component, catalog, locale, texts, heading } = defineProps<ApiComponentProps>();

const NARROW_QUERY = '(max-width: 40rem)';

const narrow = useMediaQuery(NARROW_QUERY);

const anchorOf = (name: string): string => `api-${name.toLowerCase()}`;

const localized = (text: LocalizedText | undefined): string => text?.[locale] ?? '';

const nameColumn = <T extends ApiRow>(): NuiTableColumn<T> => ({
  key: 'name',
  label: texts.apiName,
  type: 'text',
  filter: false,
  width: narrow.value ? 128 : 150,
  wrap: narrow.value,
  value: (row) => row.name,
});

const typeColumn = <T extends ApiRow>(label: string): NuiTableColumn<T> => ({
  key: 'type',
  label,
  type: 'text',
  filter: false,
  width: 190,
  wrap: true,
  value: (row) => row.type,
});

const defaultColumn = <T extends ApiRow>(): NuiTableColumn<T> => ({
  key: 'default',
  label: texts.apiDefault,
  type: 'text',
  filter: false,
  width: 120,
  value: (row) => row.default ?? '',
});

const descriptionColumn = <T extends ApiRow>(): NuiTableColumn<T> => ({
  key: 'description',
  label: texts.apiDescription,
  type: 'text',
  filter: false,
  width: narrow.value ? 140 : 200,
  flex: 1,
  wrap: true,
  value: (row) => localized(row.description),
});

const tableColumns = <T extends ApiRow>(
  middle: readonly NuiTableColumn<T>[],
): readonly NuiTableColumn<T>[] =>
  narrow.value
    ? [nameColumn(), descriptionColumn()]
    : [nameColumn(), ...middle, descriptionColumn()];

const propColumns = computed(() =>
  tableColumns<ReferenceProp>([typeColumn(texts.apiType), defaultColumn()]),
);

const modelColumns = computed(() =>
  tableColumns<ReferenceModel>([typeColumn(texts.apiType), defaultColumn()]),
);

const memberColumns = (typeLabel: string): readonly NuiTableColumn<ReferenceMember>[] =>
  tableColumns([typeColumn(typeLabel)]);
</script>
