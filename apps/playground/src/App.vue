<template>
  <main
    ref="workspace"
    class="workspace"
    data-nui-theme="system"
    :data-nui-density="density"
    :dir="direction"
    :style="accents[accent]"
  >
    <header class="intro">
      <span class="eyebrow">NUMIOR UI / FOUNDATION</span>
      <h1>Свой интерфейс.<br />Общие принципы.</h1>
      <p class="description">Первые компоненты и токены будущего UI kit для Vue.</p>
    </header>

    <section class="panel" aria-labelledby="settings-title">
      <div class="section-heading">
        <h2 id="settings-title">Настройки</h2>
        <span class="tag"
          >Схема: <span data-testid="resolved-scheme">{{ resolved }}</span></span
        >
      </div>
      <div class="settings">
        <label
          >Тема
          <select v-model="scheme" data-testid="theme">
            <option value="system">Системная</option>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
          </select>
        </label>
        <label
          >Акцент
          <select v-model="accent" data-testid="accent">
            <option value="indigo">Индиго</option>
            <option value="emerald">Изумруд</option>
            <option value="rose">Роза</option>
          </select>
        </label>
        <label
          >Плотность
          <select v-model="density" data-testid="density">
            <option value="comfortable">Комфортная</option>
            <option value="compact">Компактная</option>
          </select>
        </label>
        <label
          >Направление
          <select v-model="direction" data-testid="direction">
            <option value="ltr">LTR</option>
            <option value="rtl">RTL</option>
          </select>
        </label>
      </div>
    </section>

    <section class="panel" aria-labelledby="buttons-title">
      <div class="section-heading">
        <h2 id="buttons-title">Кнопки</h2>
        <span class="tag">NuiButton</span>
      </div>
      <div class="nui-flex nui-wrap nui-items-center nui-gap-2">
        <NuiButton data-testid="primary" @click="count++">Добавить</NuiButton>
        <NuiButton tone="secondary">Вторичная</NuiButton>
        <NuiButton variant="soft">Мягкая</NuiButton>
        <NuiButton variant="outline">Контурная</NuiButton>
        <NuiButton variant="ghost">Без фона</NuiButton>
        <NuiButton variant="link">Ссылка</NuiButton>
        <NuiButton disabled>Недоступна</NuiButton>
        <NuiButton :loading="loading" data-testid="loading" @click="loading = true"
          >Сохранить</NuiButton
        >
      </div>
      <div class="nui-flex nui-wrap nui-items-center nui-gap-2 tones">
        <NuiButton tone="success" size="sm">Успех</NuiButton>
        <NuiButton tone="warning" variant="soft">Внимание</NuiButton>
        <NuiButton tone="error" variant="outline">Удалить</NuiButton>
        <NuiButton tone="info" variant="ghost">Инфо</NuiButton>
        <NuiButton tone="neutral" size="lg" data-testid="large">Нейтральная</NuiButton>
      </div>
      <p role="status">Нажатий: {{ count }}</p>
      <label class="loading-toggle"
        ><input v-model="loading" type="checkbox" data-testid="loading-toggle" /> Состояние
        загрузки</label
      >
    </section>

    <FormsSection />

    <OverlaysSection />

    <FeedbackSection />
    <NavigationSection />
    <PickersSection />
    <DataSection />
    <TreeSection />
    <TableSection />

    <section class="panel" aria-labelledby="tokens-title">
      <h2 id="tokens-title">Один акцент — разные способы использования</h2>
      <div class="nui-flex nui-wrap nui-gap-2">
        <div
          class="swatch nui-bg-primary nui-text-primary-foreground nui-rounded"
          data-testid="utility"
        >
          Утилиты Numior
        </div>
        <div class="swatch bg-primary text-primary-foreground rounded-nui" data-testid="tailwind">
          Tailwind fixture
        </div>
      </div>
      <p class="nui-text-muted">
        Tailwind-пример оформлен только на
        <a href="/tailwind.html">отдельной странице интеграции</a>.
      </p>
    </section>

    <section class="panel nested-theme" data-nui-theme="dark" aria-labelledby="nested-title">
      <h2 id="nested-title">Локальная тёмная тема</h2>
      <p>Тема этой области независима от внешней.</p>
      <div class="nui-flex nui-wrap nui-gap-2">
        <NuiButton data-testid="nested">Вложенный компонент</NuiButton>
        <NuiButton
          variant="outline"
          data-testid="nested-dialog-open"
          @click="nestedDialogOpen = true"
          >Диалог в этой теме</NuiButton
        >
      </div>
      <NuiDialog
        v-model:open="nestedDialogOpen"
        title="Тёмный диалог"
        description="Наследует тему и направление своей области."
        data-testid="nested-dialog"
      >
        <p>Слой остаётся в DOM инициатора, поэтому тема не теряется.</p>
      </NuiDialog>
    </section>
    <footer>Закрытая разработка · MIT · <a href="/">Автономный CSS</a></footer>
  </main>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiButton, NuiDialog, useColorScheme } from '@numior/vue';
import FormsSection from './FormsSection.vue';
import OverlaysSection from './OverlaysSection.vue';
import FeedbackSection from './FeedbackSection.vue';
import NavigationSection from './NavigationSection.vue';
import PickersSection from './PickersSection.vue';
import DataSection from './DataSection.vue';
import TreeSection from './TreeSection.vue';
import TableSection from './TableSection.vue';

const density = ref('comfortable');
const direction = ref<'ltr' | 'rtl'>('ltr');
const accent = ref('indigo');
const count = ref(0);
const loading = ref(false);
const nestedDialogOpen = ref(false);
const workspace = useTemplateRef<HTMLElement>('workspace');
const { scheme, resolved } = useColorScheme({ scope: workspace });

const accents: Record<string, Record<string, string>> = {
  indigo: {},
  emerald: { '--nui-primary': '#047857', '--nui-primary-foreground': '#ffffff' },
  rose: { '--nui-primary': '#be123c', '--nui-primary-foreground': '#ffffff' },
};
</script>
