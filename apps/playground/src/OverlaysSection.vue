<template>
  <section class="panel" aria-labelledby="overlays-title">
    <div class="section-heading">
      <h2 id="overlays-title">Слои</h2>
      <span class="tag">NuiDialog · NuiDrawer · NuiPopover · NuiTooltip</span>
    </div>
    <div class="nui-flex nui-wrap nui-items-center nui-gap-2">
      <NuiButton data-testid="dialog-open" @click="dialogOpen = true">Открыть диалог</NuiButton>
      <NuiButton variant="outline" data-testid="persistent-open" @click="persistentOpen = true"
        >Без закрытия по Esc</NuiButton
      >
      <NuiButton variant="soft" data-testid="drawer-open" @click="drawerOpen = true"
        >Открыть панель</NuiButton
      >
      <label class="loading-toggle"
        >Сторона
        <select v-model="side" data-testid="drawer-side">
          <option value="end">end</option>
          <option value="start">start</option>
          <option value="top">top</option>
          <option value="bottom">bottom</option>
        </select>
      </label>
    </div>
    <NuiDialog
      v-model:open="dialogOpen"
      title="Удалить проект?"
      description="Действие нельзя отменить."
      data-testid="dialog"
      @close="dialogResult = $event"
    >
      <p>Все данные проекта будут удалены вместе с историей изменений.</p>
      <NuiButton
        variant="soft"
        tone="neutral"
        size="sm"
        data-testid="stacked-open"
        @click="stackedOpen = true"
        >Открыть второй уровень</NuiButton
      >
      <template #footer>
        <form method="dialog" class="nui-flex nui-gap-2">
          <NuiButton type="submit" value="cancel" variant="ghost" tone="neutral">Отмена</NuiButton>
          <NuiButton type="submit" value="confirm" tone="error" data-testid="dialog-confirm"
            >Удалить</NuiButton
          >
        </form>
      </template>
    </NuiDialog>
    <NuiDialog
      v-model:open="stackedOpen"
      size="sm"
      title="Второй уровень"
      description="Оверлей один на всю стопку."
      data-testid="stacked-dialog"
    >
      <p>Esc закрывает только этот уровень и возвращает фокус вниз.</p>
      <template #footer>
        <NuiButton data-testid="stacked-close" @click="stackedOpen = false">Закрыть</NuiButton>
      </template>
    </NuiDialog>
    <NuiDialog
      v-model:open="persistentOpen"
      :closable="false"
      title="Обязательное действие"
      data-testid="persistent-dialog"
    >
      <p>Этот диалог закрывается только кнопкой.</p>
      <template #footer>
        <NuiButton data-testid="persistent-close" @click="persistentOpen = false"
          >Понятно</NuiButton
        >
      </template>
    </NuiDialog>
    <NuiDrawer
      v-model:open="drawerOpen"
      :side="side"
      title="Фильтры"
      description="Настройки списка"
      data-testid="drawer"
    >
      <NuiField label="Поиск">
        <NuiInput placeholder="Название" data-testid="drawer-input" />
      </NuiField>
    </NuiDrawer>
    <div class="nui-flex nui-wrap nui-items-center nui-gap-2 tones">
      <NuiPopover v-model:open="popoverOpen" placement="bottom-start" arrow data-testid="popover">
        <template #trigger="{ attrs }">
          <NuiButton v-bind="attrs" variant="outline" data-testid="popover-trigger"
            >Фильтры</NuiButton
          >
        </template>
        <NuiField label="Автор">
          <NuiInput placeholder="Имя" data-testid="popover-input" />
        </NuiField>
      </NuiPopover>
      <NuiTooltip v-model:open="tooltipOpen" data-testid="tooltip">
        <template #trigger="{ attrs }">
          <NuiButton v-bind="attrs" variant="ghost" tone="neutral" data-testid="tooltip-trigger"
            >Сохранить</NuiButton
          >
        </template>
        Сохраняет документ и историю
      </NuiTooltip>
    </div>
    <pre class="output" data-testid="overlays-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiButton,
  NuiDialog,
  NuiDrawer,
  NuiField,
  NuiInput,
  NuiPopover,
  NuiTooltip,
  type NuiDrawerSide,
} from '@numior/vue';

const dialogOpen = ref(false);
const dialogResult = ref('');
const persistentOpen = ref(false);
const stackedOpen = ref(false);
const drawerOpen = ref(false);
const side = ref<NuiDrawerSide>('end');
const popoverOpen = ref(false);
const tooltipOpen = ref(false);

const output = computed(() =>
  JSON.stringify(
    {
      dialogOpen: dialogOpen.value,
      dialogResult: dialogResult.value,
      persistentOpen: persistentOpen.value,
      stackedOpen: stackedOpen.value,
      drawerOpen: drawerOpen.value,
      side: side.value,
      popoverOpen: popoverOpen.value,
      tooltipOpen: tooltipOpen.value,
    },
    null,
    2,
  ),
);
</script>
