<template>
  <div class="flex flex-col gap-2">
    <h4>{{ texts.apiStyles }}</h4>
    <NuiCode :code="`import '${styles.import}';`" language="ts" />
    <ApiCodeList :label="texts.apiClasses" prefix="." :items="classes" />
    <ApiCodeList
      v-if="styles.tokens.length > 0"
      :label="texts.apiTokens"
      prefix=""
      :items="styles.tokens"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiCode } from '@numior/vue';
import type { ApiStylesProps } from '../theme.types';
import ApiCodeList from './ApiCodeList.vue';

const { styles, texts } = defineProps<ApiStylesProps>();

const classes = computed(() => styles.blocks.map((block) => block.name));
</script>
