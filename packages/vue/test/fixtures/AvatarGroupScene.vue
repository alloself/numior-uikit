<template>
  <NuiAvatarGroup v-bind="group">
    <template v-if="children.length > 0" #default>
      <NuiAvatar v-for="(child, index) in children" :key="index" v-bind="child" />
    </template>
  </NuiAvatarGroup>
</template>

<script setup lang="ts">
import {
  NuiAvatar,
  NuiAvatarGroup,
  type NuiAvatarGroupProps,
  type NuiAvatarProps,
} from '../../src';

const { group = {}, children = [] } = defineProps<{
  group?: NuiAvatarGroupProps | undefined;
  children?: readonly NuiAvatarProps[] | undefined;
}>();
</script>
