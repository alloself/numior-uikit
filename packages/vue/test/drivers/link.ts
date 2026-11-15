import { mount } from '@vue/test-utils';
import type { Component } from 'vue';
import { NuiLink, type NuiConfigOptions, type NuiLinkProps } from '../../src';
import { configPlugins } from '../support/config';
import { RouterStub } from '../support/router-stub';
import { ComponentDriver } from './component';

export interface LinkMountOptions {
  readonly props?: NuiLinkProps;
  readonly attrs?: Record<string, unknown>;
  readonly label?: string;
  readonly viaRouter?: boolean;
  readonly routerComponent?: Component;
  readonly config?: NuiConfigOptions;
}

export class LinkDriver extends ComponentDriver {
  protected readonly block = 'nui-link';

  static mount({
    props = {},
    attrs = {},
    label = 'Docs',
    viaRouter = false,
    routerComponent,
    config,
  }: LinkMountOptions = {}) {
    return new LinkDriver(
      mount(NuiLink, {
        props: viaRouter ? { ...props, as: RouterStub } : props,
        attrs,
        slots: { default: label },
        global: {
          plugins: configPlugins(config),
          components: routerComponent ? { RouterLink: routerComponent } : {},
        },
      }),
    );
  }

  get tag(): string {
    return this.wrapper.element.tagName.toLowerCase();
  }

  get href(): string | undefined {
    return this.attribute('href');
  }

  get target(): string | undefined {
    return this.attribute('target');
  }

  get rel(): string | undefined {
    return this.attribute('rel');
  }

  get ariaDisabled(): string | undefined {
    return this.attribute('aria-disabled');
  }

  get role(): string | undefined {
    return this.attribute('role');
  }

  get tabindex(): string | undefined {
    return this.attribute('tabindex');
  }

  get hasExternalIcon(): boolean {
    return this.wrapper.find('.nui-link__icon').exists();
  }

  get text(): string {
    return this.wrapper.text();
  }
}
