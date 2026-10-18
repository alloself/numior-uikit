import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import DraftsScene from '../fixtures/DraftsScene.vue';

export type DraftControl = InstanceType<typeof DraftsScene>['$props']['control'];

export class DraftsDriver {
  static mount(control: DraftControl): DraftsDriver {
    return new DraftsDriver(mount(DraftsScene, { props: { control }, attachTo: document.body }));
  }

  private constructor(private readonly scene: VueWrapper<InstanceType<typeof DraftsScene>>) {}

  get emitted(): readonly unknown[] {
    return (this.scene.emitted('record') ?? []).map(([value]) => value);
  }

  async type(selector: string, text: string): Promise<void> {
    const element = this.scene.find(selector).element;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
  }

  async flush(): Promise<void> {
    this.scene.vm.drafts.commitAll();
    await nextTick();
  }
}
