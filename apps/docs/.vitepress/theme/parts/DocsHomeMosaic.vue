<template>
  <div class="nui-flex nui-flex-col nui-gap-4">
    <NuiCard>
      <NuiCardHeader>
        <NuiCardTitle>{{ content.title }}</NuiCardTitle>
        <NuiCardDescription>{{ content.description }}</NuiCardDescription>
      </NuiCardHeader>
      <NuiCardContent>
        <form class="nui-flex nui-flex-col nui-gap-3" @submit.prevent>
          <NuiInput v-model="name" :label="content.name" :placeholder="content.namePlaceholder" />
          <NuiSelect v-model="team" :label="content.team" :options="content.teams" />
          <NuiSwitch v-model="shared" :label="content.shared" />
        </form>
      </NuiCardContent>
      <NuiCardFooter>
        <div class="nui-flex nui-wrap nui-justify-end nui-gap-2 nui-w-full">
          <NuiButton variant="ghost" tone="neutral">{{ content.cancel }}</NuiButton>
          <NuiButton>{{ content.create }}</NuiButton>
        </div>
      </NuiCardFooter>
    </NuiCard>
    <div class="nui-flex nui-wrap nui-items-center nui-justify-between nui-gap-3">
      <NuiToggleGroup
        v-model="period"
        :items="content.periods"
        :label="content.period"
        variant="segmented"
        size="sm"
      />
      <NuiAvatarGroup :items="people" :max="3" size="sm" :label="content.members" />
    </div>
    <div class="nui-flex nui-flex-col nui-gap-2">
      <div class="nui-flex nui-justify-between nui-gap-3 nui-text-sm">
        <span>{{ content.release }}</span>
        <span class="nui-text-muted">{{ content.releaseValue }}%</span>
      </div>
      <NuiProgress :value="content.releaseValue" :label="content.release" size="sm" />
    </div>
    <div class="nui-flex nui-wrap nui-gap-2">
      <NuiChip v-for="tag in content.tags" :key="tag.text" :tone="tag.tone" variant="soft">{{
        tag.text
      }}</NuiChip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAvatarGroup,
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiChip,
  NuiInput,
  NuiProgress,
  NuiSelect,
  NuiSwitch,
  NuiToggleGroup,
} from '@numior/vue';
import type { HomeMosaicProps } from '../theme.types';

const { content } = defineProps<HomeMosaicProps>();

const name = ref('');
const team = ref<string | null>('web');
const shared = ref(true);
const period = ref<string | null>('month');
const people = content.people.map((person) => ({ name: person }));
</script>
