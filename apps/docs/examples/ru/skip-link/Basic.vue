<template>
  <div class="flex flex-col gap-4">
    <NuiSkipLink target="skip-demo-content" />
    <nav class="flex gap-4 text-sm" aria-label="Пример навигации">
      <NuiLink href="#">Каталог</NuiLink>
      <NuiLink href="#">Заказы</NuiLink>
      <NuiLink href="#">Настройки</NuiLink>
    </nav>
    <section id="skip-demo-content" class="border rounded-md p-4 text-sm">
      Нажмите Tab внутри примера: ссылка «К содержимому» появится над навигацией и перенесёт фокус
      сюда.
    </section>
  </div>
</template>

<script setup lang="ts">
import { NuiLink, NuiSkipLink } from '@numior/vue';
</script>
