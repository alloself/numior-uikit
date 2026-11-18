<template>
  <section class="panel" aria-labelledby="navigation-title">
    <div class="section-heading">
      <h2 id="navigation-title">Навигация</h2>
      <span class="tag">NuiMenu · NuiTabs · NuiBreadcrumbs · NuiStepper · NuiLink</span>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <NuiMenu v-model:open="menuOpen" data-testid="nav-menu">
        <template #trigger="{ attrs }">
          <NuiButton v-bind="attrs" variant="outline" tone="neutral" data-testid="nav-menu-trigger"
            >Действия</NuiButton
          >
        </template>
        <NuiMenuItem icon="check" shortcut="mod+r" @select="act('rename')"
          >Переименовать</NuiMenuItem
        >
        <NuiMenuItem shortcut="mod+d" @select="act('duplicate')">Дублировать</NuiMenuItem>
        <NuiMenuItem href="#docs" @select="act('docs')">Документация</NuiMenuItem>
        <NuiMenuItem disabled @select="act('locked')">Архивировать</NuiMenuItem>
        <NuiMenuSeparator />
        <NuiMenuLabel>Вид</NuiMenuLabel>
        <NuiMenuCheckboxItem v-model:checked="gridOn">Сетка</NuiMenuCheckboxItem>
        <NuiMenuRadioGroup v-model="sort">
          <NuiMenuRadioItem value="name">По имени</NuiMenuRadioItem>
          <NuiMenuRadioItem value="date">По дате</NuiMenuRadioItem>
        </NuiMenuRadioGroup>
        <NuiMenuSeparator />
        <NuiMenuSub label="Поделиться">
          <NuiMenuItem @select="act('email')">Почта</NuiMenuItem>
          <NuiMenuItem @select="act('link')">Ссылка</NuiMenuItem>
        </NuiMenuSub>
        <NuiMenuItem tone="error" @select="act('delete')">Удалить</NuiMenuItem>
      </NuiMenu>
    </div>
    <p class="description">
      Подробности в
      <NuiLink href="https://example.com" external data-testid="nav-link-external"
        >документации</NuiLink
      >
      и в разделе справки.
    </p>
    <NuiTabs v-model="tab" data-testid="nav-tabs">
      <NuiTabList label="Разделы">
        <NuiTab value="overview" icon="info">Обзор</NuiTab>
        <NuiTab value="team">Команда</NuiTab>
        <NuiTab value="billing" disabled>Оплата</NuiTab>
        <NuiTab value="settings">Настройки</NuiTab>
      </NuiTabList>
      <NuiTabPanel value="overview">Панель обзора</NuiTabPanel>
      <NuiTabPanel value="team">Панель команды</NuiTabPanel>
      <NuiTabPanel value="billing">Панель оплаты</NuiTabPanel>
      <NuiTabPanel value="settings" lazy>Панель настроек</NuiTabPanel>
    </NuiTabs>
    <NuiTabs
      v-model="manualTab"
      activation="manual"
      variant="soft"
      size="sm"
      :tabs="periods"
      label="Период"
      data-testid="nav-tabs-manual"
    >
      <template #panel="{ tab: period }">Период: {{ period.label }}</template>
    </NuiTabs>
    <NuiTabs v-model="openDocument" data-testid="nav-tabs-closable">
      <NuiTabList label="Открытые документы">
        <NuiTab
          v-for="file in documents"
          :key="file.value"
          :value="file.value"
          :disabled="file.disabled"
          closable
          @close="closeDocument(file.value)"
        >
          {{ file.label }}
        </NuiTab>
      </NuiTabList>
      <NuiTabPanel v-for="file in documents" :key="file.value" :value="file.value">
        Документ: {{ file.label }}
      </NuiTabPanel>
    </NuiTabs>
    <div class="max-w-md">
      <NuiTabs v-model="month" :tabs="months" label="Месяц" data-testid="nav-tabs-overflow" />
    </div>
    <NuiTabs
      v-model="sectionPage"
      :links="sectionPages"
      label="Страницы раздела"
      data-testid="nav-tabs-links"
    />
    <NuiBreadcrumbs :items="path" :max-items="3" label="Путь" data-testid="nav-crumbs" />
    <NuiBreadcrumbs
      :items="path.slice(0, 3)"
      label="Короткий путь"
      data-testid="nav-crumbs-short"
    />
    <div class="stepper-demo">
      <NuiStepper
        v-model="signupStep"
        :steps="signupSteps"
        label="Регистрация"
        data-testid="nav-stepper"
      />
      <div class="stepper-demo__actions">
        <NuiButton
          variant="outline"
          tone="neutral"
          :disabled="signupIndex === 0"
          data-testid="nav-stepper-back"
          @click="moveSignup(-1)"
          >Назад</NuiButton
        >
        <NuiButton
          :disabled="signupIndex === signupSteps.length - 1"
          data-testid="nav-stepper-next"
          @click="moveSignup(1)"
          >Далее</NuiButton
        >
      </div>
      <NuiStepper
        v-model="settingsStep"
        :steps="settingsSteps"
        orientation="vertical"
        :linear="false"
        label="Настройки проекта"
        data-testid="nav-stepper-vertical"
      />
      <NuiStepper readonly data-testid="nav-stepper-guide">
        <NuiStepperStep title="Создайте проект">
          <p>Название проекта видят все участники команды.</p>
        </NuiStepperStep>
        <NuiStepperStep>
          <template #title>
            <h3>Пригласите команду</h3>
          </template>
          <p>Приглашение приходит на почту и действует семь дней.</p>
          <p>Роли можно поменять позже в настройках.</p>
        </NuiStepperStep>
        <NuiStepperStep
          title="Подключите оплату, чтобы проект продолжил работать после пробного периода"
        />
      </NuiStepper>
    </div>
    <pre class="output" data-testid="navigation-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiBreadcrumbs,
  NuiButton,
  NuiLink,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
  NuiStepper,
  NuiStepperStep,
  NuiTab,
  NuiTabList,
  NuiTabPanel,
  NuiTabs,
  type NuiBreadcrumbItem,
  type NuiStepperStepDescriptor,
  type NuiTabDescriptor,
  type NuiTabLinkDescriptor,
} from '@numior/vue';

const periods: NuiTabDescriptor[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

const months: NuiTabDescriptor[] = [
  { value: 'january', label: 'Январь' },
  { value: 'february', label: 'Февраль' },
  { value: 'march', label: 'Март' },
  { value: 'april', label: 'Апрель' },
  { value: 'may', label: 'Май' },
  { value: 'june', label: 'Июнь' },
  { value: 'july', label: 'Июль' },
  { value: 'august', label: 'Август' },
  { value: 'september', label: 'Сентябрь' },
  { value: 'october', label: 'Октябрь' },
  { value: 'november', label: 'Ноябрь' },
  { value: 'december', label: 'Декабрь' },
];

const sectionPages: NuiTabLinkDescriptor[] = [
  { to: '#nav-page-summary', label: 'Сводка', icon: 'info' },
  { to: '#nav-page-orders', label: 'Заказы' },
  { to: '#nav-page-reports', label: 'Отчёты', disabled: true },
  { to: '#nav-page-clients', label: 'Клиенты' },
];

const path: NuiBreadcrumbItem[] = [
  { label: 'Главная', href: '#home' },
  { label: 'Проекты', href: '#projects' },
  { label: 'Numior', href: '#numior' },
  { label: 'Настройки', href: '#settings' },
  { label: 'Оплата' },
];

const signupSteps: NuiStepperStepDescriptor[] = [
  { value: 'account', label: 'Аккаунт', description: 'Почта и пароль' },
  { value: 'profile', label: 'Профиль', description: 'Имя и фото' },
  { value: 'plan', label: 'Тариф' },
  { value: 'review', label: 'Проверка' },
];

const settingsSteps: NuiStepperStepDescriptor[] = [
  { value: 'general', label: 'Основное', description: 'Название и адрес', status: 'complete' },
  { value: 'access', label: 'Доступ', description: 'Роли участников', status: 'error' },
  { value: 'billing', label: 'Оплата', description: 'Карта и реквизиты' },
  { value: 'danger', label: 'Удаление', description: 'Недоступно для гостей', disabled: true },
];

const menuOpen = ref(false);
const gridOn = ref(false);
const sort = ref('name');
const lastAction = ref('');
const tab = ref('overview');
const manualTab = ref('day');
const month = ref('january');
const openDocument = ref('contract');
const sectionPage = ref('#nav-page-summary');

const documents = ref<NuiTabDescriptor[]>([
  { value: 'contract', label: 'Договор' },
  { value: 'invoice', label: 'Счёт на оплату' },
  { value: 'act', label: 'Акт' },
  { value: 'estimate', label: 'Смета' },
  { value: 'archive', label: 'Архив', disabled: true },
]);

const signupStep = ref('profile');
const settingsStep = ref('access');

const signupIndex = computed(() =>
  signupSteps.findIndex((step) => step.value === signupStep.value),
);

const act = (name: string): void => {
  lastAction.value = name;
};

const closeDocument = (value: string): void => {
  const index = documents.value.findIndex((file) => file.value === value);

  documents.value = documents.value.filter((file) => file.value !== value);

  if (openDocument.value !== value) {
    return;
  }

  openDocument.value = documents.value.at(Math.min(index, documents.value.length - 1))?.value ?? '';
};

const moveSignup = (delta: number): void => {
  const target = signupSteps[signupIndex.value + delta];

  if (!target) {
    return;
  }

  signupStep.value = target.value;
};

const output = computed(() =>
  JSON.stringify(
    {
      menuOpen: menuOpen.value,
      gridOn: gridOn.value,
      sort: sort.value,
      lastAction: lastAction.value,
      tab: tab.value,
      manualTab: manualTab.value,
      signupStep: signupStep.value,
      settingsStep: settingsStep.value,
    },
    null,
    2,
  ),
);
</script>
