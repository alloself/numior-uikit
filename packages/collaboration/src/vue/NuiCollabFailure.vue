<template>
  <NuiAlert tone="error" :title="text.failureTitle">
    <p class="nui-collab-failure__line">{{ reason }}</p>
    <p class="nui-collab-failure__line">{{ outcome }}</p>
    <template v-if="canRejoin || $slots.actions" #actions>
      <slot name="actions" />
      <NuiButton
        v-if="canRejoin"
        variant="outline"
        tone="neutral"
        size="sm"
        class="nui-collab-failure__rejoin"
        @click="emit('rejoin')"
      >
        {{ text.failureRejoin }}
      </NuiButton>
    </template>
  </NuiAlert>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiAlert, NuiButton } from '@numior/vue';
import { computed } from 'vue';
import { CollabFailure } from '../client/client.types';
import { collabMessages, type NuiCollabMessages } from './collab.messages';
import type { NuiCollabFailureProps } from './collab.types';

const { failure, labels } = defineProps<NuiCollabFailureProps>();

const emit = defineEmits<{ rejoin: [] }>();

const messages = useMessages(collabMessages);

const text = computed(() => ({ ...messages.value, ...labels }));

const reasonOf = (kind: CollabFailure, texts: NuiCollabMessages): string => {
  switch (kind) {
    case CollabFailure.Schema:
      return texts.failureSchema;
    case CollabFailure.Invalid:
      return texts.failureInvalid;
    case CollabFailure.Protocol:
      return texts.failureProtocol;
    case CollabFailure.Diverged:
      return texts.failureDiverged;
    case CollabFailure.Document:
      return texts.failureDocument;
  }
};

const reason = computed(() => reasonOf(failure.reason, text.value));

const outcome = computed(() =>
  failure.unsent > 0
    ? text.value.failureUnsent({ count: failure.unsent })
    : text.value.failureReadOnly,
);

const canRejoin = computed(() => failure.reason !== CollabFailure.Schema);
</script>
