import { mount, renderToString } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vite-plus/test';
import type { RemotePeer } from '../../src';
import { NuiCollabCarets, NuiCollabPresence } from '../../src/vue';
import type { NuiEditorApi } from '@numior/editor-vue';

const peer = (clientId: string, head: number | undefined, name = clientId): RemotePeer => ({
  clientId,
  user: { id: name, name },
  colour: 2,
  anchor: head,
  head,
});

const BOX = new DOMRect(0, 0, 400, 100);

const fakeEditor = (
  coords: (pos: number) => ReturnType<NuiEditorApi['coordsAt']>,
): NuiEditorApi => ({
  state: () => undefined,
  run: () => false,
  focus: () => undefined,
  flush: () => undefined,
  coordsAt: coords,
  contentBox: () => BOX,
  revealNode: () => undefined,
});

const caretRect = (left: number, top: number) => ({
  left,
  right: left,
  top,
  bottom: top + 18,
});

describe('NuiCollabCarets', () => {
  it('names only peers with a position', () => {
    const wrapper = mount(NuiCollabCarets, {
      props: { peers: [peer('ann', 3), peer('bob', undefined)] },
    });

    expect(wrapper.findAll('.nui-collab-carets__flag').map((flag) => flag.text())).toEqual(['ann']);
  });

  it('places a caret at the editor coordinates once peers change', async () => {
    const editor = fakeEditor(() => caretRect(40, 30));
    const wrapper = mount(NuiCollabCarets, { props: { peers: [], editor } });

    await wrapper.setProps({ peers: [peer('ann', 3)] });

    const style = wrapper.find<HTMLElement>('.nui-collab-carets__caret').element.style;

    expect(style.transform).toBe('translate(40px, 30px)');
    expect(style.opacity).toBe('1');
    expect(style.getPropertyValue('--_height')).toBe('18px');
    expect(style.getPropertyValue('--_flag-shift')).toBe('0');
  });

  it('keeps the flag inside the layer at the end of a line', async () => {
    const editor = fakeEditor(() => caretRect(40, 30));
    const wrapper = mount(NuiCollabCarets, { props: { peers: [], editor } });

    await wrapper.setProps({ peers: [peer('ann', 3)] });

    const style = wrapper.find<HTMLElement>('.nui-collab-carets__caret').element.style;

    expect(style.getPropertyValue('--_flag-x')).toBe('-40px');
  });

  it('turns the flag down at the top edge', async () => {
    const editor = fakeEditor(() => caretRect(40, 4));
    const wrapper = mount(NuiCollabCarets, { props: { peers: [], editor } });

    await wrapper.setProps({ peers: [peer('ann', 3)] });

    const style = wrapper.find<HTMLElement>('.nui-collab-carets__caret').element.style;

    expect(style.getPropertyValue('--_flag-shift')).toBe('calc(100% + 18px)');
  });

  it('hides a caret outside the visible content', async () => {
    const editor = fakeEditor(() => caretRect(40, 300));
    const wrapper = mount(NuiCollabCarets, { props: { peers: [], editor } });

    await wrapper.setProps({ peers: [peer('ann', 3)] });
    await nextTick();

    expect(wrapper.find<HTMLElement>('.nui-collab-carets__caret').element.style.opacity).toBe('0');
  });

  it('renders on the server without an editor', async () => {
    const html = await renderToString(NuiCollabCarets, { props: { peers: [peer('ann', 3)] } });

    expect(html).toContain('nui-collab-carets');
  });
});

describe('NuiCollabPresence', () => {
  it('shows one avatar per user', () => {
    const wrapper = mount(NuiCollabPresence, {
      props: { peers: [peer('tab1', 1, 'Ann'), peer('tab2', 2, 'Ann'), peer('tab3', 3, 'Bob')] },
    });

    expect(wrapper.findAll('.nui-avatar')).toHaveLength(2);
  });

  it('labels the group from the catalog and a prop', async () => {
    const wrapper = mount(NuiCollabPresence, { props: { peers: [peer('a', 1)] } });

    expect(wrapper.attributes('aria-label')).toBe('People in this document');

    await wrapper.setProps({ label: 'Here' });

    expect(wrapper.attributes('aria-label')).toBe('Here');
  });

  it('renders on the server', async () => {
    const html = await renderToString(NuiCollabPresence, { props: { peers: [peer('a', 1)] } });

    expect(html).toContain('nui-avatar');
  });
});
