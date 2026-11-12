<template>
  <NuiButton icon="plus" @click="open = true">Новый клиент</NuiButton>
  <NuiDrawer
    v-model:open="open"
    title="Новый клиент"
    description="Карточка появится в списке клиентов"
  >
    <form :id="formId" class="flex flex-col gap-3" novalidate @submit.prevent="save">
      <NuiInput
        v-model="name"
        label="Имя и фамилия"
        placeholder="Лена Орлова"
        :error="nameError"
        required
      />
      <NuiInput v-model="email" type="email" label="Почта" placeholder="orlova@example.com" />
      <NuiInput v-model="phone" type="tel" label="Телефон" placeholder="+7 900 000-01-02" />
      <NuiSelect v-model="city" :options="cities" label="Город" />
    </form>
    <template #footer>
      <NuiButton variant="ghost" tone="neutral" @click="open = false">Отмена</NuiButton>
      <NuiButton type="submit" :form="formId">Сохранить</NuiButton>
    </template>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref, useId } from 'vue';
import { uniq } from 'lodash-es';
import { useToast } from '@numior/primitives';
import { NuiButton, NuiDrawer, NuiInput, NuiSelect } from '@numior/vue';
import { customers } from '#demo/customers';

const formId = useId();
const toast = useToast();

const open = ref(false);
const name = ref('');
const email = ref('');
const phone = ref('');
const nameError = ref<string | undefined>();
const city = ref<string | null>('Москва');

const cities = uniq(customers.map((customer) => customer.city)).map((value) => ({
  value,
  label: value,
}));

const save = (): void => {
  if (name.value.trim() === '') {
    nameError.value = 'Укажите имя и фамилию';
    return;
  }

  nameError.value = undefined;
  toast.success('Клиент добавлен', { description: name.value });
  open.value = false;
};
</script>
