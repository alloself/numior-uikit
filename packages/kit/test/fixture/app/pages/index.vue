<template>
  <main class="page" data-testid="home">
    <h1>Numior в Nuxt</h1>
    <NuiCode code="pnpm add @numior/kit" data-testid="install" />
    <NuiButton to="/about" data-testid="about">О проекте</NuiButton>
    <NuiButton variant="outline" data-testid="notify" @click="notify">Уведомить</NuiButton>
    <NuiToaster />
  </main>
</template>

<script setup lang="ts">
const toast = useToast();

const notify = (): void => {
  toast.show({ title: 'Готово' });
};
</script>
