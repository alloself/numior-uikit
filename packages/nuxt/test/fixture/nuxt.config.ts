import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  compatibilityDate: '2026-09-28',
  modules: ['../../src/module'],
  devtools: { enabled: false },
  telemetry: false,
  app: { head: { htmlAttrs: { lang: 'ru' }, title: 'Numior в Nuxt' } },
  vite: { define: { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true' } },
  numior: {
    locale: 'ru-RU',
    colorScheme: { storageKey: 'nui-theme', initial: 'light' },
  },
});
