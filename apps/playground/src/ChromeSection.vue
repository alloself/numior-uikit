<template>
  <section class="panel" aria-labelledby="chrome-title">
    <div class="section-heading">
      <h2 id="chrome-title">Оформление интерфейса</h2>
      <span class="tag">NuiSeparator · NuiKbd</span>
    </div>
    <div class="nui-flex nui-flex-col nui-gap-4">
      <div class="nui-flex nui-items-center nui-gap-3" data-testid="chrome-toolbar">
        <NuiButton variant="ghost" tone="neutral" size="sm">Файл</NuiButton>
        <NuiSeparator orientation="vertical" data-testid="separator-vertical" />
        <NuiButton variant="ghost" tone="neutral" size="sm">Правка</NuiButton>
        <NuiSeparator orientation="vertical" decorative data-testid="separator-decorative" />
        <NuiKbd keys="mod+k" data-testid="kbd-combo" />
      </div>
      <NuiSeparator data-testid="separator-horizontal" />
      <NuiSeparator label="или" data-testid="separator-labelled" />
      <p class="nui-text-sm nui-text-muted">
        Нажмите <NuiKbd :keys="['mod+shift+p']" size="sm" data-testid="kbd-list" /> для палитры
        команд или <NuiKbd variant="plain" data-testid="kbd-plain">Esc</NuiKbd> для выхода.
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NuiButton, NuiKbd, NuiSeparator } from '@numior/vue';
</script>
