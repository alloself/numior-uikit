<template>
  <div dir="rtl" class="nui-w-full nui-max-w-sm nui-flex nui-flex-col nui-gap-4">
    <NuiInput v-model="name" label="الاسم الكامل" placeholder="مثال: ليلى أحمد" />
    <NuiSelect v-model="city" :options="cities" label="المدينة" />
    <NuiSwitch v-model="news">إرسال الأخبار</NuiSwitch>
    <NuiPagination v-model:page="page" :total="90" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiInput, NuiPagination, NuiSelect, NuiSwitch, type NuiOption } from '@numior/vue';

const name = ref('');
const city = ref<string | null>('cairo');
const news = ref(true);
const page = ref(2);

const cities: readonly NuiOption<string>[] = [
  { value: 'cairo', label: 'القاهرة' },
  { value: 'dubai', label: 'دبي' },
  { value: 'riyadh', label: 'الرياض' },
];
</script>
