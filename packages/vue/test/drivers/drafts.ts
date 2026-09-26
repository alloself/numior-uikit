import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, nextTick, shallowRef, type VNode } from 'vue';
import { provideDraftCommits, type DraftCommits } from '@numior/primitives';

export class DraftsDriver {
  static mount(render: (record: (value: unknown) => void) => VNode): DraftsDriver {
    const emitted: unknown[] = [];
    const drafts = shallowRef<DraftCommits | null>(null);

    const record = (value: unknown): void => {
      emitted.push(value);
    };

    const Host = defineComponent({
      setup: () => {
        drafts.value = provideDraftCommits();
        return () => render(record);
      },
    });

    const wrapper = mount(Host, { attachTo: document.body });

    if (!drafts.value) {
      throw new Error('the draft commits were not provided');
    }
    return new DraftsDriver(wrapper, drafts.value, emitted);
  }

  private constructor(
    private readonly wrapper: VueWrapper,
    private readonly drafts: DraftCommits,
    readonly emitted: readonly unknown[],
  ) {}

  async type(selector: string, text: string): Promise<void> {
    const element = this.wrapper.find(selector).element;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
  }

  async flush(): Promise<void> {
    this.drafts.commitAll();
    await nextTick();
  }
}
