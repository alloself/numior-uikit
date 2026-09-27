<template>
  <NuiLink href="#" underline="hover">Underline on hover</NuiLink>
  <NuiLink href="#" underline="none" tone="error">Delete account</NuiLink>
  <NuiLink href="#" disabled>Unavailable section</NuiLink>
</template>

<script setup lang="ts">
import { NuiLink } from '@numior/vue';
</script>
