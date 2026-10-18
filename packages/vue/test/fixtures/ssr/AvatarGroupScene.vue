<template>
  <NuiAvatarGroup :max="1" size="lg">
    <NuiAvatar name="Alice" />
    <NuiAvatar name="Bob" />
    <NuiAvatar name="Cara" />
  </NuiAvatarGroup>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiAvatarGroup } from '../../../src';
</script>
