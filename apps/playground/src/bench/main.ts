import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
import '@numior/table/styles.css';
import '@numior/content/styles.css';
import '@numior/editor-vue/styles.css';
import './bench.css';
import BenchApp from './BenchApp.vue';

createApp(BenchApp)
  .use(createNuiConfig({ locale: 'ru-RU', highlighter: createShikiHighlighter() }))
  .mount('#bench');
