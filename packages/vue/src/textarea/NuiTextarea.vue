<script lang="ts">
import {
  defineComponent,
  h,
  mergeProps,
  ref,
  useModel,
  vModelText,
  withDirectives,
  type PropType,
} from 'vue';
import { useFieldControl } from '@numior/primitives';
import { textareaProps, type NuiTextareaModifiers } from './textarea.props';

/** A native textarea; fallthrough attributes land on it directly, v-model comes from Vue. */
export default defineComponent({
  name: 'NuiTextarea',
  props: {
    ...textareaProps,
    modelValue: { type: String, default: '' },
    modelModifiers: { type: Object as PropType<NuiTextareaModifiers>, default: () => ({}) },
  },
  emits: { 'update:modelValue': (value: string) => typeof value === 'string' },
  setup(props, { expose }) {
    const model = useModel(props, 'modelValue');
    const { attrs: fieldAttrs, invalid } = useFieldControl(props);
    const control = ref<HTMLTextAreaElement | null>(null);
    expose({ focus: () => control.value?.focus() });

    return () =>
      withDirectives(
        h(
          'textarea',
          mergeProps(
            { ...fieldAttrs.value },
            {
              ref: control,
              class: 'nui-textarea',
              rows: props.rows,
              readonly: props.readonly || undefined,
              'data-size': props.size,
              'data-resize': props.resize,
              'data-invalid': invalid.value || undefined,
              'onUpdate:modelValue': (value: string) => {
                model.value = value;
              },
            },
          ),
        ),
        [[vModelText, model.value, '', props.modelModifiers]],
      );
  },
});
</script>
