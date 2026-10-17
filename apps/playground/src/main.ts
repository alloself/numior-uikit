import { createApp } from 'vue';
import { createNuiConfig, type NuiLocaleMessages } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';
import '@numior/tokens/theme.css';
import '@numior/tokens/base.css';
import '@numior/tokens/accents.css';
import '@numior/vue/styles.css';
import '@numior/forms/styles.css';
import '@numior/table/styles.css';
import '@numior/content/styles.css';
import '@numior/editor-vue/styles.css';
import '@numior/tokens/prose.css';
import './tailwind.css';
import './style.css';
import App from './App.vue';

const messages: NuiLocaleMessages = {
  de: {
    numberField: { increment: 'Erhöhen', decrement: 'Verringern' },
    timeField: { clock: 'Uhrzeit wählen', empty: 'Keine Uhrzeiten verfügbar' },
  },
};

createApp(App)
  .use(
    createNuiConfig({
      toasts: { duration: 4000 },
      locale: 'ru-RU',
      messages,
      highlighter: createShikiHighlighter(),
    }),
  )
  .mount('#app');
