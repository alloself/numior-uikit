import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import './kit.css';
import BenchApp from './BenchApp.vue';

createApp(BenchApp)
  .use(createNuiConfig({ locale: 'ru-RU' }))
  .mount('#bench');
