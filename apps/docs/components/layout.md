# Каркас и боковая панель

`NuiLayout` собирает оболочку приложения: боковую панель, верхнюю панель `NuiAppBar` и
область содержимого. Состояние панели живёт в каркасе (`v-model:open` для десктопа,
`v-model:mobile-open` для узких экранов), а семейство `NuiSidebar*` описывает саму панель:
шапку, прокручиваемое содержимое с группами пунктов, вложенные списки и подвал. На узком
экране (`mobileQuery`, по умолчанию `(max-width: 48rem)`) панель превращается в выезжающий
`NuiDrawer`, а кнопка `NuiSidebarTrigger` открывает его.

<script setup>
import { ref } from 'vue'
const open = ref(true)
const active = ref('inbox')
const reports = ref(false)
const titles = { inbox: 'Входящие', calendar: 'Календарь', sales: 'Отчёт: продажи', team: 'Отчёт: команда' }
</script>

<div class="vp-raw nui-demo nui-demo--frame" data-nui-theme="light">
  <NuiLayout v-model:open="open" content-as="div" style="block-size: 22rem">
    <template #sidebar>
      <NuiSidebar collapsible="icon" label="Разделы" close-label="Закрыть">
        <NuiSidebarHeader><strong style="padding-inline: 0.5rem">Numior</strong></NuiSidebarHeader>
        <NuiSidebarContent>
          <NuiSidebarGroup label="Обзор">
            <NuiSidebarItem label="Входящие" icon="inbox" :badge="3" :current="active === 'inbox'" @click="active = 'inbox'" />
            <NuiSidebarItem label="Календарь" icon="calendar" :current="active === 'calendar'" @click="active = 'calendar'" />
          </NuiSidebarGroup>
          <NuiSidebarGroup label="Данные">
            <NuiSidebarSub v-model:open="reports" label="Отчёты" icon="folder" :active="active.startsWith('sales') || active === 'team'">
              <NuiSidebarItem label="Продажи" :current="active === 'sales'" @click="active = 'sales'" />
              <NuiSidebarItem label="Команда" :current="active === 'team'" @click="active = 'team'" />
            </NuiSidebarSub>
            <NuiSidebarItem label="Документация" icon="file" href="#docs" />
          </NuiSidebarGroup>
        </NuiSidebarContent>
        <NuiSidebarFooter>
          <NuiSidebarGroup><NuiSidebarItem label="Анна Иванова" icon="user" tooltip="Профиль" /></NuiSidebarGroup>
        </NuiSidebarFooter>
      </NuiSidebar>
    </template>
    <template #header>
      <NuiAppBar>
        <template #start><NuiSidebarTrigger label="Переключить панель" /></template>
        {{ titles[active] }}
      </NuiAppBar>
    </template>
    <p style="padding: 1rem">Раздел «{{ titles[active] }}». Нажмите Ctrl/Cmd+B.</p>
  </NuiLayout>
</div>

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAppBar,
  NuiLayout,
  NuiSidebar,
  NuiSidebarContent,
  NuiSidebarGroup,
  NuiSidebarItem,
  NuiSidebarTrigger,
} from '@numior/vue';
import '@numior/vue/styles/layout.css';
import '@numior/vue/styles/sidebar.css';

const open = ref(true);
</script>

<template>
  <NuiLayout v-model:open="open">
    <template #sidebar>
      <NuiSidebar collapsible="icon" label="Разделы">
        <NuiSidebarContent>
          <NuiSidebarGroup label="Обзор">
            <NuiSidebarItem label="Входящие" icon="inbox" to="/inbox" as="RouterLink" current />
            <NuiSidebarItem label="Календарь" icon="calendar" to="/calendar" as="RouterLink" />
          </NuiSidebarGroup>
        </NuiSidebarContent>
      </NuiSidebar>
    </template>
    <template #header>
      <NuiAppBar>
        <template #start><NuiSidebarTrigger label="Переключить панель" /></template>
        Входящие
      </NuiAppBar>
    </template>
    <RouterView />
  </NuiLayout>
</template>
```

## Поведение

`collapsible` задаёт, что делает сворачивание: `icon` оставляет узкую полосу иконок, где
подписи пунктов показываются в тултипах; `offcanvas` убирает панель за край и делает её
`inert`; `none` не сворачивает вовсе. `side` ставит панель в начале или в конце строки, и
это следует за направлением письма. Ctrl/Cmd+B переключает панель откуда угодно, кроме
полей ввода (`shortcut=false` выключает). Вложенный список `NuiSidebarSub` раскрывается
кнопкой с `aria-expanded`; в режиме иконок он закрыт, а нажатие сначала раскрывает панель.
На узком экране панель рендерится внутри `NuiDrawer` с заголовком `title` (по умолчанию
`label`); выбор пункта закрывает ящик. До монтирования `useMediaQuery` считает экран
широким, поэтому серверная разметка и первый кадр совпадают.

## Доступность

Панель — `aside` с `aria-label`, содержимое — `nav`, группа — `NuiList variant="nav"` с
подписью через `aria-labelledby`, пункт — `NuiListItem`: текущий получает
`aria-current="page"`, пункты со ссылкой рендерятся через `NuiLink` (`href`, `to`, `as`),
остальные — кнопками. Кнопка-триггер держит `aria-expanded` и `aria-controls` панели или
ящика. В режиме иконок подписи пунктов визуально скрыты, но остаются их доступным именем, а
тултип с подписью — только визуальная подсказка без `aria-describedby`.

## API

`NuiLayout`: `v-model:open` (`true`), `v-model:mobile-open` (`false`), `sidebarWidth`
(`16rem`), `railWidth` (`3.5rem`), `mobileQuery` (`(max-width: 48rem)`), `shortcut`
(`true`), `contentAs` (`main`), `id`. Слоты `sidebar`, `header`, default.

`NuiAppBar`: `sticky` (`true`); слоты `start`, default, `end`.

`NuiSidebar`: `collapsible` (`offcanvas`), `side` (`start`), `label` (`Navigation`), `title`,
`closeLabel`. Части: `NuiSidebarHeader`, `NuiSidebarContent` (`label`), `NuiSidebarFooter`,
`NuiSidebarGroup` (`label`, `items` — записи `NuiListEntry` вместо слота), `NuiSidebarItem`
(`label`, `icon`, `href`, `to`, `as`, `current`, `disabled`, `badge`, `tooltip`; слоты default и
`trailing`), `NuiSidebarSub` (`label`, `icon`, `active` — внутри текущая страница, `id`,
`v-model:open`), `NuiSidebarTrigger` (`label`).

Блоки `nui-layout` (`--mobile`, `--sidebar-open`; `__body`, `__content`; переменные
`--_sidebar-size`, `--_rail-size`, `--_bar-size`), `nui-app-bar` (`--sticky`; `__start`,
`__body`, `__end`), `nui-sidebar` (`--side-*`, `--collapsible-*`, `--collapsed`, `--rail`,
`--mobile`; `__header`, `__content`, `__footer`), `nui-sidebar-group` (`__label`),
`nui-sidebar-sub` (`--open`, `--active`; `__chevron`, `__panel`, `__list`),
`nui-sidebar-trigger`; строки — блоки [списка](/components/list) `nui-list--variant-nav` и
`nui-list-item` (`--current`, `--disabled`).

Примитив `useMediaQuery(query)` из `@numior/primitives` возвращает `false` до монтирования и
следит за `matchMedia` после.
