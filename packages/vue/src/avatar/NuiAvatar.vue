<template>
  <span
    class="nui-avatar"
    :class="[
      `nui-avatar--size-${resolvedSize}`,
      `nui-avatar--shape-${resolvedShape}`,
      status ? `nui-avatar--status-${status}` : undefined,
      { 'nui-avatar--grouped': group !== null },
    ]"
  >
    <span
      class="nui-avatar__figure"
      :role="label ? 'img' : undefined"
      :aria-label="label || undefined"
      :aria-hidden="label ? undefined : 'true'"
    >
      <img v-if="showImage" class="nui-avatar__image" :src="src" :alt="label" @error="fail" />
      <slot v-else>
        <span v-if="initials" class="nui-avatar__initials">{{ initials }}</span>
        <NuiIcon v-else :alias="icon" class="nui-avatar__icon" />
      </slot>
    </span>
    <span
      v-if="status"
      class="nui-avatar__status"
      role="img"
      :aria-label="statusLabel ?? STATUS_LABELS[status]"
    />
    <span v-if="$slots.badge" class="nui-avatar__badge"><slot name="badge" /></span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useAvatarGroup } from './avatar-context';
import type { NuiAvatarProps, NuiAvatarStatus } from './avatar.types';
import { initialsOf } from './initials';

const STATUS_LABELS: Record<NuiAvatarStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  busy: 'Busy',
  away: 'Away',
};

const {
  src,
  alt,
  name,
  size = undefined,
  shape = undefined,
  status,
  statusLabel,
  icon = 'user',
} = defineProps<NuiAvatarProps>();

const group = useAvatarGroup();
const failed = ref(false);
watch(
  () => src,
  () => {
    failed.value = false;
  },
);

const resolvedSize = computed(() => size ?? group?.size.value ?? 'md');
const resolvedShape = computed(() => shape ?? group?.shape.value ?? 'circle');
const label = computed(() => alt ?? name ?? '');
const showImage = computed(() => src !== undefined && src !== '' && !failed.value);
const initials = computed(() => (name === undefined ? '' : initialsOf(name)));
const fail = (): void => {
  failed.value = true;
};
</script>
