<template>
  <section class="panel" aria-labelledby="layout-title">
    <div class="section-heading">
      <h2 id="layout-title">Каркас приложения</h2>
      <span class="tag">NuiLayout · NuiAppBar · NuiSidebar</span>
    </div>
    <div class="layout-controls">
      <label
        >Сворачивание
        <select v-model="collapsible" data-testid="layout-collapsible">
          <option value="icon">В иконки</option>
          <option value="offcanvas">За край</option>
          <option value="none">Не сворачивать</option>
        </select>
      </label>
      <label
        >Сторона
        <select v-model="side" data-testid="layout-side">
          <option value="start">Начало</option>
          <option value="end">Конец</option>
        </select>
      </label>
      <label
        >Вид
        <select v-model="variant" data-testid="layout-variant">
          <option value="panel">Панель</option>
          <option value="plain">Без фона</option>
          <option value="inset">На подложке</option>
          <option value="floating">Плавающая</option>
        </select>
      </label>
      <label
        >Панель
        <select v-model="header" data-testid="layout-header">
          <option value="inset">Рядом с боковой</option>
          <option value="full">На всю ширину</option>
        </select>
      </label>
      <label class="loading-toggle"
        ><input v-model="withEnd" type="checkbox" data-testid="layout-end-toggle" /> Оглавление
        справа</label
      >
      <NuiButton
        size="sm"
        variant="outline"
        tone="neutral"
        data-testid="layout-goto-report"
        @click="active = 'report-team'"
        >К отчёту команды</NuiButton
      >
    </div>
    <div class="layout-frame">
      <NuiLayout
        id="demo"
        v-model:open="open"
        v-model:mobile-open="mobileOpen"
        :header="header"
        content-as="div"
        data-testid="layout"
      >
        <template #sidebar>
          <NuiSidebar :collapsible="collapsible" :side="side" :variant="variant" label="Разделы">
            <NuiSidebarHeader>
              <div class="layout-brand">
                <span class="layout-brand__mark" aria-hidden="true">N</span>
                <span class="layout-brand__name">Numior</span>
              </div>
            </NuiSidebarHeader>
            <NuiSidebarContent>
              <NuiSidebarGroup label="Обзор" collapsible data-testid="layout-group">
                <NuiSidebarItem
                  v-for="item in primary"
                  :key="item.key"
                  :label="item.label"
                  :icon="item.icon"
                  :badge="item.badge"
                  :current="active === item.key"
                  :data-testid="`layout-item-${item.key}`"
                  @click="active = item.key"
                />
              </NuiSidebarGroup>
              <NuiSidebarGroup label="Данные">
                <NuiSidebarSub
                  v-model:open="reportsOpen"
                  label="Отчёты"
                  icon="folder"
                  :active="active.startsWith('report')"
                  data-testid="layout-sub"
                >
                  <NuiSidebarItem
                    label="Продажи"
                    icon="file"
                    :current="active === 'report-sales'"
                    data-testid="layout-item-report-sales"
                    @click="active = 'report-sales'"
                  />
                  <NuiSidebarItem
                    label="Команда"
                    icon="file"
                    :current="active === 'report-team'"
                    data-testid="layout-item-report-team"
                    @click="active = 'report-team'"
                  />
                </NuiSidebarSub>
                <NuiSidebarItem
                  label="Документация"
                  icon="file"
                  href="#layout-docs"
                  data-testid="layout-item-docs"
                />
              </NuiSidebarGroup>
            </NuiSidebarContent>
            <NuiSidebarFooter>
              <NuiSidebarGroup>
                <NuiSidebarItem label="Анна Иванова" icon="user" tooltip="Профиль" />
              </NuiSidebarGroup>
            </NuiSidebarFooter>
          </NuiSidebar>
        </template>
        <template #header>
          <NuiAppBar>
            <template #start>
              <NuiSidebarTrigger data-testid="layout-trigger" />
            </template>
            <span data-testid="layout-heading">{{ titles[active] }}</span>
            <template #end>
              <NuiButton size="sm" variant="outline" tone="neutral">Экспорт</NuiButton>
            </template>
          </NuiAppBar>
        </template>
        <div class="layout-page">
          <p>Раздел «{{ titles[active] }}». Ctrl/Cmd+B сворачивает и раскрывает панель.</p>
        </div>
        <template v-if="withEnd" #end>
          <nav class="layout-outline" aria-label="На странице" data-testid="layout-end">
            <p class="layout-outline__title">На странице</p>
            <a href="#layout-title">Раздел</a>
          </nav>
        </template>
      </NuiLayout>
    </div>
    <pre class="output" data-testid="layout-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiAppBar,
  NuiButton,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarFooter,
  NuiSidebarGroup,
  NuiSidebarHeader,
  NuiSidebarItem,
  NuiSidebarSub,
  NuiSidebarTrigger,
  type NuiLayoutHeader,
  type NuiSidebarCollapsible,
  type NuiSidebarSide,
  type NuiSidebarVariant,
} from '@numior/vue';

interface PrimaryItem {
  readonly key: string;
  readonly label: string;
  readonly icon: 'inbox' | 'calendar' | 'folder-open';
  readonly badge?: number;
}

const primary: PrimaryItem[] = [
  { key: 'overview', label: 'Обзор', icon: 'inbox', badge: 3 },
  { key: 'calendar', label: 'Календарь', icon: 'calendar' },
  { key: 'files', label: 'Файлы', icon: 'folder-open' },
];

const titles: Record<string, string> = {
  overview: 'Обзор',
  calendar: 'Календарь',
  files: 'Файлы',
  'report-sales': 'Отчёт: продажи',
  'report-team': 'Отчёт: команда',
};

const collapsible = ref<NuiSidebarCollapsible>('icon');
const side = ref<NuiSidebarSide>('start');
const variant = ref<NuiSidebarVariant>('panel');
const header = ref<NuiLayoutHeader>('inset');
const withEnd = ref(false);
const open = ref(true);
const mobileOpen = ref(false);
const reportsOpen = ref(false);
const active = ref('overview');

const output = computed(() =>
  JSON.stringify(
    {
      open: open.value,
      mobileOpen: mobileOpen.value,
      active: active.value,
      collapsible: collapsible.value,
      side: side.value,
      variant: variant.value,
    },
    null,
    2,
  ),
);
</script>
