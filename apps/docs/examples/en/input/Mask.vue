<template>
  <NuiInput
    v-model.unmasked="phone"
    type="tel"
    mask="+1 (###) ###-####"
    label="Customer phone"
    placeholder="+1 (617) 555-0101"
    :description="description"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiInput } from '@numior/kit';

const PHONE_DIGITS = 10;

const phone = ref('');

const description = computed(() =>
  phone.value.length === PHONE_DIGITS
    ? `The courier will call +1${phone.value}`
    : 'Ten digits after the country code',
);
</script>
