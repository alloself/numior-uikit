<template>
  <NuiButton icon="plus" @click="open = true">New customer</NuiButton>
  <NuiDrawer
    v-model:open="open"
    title="New customer"
    description="The card appears in the customer list"
  >
    <form :id="formId" class="flex flex-col gap-3" novalidate @submit.prevent="save">
      <NuiInput
        v-model="name"
        label="Full name"
        placeholder="Lena Ortiz"
        :error="nameError"
        required
      />
      <NuiInput v-model="email" type="email" label="Email" placeholder="lena.ortiz@example.com" />
      <NuiInput v-model="phone" type="tel" label="Phone" placeholder="(312) 555-0102" />
      <NuiSelect v-model="city" :options="cities" label="City" />
    </form>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Cancel</NuiButton>
      <NuiButton type="submit" :form="formId">Save</NuiButton>
    </template>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
import { uniq } from 'lodash-es';
import { NuiButton, NuiDrawer, NuiInput, NuiSelect, useToast } from '@numior/kit';
import { customers } from '#demo/customers';

const formId = useId();
const toast = useToast();

const open = ref(false);
const name = ref('');
const email = ref('');
const phone = ref('');
const nameError = ref<string | undefined>();
const city = ref<string | null>('Boston');

const cities = uniq(customers.map((customer) => customer.city)).map((value) => ({
  value,
  label: value,
}));

const save = (): void => {
  if (name.value.trim() === '') {
    nameError.value = 'Enter the full name';
    return;
  }

  nameError.value = undefined;
  toast.success('Customer added', { description: name.value });
  open.value = false;
};
</script>
