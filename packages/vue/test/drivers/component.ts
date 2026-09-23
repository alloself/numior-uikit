import type { VueWrapper } from '@vue/test-utils';

export abstract class ComponentDriver {
  protected abstract readonly block: string;

  constructor(readonly wrapper: VueWrapper) {}

  hasModifier(modifier: string): boolean {
    return this.wrapper.classes().includes(`${this.block}--${modifier}`);
  }

  attribute(name: string): string | undefined {
    return this.wrapper.attributes(name);
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
