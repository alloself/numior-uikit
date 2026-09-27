<template>
  <div class="nui-flex nui-flex-col nui-gap-2">
    <h4>{{ texts.apiStyles }}</h4>
    <NuiCode :code="`import '${styles.import}';`" language="ts" />
    <dl v-for="block in styles.blocks" :key="block.name" class="nui-flex nui-flex-col nui-gap-1">
      <dt>
        <code>.{{ block.name }}</code>
      </dt>
      <ApiCodeList
        v-if="block.parts.length > 0"
        :label="texts.apiParts"
        prefix="__"
        :items="block.parts"
      />
      <ApiCodeList
        v-if="block.modifiers.length > 0"
        :label="texts.apiModifiers"
        prefix="--"
        :items="block.modifiers"
      />
    </dl>
  </div>
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/vue';
import type { ApiStylesProps } from '../theme.types';
import ApiCodeList from './ApiCodeList.vue';

const { styles, texts } = defineProps<ApiStylesProps>();
</script>
