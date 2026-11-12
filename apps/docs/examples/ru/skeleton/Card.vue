<template>
  <div class="flex w-full max-w-xs flex-col gap-4">
    <NuiSwitch v-model="loading">Загрузка</NuiSwitch>
    <NuiCard :aria-busy="loading">
      <NuiCardMedia :src="loading ? undefined : PHOTO" alt="Кресло «Осло»" aspect="4 / 3">
        <NuiSkeleton shape="rect" height="100%" />
      </NuiCardMedia>
      <NuiCardHeader>
        <NuiCardTitle>
          <NuiSkeleton v-if="loading" width="60%" />
          <template v-else>Кресло «Осло»</template>
        </NuiCardTitle>
        <NuiCardDescription>
          <NuiSkeleton v-if="loading" width="45%" />
          <template v-else>18 900 ₽, на складе 12 шт.</template>
        </NuiCardDescription>
      </NuiCardHeader>
      <NuiCardContent>
        <NuiSkeleton v-if="loading" :lines="2" />
        <template v-else>Каркас из массива дуба, чехол снимается и стирается.</template>
      </NuiCardContent>
    </NuiCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
  NuiSkeleton,
  NuiSwitch,
} from '@numior/vue';

const DRAWING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#ece4da"/>
  <ellipse cx="200" cy="254" rx="118" ry="10" fill="#5b4433" opacity="0.15"/>
  <rect x="122" y="205" width="10" height="46" rx="3" fill="#5b4433"/>
  <rect x="268" y="205" width="10" height="46" rx="3" fill="#5b4433"/>
  <rect x="132" y="66" width="136" height="116" rx="24" fill="#8a6a52"/>
  <rect x="112" y="162" width="176" height="48" rx="14" fill="#9c7a60"/>
  <rect x="98" y="128" width="38" height="84" rx="16" fill="#7d5f49"/>
  <rect x="264" y="128" width="38" height="84" rx="16" fill="#7d5f49"/>
</svg>`;

const PHOTO = `data:image/svg+xml,${encodeURIComponent(DRAWING)}`;

const loading = ref(true);
</script>
