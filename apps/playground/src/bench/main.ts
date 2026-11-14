import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';
import './kit.css';
import BenchApp from './BenchApp.vue';

createApp(BenchApp)
  .use(createNuiConfig({ locale: 'ru-RU', highlighter: createShikiHighlighter() }))
  .mount('#bench');
