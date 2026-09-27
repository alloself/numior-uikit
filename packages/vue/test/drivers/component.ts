import type { DOMWrapper, VueWrapper } from '@vue/test-utils';

export abstract class ComponentDriver {
  protected abstract readonly block: string;

  constructor(readonly wrapper: VueWrapper) {}

  get root(): DOMWrapper<Element> {
    return this.wrapper.find(`.${this.block}`);
  }

  hasModifier(modifier: string): boolean {
    return this.root.classes().includes(`${this.block}--${modifier}`);
  }

  attribute(name: string): string | undefined {
    return this.root.attributes(name);
  }

  unmount(): void {
    this.wrapper.unmount();
  }
}

export const emittedStrings = (wrapper: VueWrapper, event: string): string[] => {
  return (wrapper.emitted(event) ?? []).flatMap(([value]) =>
    typeof value === 'string' ? [value] : [],
  );
};
