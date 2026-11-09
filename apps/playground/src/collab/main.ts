import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
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

const root = new URLSearchParams(location.search).has('book') ? CollabBookApp : CollabApp;

createApp(root)
  .use(createNuiConfig({ locale: 'ru-RU' }))
  .mount('#collab');
