import { mount, type DOMWrapper, type VueWrapper } from '@vue/test-utils';
import type { NuiCardMediaProps, NuiCardProps, NuiCardTitleProps } from '../../src';
import CardScene from '../fixtures/CardScene.vue';
import { RouterStub } from '../support/router-stub';
import { ComponentDriver } from './component';

export interface CardParts {
  readonly title?: string | undefined;
  readonly titleAs?: NuiCardTitleProps['as'];
  readonly description?: string | undefined;
  readonly actions?: boolean | undefined;
  readonly content?: string | undefined;
  readonly contentLines?: number | undefined;
  readonly footer?: string | undefined;
  readonly media?: NuiCardMediaProps | undefined;
}

export interface CardPlaceholders {
  readonly title: number;
  readonly description: number;
  readonly content: number;
  readonly media: number;
}

export interface CardMountOptions {
  readonly props?: NuiCardProps;
  readonly parts?: CardParts;
  readonly viaRouter?: boolean;
}

export class CardDriver extends ComponentDriver {
  protected readonly block = 'nui-card';

  static mount({ props = {}, parts = {}, viaRouter = false }: CardMountOptions = {}) {
    const card = viaRouter ? { ...props, as: RouterStub } : props;

    return new CardDriver(mount(CardScene, { props: { card, parts }, attachTo: document.body }));
  }

  private constructor(private readonly scene: VueWrapper<InstanceType<typeof CardScene>>) {
    super(scene);
  }

  override hasModifier(modifier: string): boolean {
    return this.wrapper.find('.nui-card').classes().includes(`nui-card--${modifier}`);
  }

  get title(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-card__title');
  }

  get titleTag(): string {
    return this.title.element.tagName.toLowerCase();
  }

  get action(): DOMWrapper<Element> {
    return this.wrapper.find('.nui-card__action');
  }

  get actionTag(): string | undefined {
    return this.action.exists() ? this.action.element.tagName.toLowerCase() : undefined;
  }

  get focusable(): number {
    return this.wrapper.findAll('a, button').length;
  }

  get hasHeader(): boolean {
    return this.wrapper.find('.nui-card__header').exists();
  }

  get descriptionText(): string {
    const description = this.wrapper.find('.nui-card__description');
    return description.exists() ? description.text() : '';
  }

  get media(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>('.nui-card__media');
  }

  get mediaAspect(): string {
    return this.media.element.style.getPropertyValue('--_aspect');
  }

  get hasImage(): boolean {
    return this.wrapper.find('.nui-card__image').exists();
  }

  get hasPlaceholder(): boolean {
    return this.wrapper.find('.nui-card__placeholder').exists();
  }

  get busy(): boolean {
    return this.wrapper.find('.nui-card').attributes('aria-busy') === 'true';
  }

  get placeholders(): CardPlaceholders {
    return {
      title: this.wrapper.findAll('.nui-card__title .nui-skeleton__line').length,
      description: this.wrapper.findAll('.nui-card__description .nui-skeleton__line').length,
      content: this.wrapper.findAll('.nui-card__content .nui-skeleton__line').length,
      media: this.wrapper.findAll('.nui-card__media .nui-skeleton--shape-rect').length,
    };
  }

  get text(): string {
    return this.wrapper.find('.nui-card').text();
  }

  async load(card: NuiCardProps): Promise<void> {
    await this.scene.setProps({ card });
  }

  get clicks(): number {
    return this.scene.vm.clicks;
  }

  get nestedClicks(): number {
    return this.scene.vm.nested;
  }

  async clickAction(): Promise<void> {
    await this.action.trigger('click');
  }

  async clickNested(): Promise<void> {
    await this.wrapper.find('.nested').trigger('click');
  }
}
