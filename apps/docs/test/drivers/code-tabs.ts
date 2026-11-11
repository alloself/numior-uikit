import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import {
  CODE_CHOICE_STORAGE_KEY,
  useCodeChoice,
} from '../../.vitepress/theme/composables/use-code-choice';
import { ru } from '../../.vitepress/theme/texts';
import type { CodeGroupItem } from '../../.vitepress/theme/theme.types';
import CodeTabsScene from '../fixtures/CodeTabsScene.vue';

export const codeVariant = (label: string, code: string): CodeGroupItem => ({
  label,
  code: { code },
});

export class CodeTabsDriver {
  constructor(readonly wrapper: VueWrapper) {}

  static mount(...groups: readonly (readonly CodeGroupItem[])[]): CodeTabsDriver {
    return new CodeTabsDriver(
      mount(CodeTabsScene, { props: { groups, texts: ru }, attachTo: document.body }),
    );
  }

  get stored(): string | null {
    return localStorage.getItem(CODE_CHOICE_STORAGE_KEY);
  }

  private group(index: number): DOMWrapper<Element> {
    const group = this.wrapper.findAll('.nui-tabs').at(index);

    if (group === undefined) {
      throw new Error(`No code group ${index}`);
    }
    return group;
  }

  variants(index: number): string[] {
    return this.group(index)
      .findAll('[role="tab"]')
      .map((tab) => tab.text());
  }

  shown(index: number): string {
    const visible = this.group(index)
      .findAll('.nui-code')
      .find((code) => code.isVisible());

    return visible === undefined ? '' : visible.find('.nui-code__code').text();
  }

  async pick(index: number, label: string): Promise<void> {
    const tab = this.group(index)
      .findAll('[role="tab"]')
      .find((candidate) => candidate.text() === label);

    if (tab === undefined) {
      throw new Error(`No variant "${label}" in code group ${index}`);
    }
    await tab.trigger('click');
  }

  unmount(): void {
    this.wrapper.unmount();
    useCodeChoice().recent.value = [];
    localStorage.removeItem(CODE_CHOICE_STORAGE_KEY);
  }
}
