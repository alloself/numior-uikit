<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Вход в кабинет</NuiCardTitle>
      <NuiCardDescription>Введите код, который пришёл на почту</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiOtpField v-model="code" label="Код из письма" :description="`Отправили на ${email}`" />
    </NuiCardContent>
    <NuiCardFooter class="flex justify-between gap-2">
      <NuiButton variant="ghost" tone="neutral">Отправить ещё раз</NuiButton>
      <NuiButton :disabled="code.length < LENGTH">Войти</NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiOtpField,
} from '@numior/kit';
import { team } from '#demo/team';

const LENGTH = 6;

const [{ email }] = team;

const code = ref('');
</script>
