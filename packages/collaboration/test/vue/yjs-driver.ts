import {
  ContentNodeKind,
  textSelection,
  toJSON,
  type ContentNode,
  type Doc,
  type DocJSON,
  type EditorState,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import type { NuiEditorApi } from '@numior/editor-vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { markRaw } from 'vue';
import { applyUpdate, Doc as YDoc, encodeStateAsUpdate, encodeStateVector } from 'yjs';
import { yjsBinding } from '../../src/yjs';
import YjsHost from './YjsHost.vue';

Element.prototype.scrollIntoView = () => undefined;

const NAME = 'document';

const isApi = (value: unknown): value is NuiEditorApi =>
  typeof value === 'object' && value !== null && 'run' in value && 'state' in value;

const textOf = (node: ContentNode): string =>
  node.kind === ContentNodeKind.Text ? node.text : node.content.map(textOf).join('');

const seeded = (doc: Doc): YDoc => {
  const ydoc = new YDoc();

  const seeder = yjsBinding(ydoc, NAME, {
    schema: fixtureSchema,
    getState: () => undefined,
    dispatch: () => undefined,
  });

  seeder.seed(doc);
  seeder.destroy();
  return ydoc;
};

const copyOf = (source: YDoc): YDoc => {
  const ydoc = new YDoc();

  applyUpdate(ydoc, encodeStateAsUpdate(source));
  return ydoc;
};

class YjsEditorDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    readonly ydoc: YDoc,
  ) {}

  static mount(ydoc: YDoc): YjsEditorDriver {
    const wrapper = mount(YjsHost, { attachTo: document.body, props: { ydoc: markRaw(ydoc) } });

    return new YjsEditorDriver(wrapper, ydoc);
  }

  private get api(): NuiEditorApi {
    const exposed: unknown = Reflect.get(
      this.wrapper.findComponent({ name: 'NuiEditor' }).vm,
      'editor',
    );

    if (!isApi(exposed)) {
      throw new Error('The editor exposes no API');
    }
    return exposed;
  }

  private get state(): EditorState {
    const state = this.api.state();

    if (state === undefined) {
      throw new Error('The editor has no state');
    }
    return state;
  }

  private get content(): HTMLElement {
    const content = this.wrapper.find('[contenteditable]').element;

    if (!(content instanceof HTMLElement)) {
      throw new Error('The editor shows no text');
    }
    return content;
  }

  private async place(at: number): Promise<void> {
    this.api.focus();

    this.api.run((state, dispatch) => {
      dispatch?.(state.tr.setSelection(textSelection(at)));
      return true;
    });

    await flushPromises();
  }

  async placeAtStart(id: string): Promise<void> {
    await this.place((this.state.doc.positionOf(id) ?? 0) + 1);
  }

  async placeAtEnd(id: string): Promise<void> {
    const { doc } = this.state;

    await this.place((doc.positionOf(id) ?? 0) + (doc.byId(id)?.size ?? 2) - 1);
  }

  private input(inputType: string, data: string | null = null): void {
    this.content.dispatchEvent(
      new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }),
    );
  }

  async type(text: string): Promise<void> {
    for (const data of text) {
      this.input('insertText', data);
    }

    await flushPromises();
  }

  async enter(): Promise<void> {
    this.input('insertParagraph');

    await flushPromises();
  }

  async press(key: string, ctrl = false): Promise<void> {
    this.content.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        ctrlKey: ctrl,
        bubbles: true,
        cancelable: true,
      }),
    );

    await flushPromises();
  }

  async undo(): Promise<void> {
    await this.press('z', true);
  }

  get texts(): readonly string[] {
    return this.state.doc.root.content.map(textOf);
  }

  get shownText(): string {
    return this.content.textContent ?? '';
  }

  get blockIds(): readonly string[] {
    return this.state.doc.root.content.flatMap((node) =>
      node.kind === ContentNodeKind.Element ? [node.id] : [],
    );
  }

  get document(): DocJSON {
    return toJSON(this.state.doc);
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

export class YjsRoomDriver {
  private constructor(
    readonly left: YjsEditorDriver,
    readonly right: YjsEditorDriver,
  ) {}

  static async open(doc: Doc): Promise<YjsRoomDriver> {
    const shared = seeded(doc);

    const room = new YjsRoomDriver(
      YjsEditorDriver.mount(copyOf(shared)),
      YjsEditorDriver.mount(copyOf(shared)),
    );

    await flushPromises();
    return room;
  }

  async send(from: YjsEditorDriver, to: YjsEditorDriver): Promise<void> {
    applyUpdate(to.ydoc, encodeStateAsUpdate(from.ydoc, encodeStateVector(to.ydoc)));

    await flushPromises();
  }

  async exchange(): Promise<void> {
    await this.send(this.left, this.right);
    await this.send(this.right, this.left);
  }

  close(): void {
    this.left.unmount();
    this.right.unmount();
  }
}
