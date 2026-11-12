import { createApp, type Component } from 'vue';
import { createNuiConfig } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';
import '@fontsource-variable/inter/index.css';
import '../kit.css';
import './layers.css';
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
  .use(createNuiConfig({ locale: 'ru-RU', highlighter: createShikiHighlighter() }))
  .mount('#collab');
