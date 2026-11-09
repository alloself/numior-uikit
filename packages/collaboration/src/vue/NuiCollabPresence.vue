<template>
  <NuiAvatarGroup :items="items" :max="max" :label="text" size="sm" />
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiAvatarGroup, type NuiAvatarItem } from '@numior/vue';
import { computed } from 'vue';
import { collabMessages } from './collab.messages';
import type { NuiCollabPresenceProps } from './collab.types';

const { peers, max = 5, label } = defineProps<NuiCollabPresenceProps>();

const messages = useMessages(collabMessages);

const text = computed(() => label ?? messages.value.present);

const items = computed<readonly NuiAvatarItem[]>(() =>
  [...new Map(peers.map((peer) => [peer.user.id, peer.user])).values()].map((user) => ({
    key: user.id,
    name: user.name,
    src: user.avatar,
    alt: user.name,
  })),
);
</script>
