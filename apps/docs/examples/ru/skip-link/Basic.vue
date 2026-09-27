<template>
  <div class="nui-flex nui-flex-col nui-gap-4">
    <NuiSkipLink target="skip-demo-content" />
    <nav class="nui-flex nui-gap-4 nui-text-sm" aria-label="Пример навигации">
      <NuiLink href="#">Каталог</NuiLink>
      <NuiLink href="#">Заказы</NuiLink>
      <NuiLink href="#">Настройки</NuiLink>
    </nav>
    <section id="skip-demo-content" class="nui-border nui-rounded nui-p-4 nui-text-sm">
      Нажмите Tab внутри примера: ссылка «К содержимому» появится над навигацией и перенесёт фокус
      сюда.
    </section>
  </div>
</template>

<script setup lang="ts">
import { NuiLink, NuiSkipLink } from '@numior/vue';
</script>
