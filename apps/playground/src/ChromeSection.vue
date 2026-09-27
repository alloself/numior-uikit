<template>
  <section class="panel" aria-labelledby="chrome-title">
    <div class="section-heading">
      <h2 id="chrome-title">Оформление интерфейса</h2>
      <span class="tag">NuiSeparator · NuiKbd · NuiCode · NuiToggleGroup · NuiAccordion</span>
    </div>
    <div class="nui-flex nui-flex-col nui-gap-4">
      <div class="nui-flex nui-items-center nui-gap-3" data-testid="chrome-toolbar">
        <NuiButton variant="ghost" tone="neutral" size="sm">Файл</NuiButton>
        <NuiSeparator orientation="vertical" data-testid="separator-vertical" />
        <NuiButton variant="ghost" tone="neutral" size="sm">Правка</NuiButton>
        <NuiSeparator orientation="vertical" decorative data-testid="separator-decorative" />
        <NuiKbd keys="mod+k" data-testid="kbd-combo" />
      </div>
      <div class="nui-flex nui-wrap nui-items-center nui-gap-4">
        <NuiToggleGroup
          v-model="scheme"
          :items="schemes"
          variant="segmented"
          required
          label="Схема"
          data-testid="toggle-scheme"
        />
        <NuiToggleGroup
          v-model:values="panels"
          :items="panelItems"
          multiple
          icon-only
          size="sm"
          label="Панели"
          data-testid="toggle-panels"
        />
        <span class="nui-text-sm nui-text-muted" data-testid="toggle-output"
          >{{ scheme }} · {{ panels.join(', ') }}</span
        >
      </div>
      <NuiSeparator data-testid="separator-horizontal" />
      <NuiSeparator label="или" data-testid="separator-labelled" />
      <p class="nui-text-sm nui-text-muted">
        Нажмите <NuiKbd :keys="['mod+shift+p']" size="sm" data-testid="kbd-list" /> для палитры
        команд или <NuiKbd variant="plain" data-testid="kbd-plain">Esc</NuiKbd> для выхода.
      </p>
      <NuiCode
        :code="sample"
        :tokens="sampleTokens"
        title="main.ts"
        line-numbers
        :highlight="[2]"
        :max-lines="3"
        data-testid="code-titled"
      />
      <NuiCode :code="plain" language="sh" data-testid="code-plain" />
      <NuiCollapsible label="Подробности установки" variant="card" data-testid="collapsible">
        <p>Пакеты приватные до полного релиза 1.0; установка идёт из workspace.</p>
      </NuiCollapsible>
      <NuiAccordion v-model="faq" :heading-level="3" data-testid="accordion">
        <NuiAccordionItem value="ssr" label="Работает ли SSR?">
          Да: разметка детерминирована, id совпадают на сервере и клиенте.
        </NuiAccordionItem>
        <NuiAccordionItem value="tailwind" label="Нужен ли Tailwind?">
          Нет, компоненты работают на автономном CSS; интеграция опциональна.
        </NuiAccordionItem>
        <NuiAccordionItem value="rtl" label="Поддерживается ли RTL?" disabled>
          Да, через логические свойства и useDirection.
        </NuiAccordionItem>
      </NuiAccordion>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAccordion,
  NuiAccordionItem,
  NuiButton,
  NuiCode,
  NuiCollapsible,
  NuiKbd,
  NuiSeparator,
  NuiToggleGroup,
  type NuiCodeLine,
  type NuiToggleItem,
} from '@numior/vue';

const scheme = ref('light');
const faq = ref<string | null>('ssr');
const panels = ref(['preview']);

const schemes: readonly NuiToggleItem[] = [
  { value: 'light', label: 'Светлая', icon: 'sun' },
  { value: 'dark', label: 'Тёмная', icon: 'moon' },
  { value: 'system', label: 'Системная', icon: 'monitor' },
];

const panelItems: readonly NuiToggleItem[] = [
  { value: 'preview', label: 'Превью', icon: 'eye' },
  { value: 'code', label: 'Код', icon: 'code' },
  { value: 'terminal', label: 'Терминал', icon: 'terminal', disabled: true },
];

const sample = [
  "import { NuiButton } from '@numior/vue';",
  '',
  "const label = ref('Сохранить');",
  'const loading = ref(false);',
  '',
  'const save = async () => {',
  '  loading.value = true;',
  '};',
  '',
].join('\n');

const sampleTokens: readonly NuiCodeLine[] = [
  [
    { text: 'import', scope: 'keyword' },
    { text: ' { NuiButton } ' },
    { text: 'from', scope: 'keyword' },
    { text: " '@numior/vue'", scope: 'string' },
    { text: ';', scope: 'punctuation' },
  ],
  [{ text: '' }],
  [
    { text: 'const', scope: 'keyword' },
    { text: ' label = ' },
    { text: 'ref', scope: 'function' },
    { text: "('Сохранить')", scope: 'string' },
    { text: ';', scope: 'punctuation' },
  ],
  [
    { text: 'const', scope: 'keyword' },
    { text: ' loading = ' },
    { text: 'ref', scope: 'function' },
    { text: '(' },
    { text: 'false', scope: 'keyword' },
    { text: ');', scope: 'punctuation' },
  ],
  [{ text: '' }],
  [
    { text: 'const', scope: 'keyword' },
    { text: ' save = ' },
    { text: 'async', scope: 'keyword' },
    { text: ' () => {' },
  ],
  [
    { text: '  loading.' },
    { text: 'value', scope: 'property' },
    { text: ' = ' },
    { text: 'true', scope: 'keyword' },
    { text: ';', scope: 'punctuation' },
  ],
  [{ text: '};' }],
];

const plain = 'pnpm add @numior/vue @numior/tokens\n';
</script>
