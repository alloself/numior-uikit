import { defineComponent, h, markRaw } from 'vue';

const linkStub = (prefix: string) =>
  markRaw(
    defineComponent({
      props: { to: { type: String, required: true } },
      setup(props, { slots }) {
        return () => h('a', { href: `${prefix}${props.to}` }, slots.default?.());
      },
    }),
  );

export const RouterStub = linkStub('/router');

export const ConfiguredLinkStub = linkStub('/configured');
