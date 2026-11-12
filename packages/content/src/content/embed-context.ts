import { inject, provide, type InjectionKey } from 'vue';
import type { NuiEmbedProvider } from './embeds';

export type AllowedEmbeds = () => readonly NuiEmbedProvider[];

const EMBEDS: InjectionKey<AllowedEmbeds> = Symbol('nui-content-embeds');

export const provideAllowedEmbeds = (allowed: AllowedEmbeds): void => {
  provide(EMBEDS, allowed);
};

export const useAllowedEmbeds = (): AllowedEmbeds | undefined => inject(EMBEDS, undefined);
