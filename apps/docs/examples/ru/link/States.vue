<template>
  <NuiLink href="#" underline="hover">Только при наведении</NuiLink>
  <NuiLink href="#" underline="none" tone="error">Удалить аккаунт</NuiLink>
  <NuiLink href="#" disabled>Недоступный раздел</NuiLink>
</template>

<script setup lang="ts">
import { NuiLink } from '@numior/vue';
</script>
