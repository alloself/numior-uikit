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
  type VNode,
} from 'vue';
import { useFieldControl, useSplitAttrs } from '@numior/primitives';
import { inputProps, type NuiInputModifiers } from './input.props';

/**
 * A native input inside a wrapper that hosts prefix and suffix content. Vue's own v-model
 * directive owns the DOM value, so IME composition, `lazy` and `trim` behave exactly like
 * `<input v-model>`, on the server as well as during hydration.
 */
export default defineComponent({
  name: 'NuiInput',
  inheritAttrs: false,
  props: {
    ...inputProps,
    modelValue: { type: String, default: '' },
    modelModifiers: { type: Object as PropType<NuiInputModifiers>, default: () => ({}) },
  },
  emits: { 'update:modelValue': (value: string) => typeof value === 'string' },
  setup(props, { slots, expose }) {
    const model = useModel(props, 'modelValue');
    const split = useSplitAttrs();
    const { attrs: fieldAttrs, invalid, disabled } = useFieldControl(props);
    const control = ref<HTMLInputElement | null>(null);
    expose({ focus: () => control.value?.focus() });

    const affix = (name: 'prefix' | 'suffix'): VNode | null => {
      const slot = slots[name];
      return slot ? h('span', { class: `nui-input__${name}` }, slot()) : null;
    };

    return () =>
      h(
        'div',
        mergeProps({ class: 'nui-input' }, split.rootAttrs(), {
          'data-size': props.size,
          'data-invalid': invalid.value || undefined,
          'data-disabled': disabled.value || undefined,
        }),
        [
          affix('prefix'),
          withDirectives(
            h(
              'input',
              mergeProps({ ...fieldAttrs.value }, split.controlAttrs(), {
                ref: control,
                class: 'nui-input__control',
                type: props.type,
                readonly: props.readonly || undefined,
                'onUpdate:modelValue': (value: string) => {
                  model.value = value;
                },
              }),
            ),
            [[vModelText, model.value, '', props.modelModifiers]],
          ),
          affix('suffix'),
        ],
      );
  },
});
</script>
