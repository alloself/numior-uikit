<template>
  <NuiPopover
    v-model:open="open"
    lazy
    class="nui-editor-link"
    :anchor="anchor"
    placement="bottom-start"
    :offset="8"
    role="dialog"
    :aria-label="texts.link"
    @toggle="onToggle"
  >
    <form ref="form" class="nui-editor-link__form" @submit.prevent="apply">
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
  </NuiPopover>
</template>

<script setup lang="ts">
import { Key, PopoverState, useMessages } from '@numior/primitives';
import { NuiButton, NuiField, NuiInput, NuiPopover } from '@numior/vue';
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

const form = useTemplateRef<HTMLElement>('form');
const texts = useMessages(editorMessages);
const draft = ref(href);
const invalid = ref(false);

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
  if (event.key !== Key.Escape) {
    return;
  }

  event.preventDefault();
  emit('cancel');
};

watch(open, (value) => {
  if (!value) {
    return;
  }

  draft.value = href;
  invalid.value = false;
});

const onToggle = (event: Event): void => {
  if (!('newState' in event) || event.newState !== PopoverState.Open) {
    return;
  }

  form.value?.querySelector('input')?.focus();
};
</script>
