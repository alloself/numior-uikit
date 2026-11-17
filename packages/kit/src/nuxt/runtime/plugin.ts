import { defineNuxtPlugin, useAppConfig, useRuntimeConfig } from 'nuxt/app';
import { createNuiConfig } from '@numior/vue';
import { NuxtLink } from '#components';
import type { NuiAppConfig } from '../module.types';

const EMPTY: NuiAppConfig = {};

export default defineNuxtPlugin({
  name: 'numior',
  setup(nuxtApp) {
    const runtime = useRuntimeConfig().public.numior;
    const appConfig = useAppConfig();
    const own = (): NuiAppConfig => appConfig.numior ?? EMPTY;

    nuxtApp.vueApp.use(
      createNuiConfig({
        locale: () => own().locale ?? runtime.locale,
        dir: () => own().dir ?? runtime.dir,
        messages: () => own().messages,
        translate: own().translate,
        icons: own().icons,
        toasts: runtime.toasts,
        colorScheme: runtime.colorScheme,
        link: own().link ?? NuxtLink,
      }),
    );
  },
});
