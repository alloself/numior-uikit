<template>
  <div class="flex flex-col gap-2">
    <h4>{{ texts.apiStyles }}</h4>
    <NuiCode :code="`import '${styles.import}';`" :tokens="styles.importTokens" language="ts" />
  </div>
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/vue';
import type { ApiStylesProps } from '../theme.types';

const { styles, texts } = defineProps<ApiStylesProps>();
</script>
