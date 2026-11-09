<template>
  <section class="nui-collab-history__alternatives" :aria-label="text.alternatives">
    <h3 class="nui-collab-history__subtitle">{{ text.alternatives }}</h3>

    <ul class="nui-collab-history__alternative-list">
      <li v-for="item in items" :key="item.key" class="nui-collab-history__alternative">
        <span class="nui-collab-history__value">{{ item.value }}</span>
        <span class="nui-collab-history__source">{{ item.source }}</span>

        <div class="nui-collab-history__alternative-actions">
          <NuiButton
            size="sm"
            variant="ghost"
            tone="neutral"
            @click="alternatives.apply(item.alternative)"
          >
            {{ text.alternativeRestore }}
          </NuiButton>

          <div class="nui-collab-history__alternative-tools">
            <NuiTooltip placement="bottom">
              <template #trigger="{ attrs }">
                <NuiButton
                  v-bind="attrs"
                  size="sm"
                  variant="ghost"
                  tone="neutral"
                  icon="search"
                  :aria-label="text.alternativeShow"
                  @click="alternatives.reveal(item.alternative)"
                />
              </template>
              {{ text.alternativeShow }}
            </NuiTooltip>

            <NuiTooltip placement="bottom">
              <template #trigger="{ attrs }">
                <NuiButton
                  v-bind="attrs"
                  size="sm"
                  variant="ghost"
                  tone="neutral"
                  icon="x"
                  :aria-label="text.alternativeHide"
                  @click="alternatives.dismiss(item.alternative)"
                />
              </template>
              {{ text.alternativeHide }}
            </NuiTooltip>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/vue';
import type { AttrValue } from '@numior/editor-core';
import { computed } from 'vue';
import type { NuiCollabMessages } from './collab.messages';
import type { NuiEditorAlternativesProps } from './collab.types';

const { alternatives, text, timeOf } = defineProps<NuiEditorAlternativesProps>();

const shown = (value: AttrValue, messages: NuiCollabMessages): string => {
  if (value === null) {
    return messages.alternativeEmpty;
  }
  if (typeof value === 'boolean') {
    return value ? messages.alternativeTrue : messages.alternativeFalse;
  }
  return String(value);
};

const items = computed(() =>
  alternatives.list.value.map((alternative) => ({
    key: `${alternative.version}:${alternative.nodeId}:${alternative.attr}`,
    alternative,
    value: shown(alternative.value, text),
    source: `${alternative.author?.name ?? text.alternativeUnknown}, ${timeOf(alternative.createdAt)}`,
  })),
);
</script>
