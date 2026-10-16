<template>
  <div class="flex flex-col gap-4 w-full max-w-sm text-sm">
    <p>
      Проверьте адрес доставки и
      <NuiLink href="#address">условия возврата для крупногабаритных товаров</NuiLink>
      до оплаты.
    </p>
    <div class="flex items-center gap-2">
      <NuiButton>Оплатить</NuiButton>
      <NuiButton variant="link">Изменить адрес</NuiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiLink } from '@numior/vue';
</script>
