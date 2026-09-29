<template>
  <section class="flex flex-col gap-6">
    <h3 v-if="heading" :id="anchorOf(component.name)">{{ component.name }}</h3>
    <ApiTable
      v-if="component.props.length > 0"
      :title="texts.apiProps"
      :columns="propColumns"
      :rows="component.props"
      :locale="locale"
      :required-label="texts.apiRequired"
    />
    <ApiTable
      v-if="component.models.length > 0"
      :title="texts.apiModels"
      :columns="modelColumns"
      :rows="component.models"
      :locale="locale"
    />
    <ApiTable
      v-if="component.events.length > 0"
      :title="texts.apiEvents"
      :columns="memberColumns(texts.apiPayload)"
      :rows="component.events"
      :locale="locale"
    />
    <ApiTable
      v-if="component.slots.length > 0"
      :title="texts.apiSlots"
      :columns="memberColumns(texts.apiSlotProps)"
      :rows="component.slots"
      :locale="locale"
    />
    <ApiTable
      v-if="component.exposed.length > 0"
      :title="texts.apiExposed"
      :columns="memberColumns(texts.apiType)"
      :rows="component.exposed"
      :locale="locale"
    />
    <ApiStyles v-if="component.styles" :styles="component.styles" :texts="texts" />
    <ApiTexts v-if="catalog" :catalog="catalog" :texts="texts" />
  </section>
</template>

<script setup lang="ts">
import type { NuiTableColumn } from '@numior/table';
import type {
  LocalizedText,
  ReferenceMember,
  ReferenceModel,
  ReferenceProp,
} from '../../reference/reference.types';
import type { ApiComponentProps, ApiRow } from '../theme.types';
import ApiStyles from './ApiStyles.vue';
import ApiTable from './ApiTable.vue';
import ApiTexts from './ApiTexts.vue';

const { component, catalog, locale, texts, heading } = defineProps<ApiComponentProps>();

const anchorOf = (name: string): string => `api-${name.toLowerCase()}`;

const localized = (text: LocalizedText | undefined): string => text?.[locale] ?? '';

const nameColumn = <T extends ApiRow>(): NuiTableColumn<T> => ({
  key: 'name',
  label: texts.apiName,
  type: 'text',
  filter: false,
  width: 150,
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
  width: 200,
  flex: 1,
  wrap: true,
  value: (row) => localized(row.description),
});

const propColumns: readonly NuiTableColumn<ReferenceProp>[] = [
  nameColumn(),
  typeColumn(texts.apiType),
  defaultColumn(),
  descriptionColumn(),
];

const modelColumns: readonly NuiTableColumn<ReferenceModel>[] = [
  nameColumn(),
  typeColumn(texts.apiType),
  defaultColumn(),
  descriptionColumn(),
];

const memberColumns = (typeLabel: string): readonly NuiTableColumn<ReferenceMember>[] => [
  nameColumn(),
  typeColumn(typeLabel),
  descriptionColumn(),
];
</script>
