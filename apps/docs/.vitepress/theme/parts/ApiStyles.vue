<template>
  <div class="nui-flex nui-flex-col nui-gap-2">
    <h4>{{ texts.apiStyles }}</h4>
    <NuiCode :code="`import '${styles.import}';`" language="ts" />
    <dl v-for="block in styles.blocks" :key="block.name" class="nui-flex nui-flex-col nui-gap-1">
      <dt>
        <code>.{{ block.name }}</code>
      </dt>
      <dd v-if="block.parts.length > 0" class="nui-flex nui-wrap nui-items-center nui-gap-1">
        <span class="nui-text-muted nui-text-sm">{{ texts.apiParts }}:</span>
        <NuiBadge
          v-for="part in block.parts"
          :key="part"
          variant="outline"
          tone="neutral"
          size="sm"
        >
          __{{ part }}
        </NuiBadge>
      </dd>
      <dd v-if="block.modifiers.length > 0" class="nui-flex nui-wrap nui-items-center nui-gap-1">
        <span class="nui-text-muted nui-text-sm">{{ texts.apiModifiers }}:</span>
        <NuiBadge
          v-for="modifier in block.modifiers"
          :key="modifier"
          variant="outline"
          tone="neutral"
          size="sm"
        >
          --{{ modifier }}
        </NuiBadge>
      </dd>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { NuiBadge, NuiCode } from '@numior/vue';
import type { ApiStylesProps } from '../theme.types';

const { styles, texts } = defineProps<ApiStylesProps>();
</script>
