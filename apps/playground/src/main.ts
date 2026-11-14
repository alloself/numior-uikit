import { createApp } from 'vue';
import { createNuiConfig, type NuiLocaleMessages, type NuiVueMessages } from '@numior/vue';
import { createShikiHighlighter } from '@numior/vue/shiki';
import '@fontsource-variable/inter/index.css';
import './tailwind.css';
import App from './App.vue';

const messages: NuiLocaleMessages<NuiVueMessages> = {
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
