<template>
  <NuiTabs v-model="tab" class="w-full max-w-md">
    <NuiTabList label="Открытые документы">
      <NuiTab
        v-for="file in files"
        :key="file.value"
        :value="file.value"
        closable
        @close="close(file.value)"
      >
        {{ file.label }}
      </NuiTab>
    </NuiTabList>
    <NuiTabPanel v-for="file in files" :key="file.value" :value="file.value">
      {{ file.text }}
    </NuiTabPanel>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTab, NuiTabList, NuiTabPanel, NuiTabs } from '@numior/vue';

const files = ref([
  { value: 'contract', label: 'Договор', text: 'Договор поставки № 18 от 2 сентября.' },
  { value: 'invoice', label: 'Счёт', text: 'Счёт на 12 400 ₽, оплатить до пятницы.' },
  { value: 'act', label: 'Акт сверки', text: 'Акт сверки за сентябрь, расхождений нет.' },
]);

const tab = ref('contract');

const close = (value: string): void => {
  const index = files.value.findIndex((file) => file.value === value);

  files.value = files.value.filter((file) => file.value !== value);

  if (tab.value !== value) {
    return;
  }

  tab.value = files.value.at(Math.min(index, files.value.length - 1))?.value ?? '';
};
</script>
