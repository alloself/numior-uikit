<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      class="nui-editor"
      :class="[
        `nui-editor--size-${size}`,
        {
          'nui-editor--invalid': isInvalid,
          'nui-editor--disabled': isDisabled,
          'nui-editor--readonly': isReadonly,
          'nui-editor--empty': empty,
        },
      ]"
    >
      <NuiContent
        v-if="!ready"
        class="nui-editor__content nui-editor__static"
        :document="initial"
        :schema="schema"
      />
      <div
        ref="content"
        class="nui-content nui-editor__content"
        :hidden="!ready"
        v-bind="{ ...contentAttrs, ...attrs }"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { contentSchema, NuiContent } from '@numior/content';
import {
  baseKeymap,
  createEmptyDoc,
  createState,
  fromJSON,
  history,
  inputRules,
  isEmptyDoc,
  keymap,
  markdownRules,
  toJSON,
  type Doc,
  type DocJSON,
  type EditorState,
  type Transaction,
} from '@numior/editor-core';
import { createEditorView, type EditorView } from '@numior/editor-core/view';
import { useFieldControl } from '@numior/primitives';
import { NuiFieldFrame } from '@numior/vue';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toRaw,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue';
import type { NuiEditorApi, NuiEditorProps } from './editor.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  readonly = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
  schema = contentSchema,
  placeholder,
  autofocus = false,
} = defineProps<NuiEditorProps>();

const document = defineModel<DocJSON | undefined>('document');

const emit = defineEmits<{
  change: [document: DocJSON];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();

const attrs = useAttrs();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
  field,
  frame: fieldFrame,
} = useFieldControl(() => ({
  id,
  disabled,
  readonly,
  required,
  invalid,
  label,
  description,
  error,
}));

const contentElement = useTemplateRef<HTMLElement>('content');

const plugins = [inputRules(markdownRules), keymap(baseKeymap), history()];

const docOf = (json: DocJSON | undefined): Doc => {
  const read = json === undefined ? undefined : fromJSON(schema, json);

  return read?.ok === true ? read.doc : createEmptyDoc(schema);
};

const initial = docOf(document.value === undefined ? undefined : toRaw(document.value));
const ready = ref(false);
const empty = ref(isEmptyDoc(initial));
let view: EditorView | undefined;
let written: DocJSON | undefined = document.value === undefined ? undefined : toRaw(document.value);

const editable = computed(() => !isDisabled.value && !isReadonly.value);

const contentAttrs = computed(() => ({
  id: controlAttrs.value.id,
  'aria-labelledby': field.value?.labelledBy.value,
  'aria-describedby': controlAttrs.value['aria-describedby'],
  'aria-invalid': controlAttrs.value['aria-invalid'],
  'aria-required': controlAttrs.value.required || undefined,
  'aria-readonly': isReadonly.value || undefined,
  'aria-disabled': isDisabled.value || undefined,
  'aria-placeholder': placeholder,
}));

const publish = (state: EditorState): void => {
  written = toJSON(state.doc);
  empty.value = isEmptyDoc(state.doc);
  document.value = written;
  emit('change', written);
};

const dispatch = (tr: Transaction): void => {
  if (view === undefined) {
    return;
  }
  const applied = view.state.applyTransaction(tr);

  view.update(applied.state);
  if (applied.transactions.some((step) => step.changed)) {
    publish(applied.state);
  }
};

const run: NuiEditorApi['run'] = (command) => view !== undefined && command(view.state, dispatch);

const editor: NuiEditorApi = {
  state: () => view?.state,
  run,
  focus: () => view?.focus(),
};

watch(document, (value) => {
  const json = value === undefined ? undefined : toRaw(value);

  if (view === undefined || json === written) {
    return;
  }
  const doc = docOf(json);

  written = json;
  empty.value = isEmptyDoc(doc);
  view.update(createState({ doc, plugins }));
});

watch(editable, (value) => {
  view?.setEditable(value);
});

onMounted(() => {
  const element = contentElement.value;

  if (element === null) {
    return;
  }

  view = createEditorView(element, {
    state: createState({ doc: initial, plugins }),
    editable: editable.value,
    dispatch,
  });

  ready.value = true;
  if (autofocus) {
    view.focus();
  }
});

onBeforeUnmount(() => {
  view?.destroy();
  view = undefined;
});

defineExpose({ editor });
</script>
