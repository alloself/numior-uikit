<template>
  <NuiStepper readonly class="w-full max-w-xl">
    <NuiStepperStep title="Добавьте товары">
      <p>Хватит названия, цены и одного фото, остальное заполните позже.</p>
    </NuiStepperStep>
    <NuiStepperStep title="Настройте доставку">
      <p>Выберите города и задайте цену для каждой зоны.</p>
    </NuiStepperStep>
    <NuiStepperStep title="Откройте витрину">
      <p>Покупатели увидят каталог сразу после публикации.</p>
      <NuiButton class="mt-3">Опубликовать</NuiButton>
    </NuiStepperStep>
  </NuiStepper>
</template>

<script setup lang="ts">
import { NuiButton, NuiStepper, NuiStepperStep } from '@numior/kit';
</script>
