import { mount, type DOMWrapper } from '@vue/test-utils';
import { defineComponent, h, ref, type Ref, type VNode } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
  type NuiCardMediaProps,
  type NuiCardProps,
  type NuiCardTitleProps,
} from '../../src';
import { RouterStub } from '../support/router-stub';
import { ComponentDriver } from './component';

export interface CardParts {
  readonly title?: string | undefined;
  readonly titleAs?: NuiCardTitleProps['as'];
  readonly description?: string | undefined;
  readonly actions?: boolean | undefined;
  readonly content?: string | undefined;
  readonly footer?: string | undefined;
  readonly media?: NuiCardMediaProps | undefined;
}

export interface CardMountOptions {
  readonly props?: NuiCardProps;
  readonly parts?: CardParts;
  readonly viaRouter?: boolean;
}

const isActionClick = (event: Event): boolean =>
  event.target instanceof Element && event.target.closest('.nui-card__action') !== null;

const renderHeader = (parts: CardParts, nested: Ref<number>): VNode | undefined => {
  if (parts.title === undefined && parts.description === undefined) {
    return undefined;
  }
  const heading = [
    ...(parts.title === undefined
      ? []
      : [h(NuiCardTitle, { as: parts.titleAs }, () => parts.title)]),
    ...(parts.description === undefined
      ? []
      : [h(NuiCardDescription, null, () => parts.description)]),
  ];
  const slots = {
    default: () => heading,
    ...(parts.actions
      ? {
          actions: () =>
            h(
              'button',
              {
                type: 'button',
                class: 'nested',
                onClick: () => {
                  nested.value += 1;
                },
              },
              'More',
            ),
        }
      : {}),
  };
  return h(NuiCardHeader, null, slots);
};

const renderParts = (parts: CardParts, nested: Ref<number>): VNode[] => {
  const header = renderHeader(parts, nested);
  return [
    ...(parts.media ? [h(NuiCardMedia, parts.media)] : []),
    ...(header === undefined ? [] : [header]),
    ...(parts.content === undefined ? [] : [h(NuiCardContent, null, () => parts.content)]),
    ...(parts.footer === undefined ? [] : [h(NuiCardFooter, null, () => parts.footer)]),
  ];
};

export class CardDriver extends ComponentDriver {
  protected readonly block = 'nui-card';

  static mount({ props = {}, parts = {}, viaRouter = false }: CardMountOptions = {}) {
    const clicks = ref(0);
    const nested = ref(0);
    const cardProps = viaRouter ? { ...props, as: RouterStub } : props;
    const Host = defineComponent({
      setup: () => () =>
        h(
          NuiCard,
          {
            ...cardProps,
            onClick: (event: Event) => {
              if (isActionClick(event)) {
                clicks.value += 1;
              }
            },
          },
          () => renderParts(parts, nested),
        ),
    });
    return new CardDriver(mount(Host, { attachTo: document.body }), clicks, nested);
  }

  private constructor(
    wrapper: ReturnType<typeof mount>,
    private readonly clickCount: Ref<number>,
    private readonly nestedCount: Ref<number>,
  ) {
    super(wrapper);
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

  get clicks(): number {
    return this.clickCount.value;
  }

  get nestedClicks(): number {
    return this.nestedCount.value;
  }

  async clickAction(): Promise<void> {
    await this.action.trigger('click');
  }

  async clickNested(): Promise<void> {
    await this.wrapper.find('.nested').trigger('click');
  }
}
