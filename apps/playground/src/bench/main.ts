import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/vue/styles.css';
import '@numior/table/styles.css';
import '@numior/content/styles.css';
import '@numior/editor-vue/styles.css';
import '@numior/spreadsheet/styles.css';
import './bench.css';
import BenchApp from './BenchApp.vue';

createApp(BenchApp)
  .use(createNuiConfig({ locale: 'ru-RU' }))
  .mount('#bench');
