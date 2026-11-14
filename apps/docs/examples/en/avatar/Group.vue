<template>
  <NuiAvatarGroup :items="people" :max="3" size="lg" label="Staff on order 20408" />
</template>

<script setup lang="ts">
import { NuiAvatarGroup, type NuiAvatarItem } from '@numior/vue';
import { team } from '#demo/team';

const people: NuiAvatarItem[] = team.map(({ id, name }) => ({ key: id, name }));
</script>
