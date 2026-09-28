<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>{{ content.title }}</NuiCardTitle>
      <NuiCardDescription>{{ content.description }}</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <form class="flex flex-col gap-3" @submit.prevent>
        <NuiInput v-model="name" :label="content.name" :placeholder="content.namePlaceholder" />
        <NuiSelect v-model="team" :label="content.team" :options="content.teams" />
        <NuiSwitch v-model="shared" :label="content.shared" />
      </form>
    </NuiCardContent>
    <NuiCardFooter>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <NuiButton variant="ghost" tone="neutral">{{ content.cancel }}</NuiButton>
        <NuiButton>{{ content.create }}</NuiButton>
      </div>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiInput,
  NuiSelect,
  NuiSwitch,
} from '@numior/vue';
import type { HomeMosaicProps } from '../theme.types';

const { content } = defineProps<HomeMosaicProps>();

const name = ref('');
const team = ref<string | null>('web');
const shared = ref(true);
</script>
