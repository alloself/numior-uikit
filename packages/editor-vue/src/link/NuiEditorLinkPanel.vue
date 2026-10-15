<template>
  <div
    ref="content"
    class="nui-popover nui-editor-link"
    role="dialog"
    :aria-label="texts.link"
    v-bind="contentAttrs"
    @toggle="onToggle"
  >
    <form class="nui-editor-link__form" @submit.prevent="apply">
      <NuiField :label="texts.linkAddress" :error="invalid ? texts.linkInvalid : undefined">
        <NuiInput
          v-model="draft"
          size="sm"
          placeholder="https://"
          autocomplete="url"
          @keydown="onKeydown"
          @update:model-value="invalid = false"
        />
      </NuiField>
      <div class="nui-editor-link__actions">
        <NuiButton
          v-if="removable"
          variant="ghost"
          tone="neutral"
          size="sm"
          @click="emit('remove')"
          >{{ texts.linkRemove }}</NuiButton
        >
        <NuiButton type="submit" size="sm">{{ texts.linkApply }}</NuiButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useFloating, useMessages, usePopover } from '@numior/primitives';
import { NuiButton, NuiField, NuiInput } from '@numior/vue';
import { ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { NuiEditorLinkPanelProps } from './link.types';

const { anchor, href, removable, valid } = defineProps<NuiEditorLinkPanelProps>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  apply: [href: string];
  remove: [];
  cancel: [];
}>();

const content = useTemplateRef<HTMLElement>('content');
const texts = useMessages(editorMessages);
const draft = ref(href);
const invalid = ref(false);

const { contentAttrs } = usePopover(content, { open, mode: 'auto' });

useFloating(() => anchor, content, { placement: 'bottom-start', offset: 8, enabled: open });

const apply = (): void => {
  const value = draft.value.trim();

  if (value === '') {
    emit('remove');
  } else if (valid(value)) {
    emit('apply', value);
  } else {
    invalid.value = true;
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('cancel');
  }
};

watch(open, (value) => {
  if (value) {
    draft.value = href;
    invalid.value = false;
  }
});

const onToggle = (event: Event): void => {
  if ('newState' in event && event.newState === 'open') {
    content.value?.querySelector('input')?.focus();
  }
};
</script>
