import type { App, Component } from 'vue';
import type { Theme } from 'vitepress';
import * as vue from '@numior/vue';
import * as forms from '@numior/forms';
import * as table from '@numior/table';
import * as spreadsheet from '@numior/spreadsheet';
import { createNuiConfig } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
import '@numior/forms/styles.css';
import '@numior/table/styles.css';
import '@numior/spreadsheet/styles.css';
import '@numior/charts/styles.css';
import '@numior/content/styles.css';
import '@numior/editor-vue/styles.css';
import '@numior/collaboration/styles.css';
import '@numior/tokens/accents.css';
import '@numior/tokens/prose.css';
import '@fontsource-variable/manrope/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './numior.css';
import './tailwind.css';
import Layout from './Layout.vue';
import ApiReference from './parts/ApiReference.vue';
import DocsBlock from './parts/DocsBlock.vue';
import DocsCodeGroup from './parts/DocsCodeGroup.vue';
import DocsConfigurator from './parts/DocsConfigurator.vue';
import DocsExample from './parts/DocsExample.vue';
import DocsIcons from './parts/DocsIcons.vue';
import DocsKeyboard from './parts/DocsKeyboard.vue';
import DocsSignature from './parts/DocsSignature.vue';
import DocsTokens from './parts/DocsTokens.vue';

const isComponent = (value: unknown): value is Component =>
  typeof value === 'object' && value !== null && ('setup' in value || 'render' in value);

const registerKit = (app: App, kit: Readonly<Record<string, unknown>>): void => {
  for (const [name, value] of Object.entries(kit)) {
    if (!name.startsWith('Nui') || !isComponent(value)) {
      continue;
    }

    app.component(name, value);
  }
};

export default {
  Layout,
  enhanceApp({ app, router }) {
    app.use(
      createNuiConfig({
        locale: () => (router.route.path.startsWith('/en/') ? 'en-US' : 'ru-RU'),
        colorScheme: { storageKey: 'nui-theme' },
      }),
    );

    registerKit(app, vue);
    registerKit(app, forms);
    registerKit(app, table);
    registerKit(app, spreadsheet);
    app.component('ApiReference', ApiReference);
    app.component('Block', DocsBlock);
    app.component('CodeGroup', DocsCodeGroup);
    app.component('Configurator', DocsConfigurator);
    app.component('Example', DocsExample);
    app.component('IconReference', DocsIcons);
    app.component('KeyboardReference', DocsKeyboard);
    app.component('SignatureReference', DocsSignature);
    app.component('TokenReference', DocsTokens);
  },
} satisfies Theme;
