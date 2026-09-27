<template>
  <div class="nui-flex nui-flex-col nui-gap-2">
    <h4>{{ texts.apiStyles }}</h4>
    <NuiCode :code="`import '${styles.import}';`" language="ts" />
    <dl v-for="block in described" :key="block.name" class="nui-flex nui-flex-col nui-gap-1">
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
    <p v-if="plain.length > 0" class="nui-text-sm">
      <template v-for="(block, index) in plain" :key="block.name">
        <code>.{{ block.name }}</code
        ><span v-if="index < plain.length - 1">, </span>
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiCode } from '@numior/vue';
import type { ApiStylesProps } from '../theme.types';
import ApiCodeList from './ApiCodeList.vue';

const { styles, texts } = defineProps<ApiStylesProps>();

const hasDetails = (block: ApiStylesProps['styles']['blocks'][number]): boolean =>
  block.parts.length > 0 || block.modifiers.length > 0;

const described = computed(() => styles.blocks.filter((block) => hasDetails(block)));
const plain = computed(() => styles.blocks.filter((block) => !hasDetails(block)));
</script>
