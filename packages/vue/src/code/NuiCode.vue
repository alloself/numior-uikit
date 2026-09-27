<template>
  <figure
    class="nui-code"
    :class="{
      'nui-code--line-numbers': lineNumbers,
      'nui-code--wrap': wrap,
      'nui-code--titled': hasHeader,
      'nui-code--collapsible': collapsible,
      'nui-code--collapsed': collapsible && !expanded,
      'nui-code--copied': clipboard.copied.value,
    }"
    :style="{ '--_max-lines': maxLines }"
  >
    <figcaption v-if="hasHeader" class="nui-code__header">
      <span v-if="title" class="nui-code__title">{{ title }}</span>
      <span v-else class="nui-code__language">{{ language }}</span>
      <NuiCodeCopy v-if="copyable" :label="copyText" @copy="copy" />
    </figcaption>
    <div ref="body" class="nui-code__body">
      <div class="nui-code__pre" tabindex="0">
        <code class="nui-code__code">
          <NuiCodeRow
            v-for="(line, index) in lines"
            :key="index"
            :tokens="line"
            :highlighted="highlighted.has(index + 1)"
          />
        </code>
      </div>
      <NuiCodeCopy v-if="copyable && !hasHeader" :label="copyText" floating @copy="copy" />
    </div>
    <button
      v-if="collapsible"
      type="button"
      class="nui-code__expand"
      :aria-expanded="expanded ? 'true' : 'false'"
      @click="expanded = !expanded"
    >
      <NuiIcon alias="chevron-down" class="nui-code__expand-icon" />
      {{ expanded ? texts.collapse : texts.expand }}
    </button>
    <span class="nui-code__status" role="status" aria-live="polite">{{
      clipboard.copied.value ? texts.copied : ''
    }}</span>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useBlockSizeTween, useClipboard, useMessages } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiCodeCopy from './NuiCodeCopy.vue';
import NuiCodeRow from './NuiCodeRow.vue';
import { codeLines } from './code-lines';
import { codeMessages } from './code.messages';
import type { NuiCodeProps } from './code.types';

const {
  code,
  tokens,
  language,
  title,
  lineNumbers = false,
  highlight,
  copyable = true,
  maxLines,
  wrap = false,
  copyLabel,
  copiedLabel,
  expandLabel,
  collapseLabel,
} = defineProps<NuiCodeProps>();

const expanded = ref(false);
const clipboard = useClipboard();
const messages = useMessages(codeMessages);
const body = useTemplateRef<HTMLElement>('body');

const texts = computed(() => ({
  copy: copyLabel ?? messages.value.copy,
  copied: copiedLabel ?? messages.value.copied,
  expand: expandLabel ?? messages.value.expand,
  collapse: collapseLabel ?? messages.value.collapse,
}));

const lines = computed(() => codeLines(code, tokens));
const highlighted = computed(() => new Set(highlight ?? []));
const hasHeader = computed(() => title !== undefined || language !== undefined);
const collapsible = computed(() => maxLines !== undefined && lines.value.length > maxLines);
const copyText = computed(() => (clipboard.copied.value ? texts.value.copied : texts.value.copy));

const copy = (): void => {
  void clipboard.copy(code);
};

useBlockSizeTween(body);
</script>
