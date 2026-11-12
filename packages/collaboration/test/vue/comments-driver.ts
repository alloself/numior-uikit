import { textSelection, undo, type Command } from '@numior/editor-core';
import type { NuiEditorApi } from '@numior/editor-vue';
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import { promiseTimeout } from '@vueuse/core';
import { vi } from 'vite-plus/test';
import { collabProgress, confirmSteps, receiveSteps, type CommentThread } from '../../src';
import type { NuiEditorCommentsProps } from '../../src/vue';
import CommentsHost from './CommentsHost.vue';
import { documentOf, fakeCommentsAdapter, type FakeCommentsAdapter } from './comments-adapter';

Element.prototype.scrollIntoView = () => undefined;

Range.prototype.getClientRects = () => document.createElement('div').getClientRects();

Range.prototype.getBoundingClientRect = () => new DOMRect();

export const ANN = { id: 'ann', name: 'Ann' };

const MARK_POSITION = 2;

const PRESS_X = 40;

const PRESS_Y = 12;

const pointer = (type: string, clientX: number): MouseEvent =>
  new MouseEvent(type, { bubbles: true, clientX, clientY: PRESS_Y });

const namedAs = (button: DOMWrapper<HTMLButtonElement>, name: string): boolean =>
  button.text() === name || button.attributes('aria-label') === name;

const isApi = (value: unknown): value is NuiEditorApi =>
  typeof value === 'object' && value !== null && 'run' in value;

export class CommentsDriver {
  private constructor(
    private readonly wrapper: VueWrapper,
    readonly adapter: FakeCommentsAdapter,
  ) {}

  static mount(
    seed: readonly CommentThread[] = [],
    labels?: NuiEditorCommentsProps['labels'],
    adapter = fakeCommentsAdapter(seed),
    shared = false,
  ): CommentsDriver {
    const wrapper = mount(CommentsHost, {
      attachTo: document.body,
      props: { initial: documentOf('one', 'two'), adapter, user: ANN, labels, shared },
    });

    return new CommentsDriver(wrapper, adapter);
  }

  static mountShared(seed: readonly CommentThread[] = []): CommentsDriver {
    return CommentsDriver.mount(seed, undefined, fakeCommentsAdapter(seed), true);
  }

  async loaded(): Promise<void> {
    await flushPromises();
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

  private buttonNamed(
    name: string,
    scope: Pick<DOMWrapper<Element>, 'findAll'> = this.wrapper,
  ): DOMWrapper<HTMLButtonElement> {
    const found = scope.findAll('button').find((button) => namedAs(button, name));

    if (found === undefined) {
      throw new Error(`No button named ${name}`);
    }
    return found;
  }

  private threadAt(index: number): DOMWrapper<Element> {
    return this.listed('.nui-collab-comments__thread')[index] ?? this.missing(index);
  }

  private listed(selector: string): DOMWrapper<Element>[] {
    return this.wrapper
      .findAll(selector)
      .filter((found) => found.element.closest('.nui-collab-comment-popover') === null);
  }

  private missing(index: number): never {
    throw new Error(`No thread at ${index.toString()}`);
  }

  run(command: Command): void {
    this.api.run(command);
  }

  async pressMark(travel: number): Promise<void> {
    const mark = this.wrapper.find('.nui-editor__comment');
    const editor = this.wrapper.find('.nui-editor');

    document.elementFromPoint = () => mark.element;
    vi.spyOn(this.api, 'posAt').mockReturnValue(MARK_POSITION);

    editor.element.dispatchEvent(pointer('pointerdown', PRESS_X));
    editor.element.dispatchEvent(pointer('pointerup', PRESS_X + travel));
    await promiseTimeout(0);
    await flushPromises();
  }

  async select(from: number, to: number): Promise<void> {
    this.run((state, dispatch) => {
      dispatch?.(state.tr.setSelection(textSelection(from, to)));
      return true;
    });

    await flushPromises();
  }

  async insert(text: string, at: number): Promise<void> {
    this.run((state, dispatch) => {
      dispatch?.(state.tr.insertText(text, at));
      return true;
    });

    await flushPromises();
  }

  async measuresWhile(action: () => Promise<void>): Promise<number> {
    const layer = this.wrapper.find('.nui-collab-comment-layer').element;
    const measured = vi.spyOn(layer, 'getBoundingClientRect');

    await action();

    return measured.mock.calls.length;
  }

  async typedByOther(text: string, at: number): Promise<void> {
    this.run((state, dispatch) => {
      const tr = receiveSteps(state, state.tr.insertText(text, at).steps);

      if (tr !== undefined) {
        dispatch?.(tr);
      }
      return tr !== undefined;
    });

    await flushPromises();
  }

  async confirm(): Promise<void> {
    this.run((state, dispatch) => {
      const progress = collabProgress(state);

      if (progress !== undefined) {
        dispatch?.(confirmSteps(state, progress.pending, progress.version + progress.pending));
      }
      return progress !== undefined;
    });

    await flushPromises();
  }

  async undo(): Promise<void> {
    this.run(undo);
    await flushPromises();
  }

  async removedByOther(from: number, to: number): Promise<void> {
    this.run((state, dispatch) => {
      const tr = receiveSteps(state, state.tr.delete(from, to).steps);

      if (tr !== undefined) {
        dispatch?.(tr);
      }
      return tr !== undefined;
    });

    await flushPromises();
  }

  async remove(from: number, to: number): Promise<void> {
    this.run((state, dispatch) => {
      dispatch?.(state.tr.delete(from, to));
      return true;
    });

    await flushPromises();
  }

  get highlights(): readonly string[] {
    return this.wrapper.findAll('.nui-editor__comment').map((mark) => mark.text());
  }

  get activeHighlights(): readonly string[] {
    return this.wrapper.findAll('.nui-editor__comment--active').map((mark) => mark.text());
  }

  get bodies(): readonly string[] {
    return this.listed('.nui-collab-comments__thread > .nui-collab-comments__body').map((body) =>
      body.text(),
    );
  }

  get replies(): readonly string[] {
    return this.listed('.nui-collab-comments__replies .nui-collab-comments__body').map((body) =>
      body.text(),
    );
  }

  get title(): string {
    return this.wrapper.find('.nui-collab-comments__title').text();
  }

  get failed(): boolean {
    return this.wrapper.find('.nui-alert').exists();
  }

  get addDisabled(): boolean {
    return this.buttonNamed('Add comment').element.disabled;
  }

  get popoverThread(): string {
    return this.wrapper
      .find('.nui-collab-comment-popover .nui-collab-comments__thread > .nui-collab-comments__body')
      .text();
  }

  get popoverOpen(): boolean {
    return this.wrapper.find('.nui-collab-comment-popover .nui-collab-comments__thread').exists();
  }

  get emptyShown(): boolean {
    return this.wrapper.find('.nui-empty').exists();
  }

  badges(index: number): readonly string[] {
    return this.threadAt(index)
      .findAll('.nui-badge')
      .map((badge) => badge.text());
  }

  hasButton(index: number, name: string): boolean {
    return this.threadAt(index)
      .findAll('button')
      .some((button) => namedAs(button, name));
  }

  isActive(index: number): boolean {
    return this.threadAt(index).classes('nui-collab-comments__thread--active');
  }

  async press(name: string): Promise<void> {
    await this.buttonNamed(name).trigger('click');
    await flushPromises();
  }

  async pressIn(index: number, name: string): Promise<void> {
    await this.buttonNamed(name, this.threadAt(index)).trigger('click');
    await flushPromises();
  }

  async clickThreadBody(index: number): Promise<void> {
    await this.threadAt(index).find('.nui-collab-comments__body').trigger('click');
    await flushPromises();
  }

  async write(text: string): Promise<void> {
    await this.wrapper.find('.nui-collab-comments__form textarea').setValue(text);
  }

  async submit(): Promise<void> {
    await this.wrapper.find('.nui-collab-comments__form').trigger('submit');
    await flushPromises();
  }
}
