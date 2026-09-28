import { Fragment, h, type FunctionalComponent, type Slot, type VNode } from 'vue';
import type { FieldContext } from '@numior/primitives';
import NuiFieldDescription from './NuiFieldDescription.vue';
import NuiFieldError from './NuiFieldError.vue';
import NuiFieldLabel from './NuiFieldLabel.vue';
import type { NuiFieldFrameProps } from './field.types';

type Part = Slot | (() => string) | undefined;

const single = (nodes: VNode[]): VNode => {
  const [first] = nodes;

  return nodes.length === 1 && first !== undefined ? first : h(Fragment, nodes);
};

const partOf = (slot: Slot | undefined, text: string | undefined): Part =>
  slot ?? (text ? () => text : undefined);

const classesOf = (props: NuiFieldFrameProps, field: FieldContext) => ({
  'nui-field--group': props.group === true,
  'nui-field--inline': props.inline === true,
  'nui-field--invalid': field.invalid.value,
  'nui-field--required': field.required.value,
  'nui-field--disabled': field.disabled.value,
  'nui-field--readonly': field.readonly.value,
  'nui-field--reserve-error': props.reserveError === true,
});

const trailingOf = (props: NuiFieldFrameProps, error: Part): VNode | null => {
  if (error !== undefined) {
    return h(NuiFieldError, { field: props.field }, error);
  }
  return props.reserveError === true
    ? h('span', { class: 'nui-field__reserve', 'aria-hidden': 'true' })
    : null;
};

const NuiFieldFrame: FunctionalComponent<NuiFieldFrameProps> = (props, { slots }) => {
  const content = slots.default?.() ?? [];

  if (!props.own) {
    return single(content);
  }
  const { field } = props;
  const label = props.inline === true ? undefined : partOf(slots.label, props.label);
  const description = partOf(slots.description, props.description);
  const group = props.group === true;

  return h(
    group ? 'fieldset' : 'div',
    {
      class: ['nui-field', classesOf(props, field)],
      disabled: group && field.disabled.value ? true : undefined,
    },
    [
      label === undefined ? null : h(NuiFieldLabel, { field }, label),
      ...content,
      description === undefined ? null : h(NuiFieldDescription, { field }, description),
      trailingOf(props, partOf(slots.error, props.error)),
    ],
  );
};

NuiFieldFrame.props = [
  'field',
  'own',
  'label',
  'description',
  'error',
  'reserveError',
  'group',
  'inline',
];

export default NuiFieldFrame;
