import { createApp } from 'vue';
import { createNuiConfig } from '@numior/vue';
import '@numior/tokens/theme.css';
import '@numior/vue/styles.css';
import '@numior/utilities/utilities.css';
import './style.css';
import App from './App.vue';

createApp(App)
  .use(createNuiConfig({ toasts: { duration: 4000 } }))
  .mount('#app');
