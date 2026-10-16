import { cloneVNode, defineComponent, h, isVNode, ref, type VNode } from 'vue';

const OPEN = 'nui-content__toggle--open';

const classFor = (value: string | undefined, open: boolean): string =>
  [...(value ?? '').split(' ').filter((token) => token !== '' && token !== OPEN), open ? OPEN : '']
    .filter((token) => token !== '')
    .join(' ');

export const ContentToggle = defineComponent(
  (props: {
    open: boolean;
    attrs: Readonly<Record<string, string>>;
    content: readonly (VNode | string)[];
  }) => {
    const open = ref(props.open);

    const flip = (): void => {
      open.value = !open.value;
    };

    return () => {
      const [button, ...rest] = props.content;

      return h('div', { ...props.attrs, class: classFor(props.attrs.class, open.value) }, [
        isVNode(button)
          ? cloneVNode(button, { 'aria-expanded': String(open.value), onClick: flip })
          : button,
        ...rest,
      ]);
    };
  },
  { props: ['open', 'attrs', 'content'] },
);
