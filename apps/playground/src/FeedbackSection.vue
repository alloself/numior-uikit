<template>
  <section class="panel" aria-labelledby="feedback-title">
    <div class="section-heading">
      <h2 id="feedback-title">Обратная связь</h2>
      <span class="tag">NuiToaster · NuiAlert · NuiProgress · NuiSkeleton</span>
    </div>
    <div class="nui-flex nui-wrap nui-items-center nui-gap-2">
      <NuiButton data-testid="toast-show" @click="notify">Уведомление</NuiButton>
      <NuiButton variant="soft" tone="success" data-testid="toast-quick" @click="quick"
        >Быстрое (1,5 с)</NuiButton
      >
      <NuiButton variant="outline" tone="error" data-testid="toast-error" @click="failure"
        >Ошибка с действием</NuiButton
      >
      <NuiButton variant="ghost" data-testid="toast-dialog-open" @click="dialogOpen = true"
        >Из диалога</NuiButton
      >
      <label class="loading-toggle"
        >Позиция
        <select v-model="placement" data-testid="toast-placement">
          <option v-for="option in placements" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
    </div>
    <NuiDialog
      v-model:open="dialogOpen"
      title="Уведомление поверх диалога"
      data-testid="toast-dialog"
    >
      <p>Нажмите кнопку: уведомление появится над этим диалогом.</p>
      <template #footer>
        <NuiButton data-testid="toast-from-dialog" @click="notify">Показать</NuiButton>
      </template>
    </NuiDialog>
    <NuiToaster :placement="placement" data-testid="toaster" />
    <div class="form tones">
      <NuiAlert
        v-model:open="alertOpen"
        tone="warning"
        title="Черновик не сохранён"
        description="Изменения пропадут при выходе со страницы."
        dismissible
        data-testid="alert"
      >
        <template #actions>
          <NuiButton size="sm" variant="outline" tone="warning" @click="alertOpen = false"
            >Сохранить</NuiButton
          >
        </template>
      </NuiAlert>
      <NuiButton
        v-if="!alertOpen"
        size="sm"
        variant="ghost"
        tone="neutral"
        data-testid="alert-reset"
        @click="alertOpen = true"
        >Показать алерт снова</NuiButton
      >
      <NuiField label="Загрузка, %">
        <NuiInput v-model="progressInput" inputmode="numeric" data-testid="progress-input" />
      </NuiField>
      <NuiProgress
        :value="progressValue"
        label="Загрузка"
        :value-text="`${progressValue}%`"
        data-testid="progress-determinate"
      />
      <NuiProgress label="Подготовка" size="sm" tone="info" data-testid="progress-indeterminate" />
      <div class="skeleton-row" data-testid="skeleton">
        <NuiSkeleton shape="circle" />
        <NuiSkeleton :lines="2" />
      </div>
    </div>
    <pre class="output" data-testid="feedback-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiAlert,
  NuiButton,
  NuiDialog,
  NuiField,
  NuiInput,
  NuiProgress,
  NuiSkeleton,
  NuiToaster,
  useToast,
  useToastStore,
  type NuiToasterPlacement,
} from '@numior/vue';

const placements: NuiToasterPlacement[] = [
  'top-end',
  'top',
  'top-start',
  'bottom-end',
  'bottom',
  'bottom-start',
];

const toast = useToast();
const store = useToastStore();
const placement = ref<NuiToasterPlacement>('top-end');
const dialogOpen = ref(false);
const alertOpen = ref(true);
const progressInput = ref('40');
const sequence = ref(0);
const progressValue = computed(() => Math.min(100, Math.max(0, Number(progressInput.value) || 0)));

const notify = (): void => {
  sequence.value += 1;
  toast.info(`Уведомление №${sequence.value}`, { description: 'Обычное уведомление' });
};

const quick = (): void => {
  toast.success('Быстрое уведомление', { duration: 1500 });
};

const failure = (): void => {
  toast.error('Не удалось сохранить', {
    duration: 0,
    action: {
      label: 'Повторить',
      onClick: () => {
        toast.success('Повторили');
      },
    },
  });
};

const output = computed(() =>
  JSON.stringify(
    {
      placement: placement.value,
      toastCount: store.toasts.value.length,
      alertOpen: alertOpen.value,
      progress: progressValue.value,
    },
    null,
    2,
  ),
);
</script>
