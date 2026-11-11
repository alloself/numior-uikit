<template>
  <NuiCard v-bind="card" @click="countAction">
    <NuiCardMedia v-if="parts.media" v-bind="parts.media" />
    <NuiCardHeader v-if="parts.title !== undefined || parts.description !== undefined">
      <NuiCardTitle v-if="parts.title !== undefined" :as="parts.titleAs">
        {{ parts.title }}
      </NuiCardTitle>
      <NuiCardDescription v-if="parts.description !== undefined">
        {{ parts.description }}
      </NuiCardDescription>
      <template v-if="parts.actions" #actions>
        <button type="button" class="nested" @click="nested += 1">More</button>
      </template>
    </NuiCardHeader>
    <NuiCardContent v-if="parts.content !== undefined" :lines="parts.contentLines">
      {{ parts.content }}
    </NuiCardContent>
    <NuiCardFooter v-if="parts.footer !== undefined">{{ parts.footer }}</NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
  type NuiCardProps,
} from '../../src';
import type { CardParts } from '../drivers/card';

const { card, parts } = defineProps<{ card: NuiCardProps; parts: CardParts }>();

const clicks = ref(0);

const nested = ref(0);

const countAction = (event: MouseEvent): void => {
  if (!(event.target instanceof Element) || event.target.closest('.nui-card__action') === null) {
    return;
  }

  clicks.value += 1;
};

defineExpose({ clicks, nested });
</script>
