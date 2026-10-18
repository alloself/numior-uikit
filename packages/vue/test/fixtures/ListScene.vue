<template>
  <div>
    <NuiList v-bind="list" v-model="model" v-model:values="values">
      <NuiListItem
        v-for="(part, index) in parts"
        :key="index"
        v-bind="itemProps(part)"
        v-on="part.clickable ? { click: countClick } : {}"
      >
        <template v-if="part.leading !== undefined" #leading>{{ part.leading }}</template>
        <template v-if="part.trailing !== undefined" #trailing>{{ part.trailing }}</template>
        <template v-if="part.nested !== undefined" #nested>
          <ul class="nested">
            <li>{{ part.nested }}</li>
          </ul>
        </template>
      </NuiListItem>
      <template v-if="itemText" #item="scope">{{ itemText(scope) }}</template>
      <template v-if="leadingText" #leading="scope">{{ leadingText(scope) }}</template>
    </NuiList>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiList, NuiListItem, type NuiListProps } from '../../src';
import type { ListLeadingText, ListItemText, ListPart } from '../drivers/list';
import { RouterStub } from '../support/router-stub';

const { list, parts, viaRouter, itemText, leadingText } = defineProps<{
  list: Partial<NuiListProps<unknown>>;
  parts: readonly ListPart[];
  viaRouter: boolean;
  itemText?: ListItemText | undefined;
  leadingText?: ListLeadingText | undefined;
}>();

const model = defineModel<unknown>({ required: true });

const values = defineModel<unknown[]>('values', { required: true });

const clicks = ref(0);

const countClick = (): void => {
  clicks.value += 1;
};

const itemProps = ({ leading, trailing, nested, clickable, ...item }: ListPart) =>
  viaRouter ? { ...item, as: RouterStub } : item;

defineExpose({ model, values, clicks });
</script>
