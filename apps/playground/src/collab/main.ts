import { createApp, type Component } from 'vue';
import { createNuiConfig } from '@numior/vue';
import '@fontsource-variable/inter/index.css';
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
import '@numior/table/styles.css';
import '@numior/content/styles.css';
import '@numior/editor-vue/styles.css';
import '@numior/spreadsheet/styles.css';
import '@numior/collaboration/styles.css';
import './collab.css';
import CollabApp from './CollabApp.vue';
import CollabBookApp from './CollabBookApp.vue';
import CollabLabApp from './CollabLabApp.vue';

const pageOf = (params: URLSearchParams): Component => {
  if (!params.has('user')) {
    return CollabLabApp;
  }
  return params.has('book') ? CollabBookApp : CollabApp;
};

createApp(pageOf(new URLSearchParams(location.search)))
  .use(createNuiConfig({ locale: 'ru-RU' }))
  .mount('#collab');
