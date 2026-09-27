<template>
  <section class="nui-flex nui-flex-col nui-gap-6">
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
    <ApiKeyboard
      v-if="component.keyboard.length > 0"
      :keys="component.keyboard"
      :locale="locale"
      :texts="texts"
    />
    <ApiStyles v-if="component.styles" :styles="component.styles" :texts="texts" />
  </section>
</template>

<script setup lang="ts">
import type { NuiTableColumn } from '@numior/vue';
import type {
  ReferenceMember,
  ReferenceModel,
  ReferenceProp,
} from '../../reference/reference.types';
import type { ApiComponentProps } from '../theme.types';
import ApiKeyboard from './ApiKeyboard.vue';
import ApiStyles from './ApiStyles.vue';
import ApiTable from './ApiTable.vue';

const { component, locale, texts, heading } = defineProps<ApiComponentProps>();

const anchorOf = (name: string): string => `api-${name.toLowerCase()}`;

const propColumns: readonly NuiTableColumn<ReferenceProp>[] = [
  { key: 'name', label: texts.apiName },
  { key: 'type', label: texts.apiType },
  { key: 'default', label: texts.apiDefault },
  { key: 'description', label: texts.apiDescription },
];

const modelColumns: readonly NuiTableColumn<ReferenceModel>[] = [
  { key: 'name', label: texts.apiName },
  { key: 'type', label: texts.apiType },
  { key: 'default', label: texts.apiDefault },
  { key: 'description', label: texts.apiDescription },
];

const memberColumns = (typeLabel: string): readonly NuiTableColumn<ReferenceMember>[] => [
  { key: 'name', label: texts.apiName },
  { key: 'type', label: typeLabel },
  { key: 'description', label: texts.apiDescription },
];
</script>
