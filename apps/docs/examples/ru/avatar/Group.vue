<template>
  <NuiAvatarGroup :items="people" :max="3" size="lg" label="Сотрудники на заказе 20408" />
</template>

<script setup lang="ts">
import { NuiAvatarGroup, type NuiAvatarItem } from '@numior/kit';
import { team } from '#demo/team';

const people: NuiAvatarItem[] = team.map(({ id, name }) => ({ key: id, name }));
</script>
