import { textSelection, type Command } from '@numior/editor-core';
import type { NuiEditorApi } from '@numior/editor-vue';
import { flushPromises, mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import type { CommentThread } from '../../src';
import type { NuiEditorCommentsProps } from '../../src/vue';
import CommentsHost from './CommentsHost.vue';
import { documentOf, fakeCommentsAdapter, type FakeCommentsAdapter } from './comments-adapter';

Element.prototype.scrollIntoView = () => undefined;

export const ANN = { id: 'ann', name: 'Ann' };

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
  ): CommentsDriver {
    const wrapper = mount(CommentsHost, {
      attachTo: document.body,
      props: { initial: documentOf('one', 'two'), adapter, user: ANN, labels },
    });

    return new CommentsDriver(wrapper, adapter);
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
    scope = this.wrapper.find('.nui-collab-comments'),
  ): DOMWrapper<HTMLButtonElement> {
    const found = scope.findAll('button').find((button) => namedAs(button, name));

    if (found === undefined) {
      throw new Error(`No button named ${name}`);
    }
    return found;
  }

  private threadAt(index: number): DOMWrapper<Element> {
    return this.wrapper.findAll('.nui-collab-comments__thread')[index] ?? this.missing(index);
  }

  private missing(index: number): never {
    throw new Error(`No thread at ${index.toString()}`);
  }

  run(command: Command): void {
    this.api.run(command);
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
    return this.wrapper
      .findAll('.nui-collab-comments__thread > .nui-collab-comments__body')
      .map((body) => body.text());
  }

  get replies(): readonly string[] {
    return this.wrapper
      .findAll('.nui-collab-comments__replies .nui-collab-comments__body')
      .map((body) => body.text());
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
