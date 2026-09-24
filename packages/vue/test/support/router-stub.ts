import { defineComponent, h, markRaw } from 'vue';

export const RouterStub = markRaw(
  defineComponent({
    props: { to: { type: String, required: true } },
    setup(props, { slots }) {
      return () => h('a', { href: `/router${props.to}` }, slots.default?.());
    },
  }),
);
