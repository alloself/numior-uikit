import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  createMetaKey,
  decorationSet,
  definePlugin,
  widgetDecoration,
  type InputIntent,
  type Plugin,
  type WidgetDecoration,
} from '../src';
import { fixtureSchema } from '../src/fixtures';
import { EditorViewDriver } from './drivers/view';
import { buildWith } from './support/notes';

const { doc, node } = buildWith(fixtureSchema);

const place = createMetaKey<readonly WidgetDecoration[]>('place');

const placing = (initial: readonly WidgetDecoration[]): Plugin<readonly WidgetDecoration[]> => {
  const plugin: Plugin<readonly WidgetDecoration[]> = definePlugin<readonly WidgetDecoration[]>({
    name: 'placing',
    state: {
      init: () => initial,
      apply: (tr, value) =>
        tr.getMeta(place) ??
        value.map((widget) => ({ ...widget, pos: tr.mapping.map(widget.pos, 1) })),
    },
    props: { decorations: (state) => decorationSet([], [], plugin.getState(state) ?? []) },
  });

  return plugin;
};

const intents: InputIntent[] = [];

const catching: Plugin = definePlugin({
  name: 'catching',
  props: {
    handleIntent: (intent) => {
      intents.push(intent);
      return intent.kind === 'files';
    },
  },
});

const elements = new Map<string, HTMLElement>();

const widget = (key: string): HTMLElement => {
  const known = elements.get(key) ?? document.createElement('aside');

  known.textContent = key;
  elements.set(key, known);
  return known;
};

let driver: EditorViewDriver | undefined;

const mounted = (
  root: ReturnType<typeof doc>,
  widgets: readonly WidgetDecoration[],
): EditorViewDriver => {
  driver = EditorViewDriver.mount(root, fixtureSchema, [placing(widgets), catching], {}, widget);
  return driver;
};

const twoParagraphs = () => doc(node('paragraph', ['One']), node('paragraph', ['Two']));

afterEach(() => {
  driver?.destroy();
  driver = undefined;
  elements.clear();
  intents.length = 0;
});

describe('editor view widgets', () => {
  it('places widgets between blocks without touching the document or the positions', () => {
    const view = mounted(twoParagraphs(), [widgetDecoration(5, 'a'), widgetDecoration(10, 'b')]);

    expect(view.markup).toBe(
      '<p>One</p><aside contenteditable="false">a</aside><p>Two</p><aside contenteditable="false">b</aside>',
    );

    expect(view.modelTexts).toEqual(['One', 'Two']);
    expect([1, 4, 6, 9].map((pos) => view.roundTrip(pos))).toEqual([1, 4, 6, 9]);
  });

  it('moves widgets with their places, keeps their order and removes the ones that go', () => {
    const view = mounted(twoParagraphs(), [widgetDecoration(5, 'a'), widgetDecoration(5, 'b')]);

    view.change((tr) => tr.insert(0, [fixtureSchema.element('divider', { id: tr.newId() })]));

    expect(view.markup).toBe(
      '<hr contenteditable="false"><p>One</p><aside contenteditable="false">a</aside><aside contenteditable="false">b</aside><p>Two</p>',
    );

    view.change((tr) => tr.setMeta(place, [widgetDecoration(6, 'b')]));

    expect(view.markup).toBe(
      '<hr contenteditable="false"><p>One</p><aside contenteditable="false">b</aside><p>Two</p>',
    );
  });

  it('places widgets inside nested containers and skips places inside text', () => {
    const view = mounted(
      doc(node('blockquote', [node('paragraph', ['Quote'])]), node('paragraph', ['After'])),
      [widgetDecoration(8, 'inside'), widgetDecoration(3, 'text')],
    );

    expect(view.markup).toBe(
      '<blockquote><p>Quote</p><aside contenteditable="false">inside</aside></blockquote><p>After</p>',
    );
  });

  it('reads nothing that happens inside a widget as an edit', async () => {
    const view = mounted(twoParagraphs(), [widgetDecoration(5, 'a')]);

    elements.get('a')?.append(' changed');

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(view.modelTexts).toEqual(['One', 'Two']);
    expect(view.markup).toContain('<aside contenteditable="false">a changed</aside>');
  });

  it('hands pasted files to the plugins and keeps text pastes as they were', () => {
    const view = mounted(twoParagraphs(), []);
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    view.focus();

    expect(view.pasteFiles([file])).toBe(true);
    expect(intents).toEqual([{ kind: 'files', files: [file] }]);

    view.pasteFiles([file], 'caption');

    expect(intents.at(-1)).toEqual({ kind: 'paste', text: 'caption', html: '' });
  });

  it('takes files dropped on a widget instead of letting the browser open them', () => {
    const view = mounted(twoParagraphs(), [widgetDecoration(5, 'a')]);
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    expect(view.dropFilesOn(elements.get('a'), [file])).toBe(true);
    expect(intents).toEqual([{ kind: 'files', files: [file] }]);
  });
});
