<template>
  <div class="task-status__control">
    <span class="task-status__label">Статус задачи</span>
    <NuiSelect
      :model-value="status"
      :options="TASK_STATUSES"
      :disabled="!editable"
      size="sm"
      aria-label="Статус задачи"
      data-testid="task-status"
      @update:model-value="choose"
    />
  </div>
</template>

<script setup lang="ts">
import type { NuiEditorBlockViewProps } from '@numior/editor-vue';
import { NuiSelect } from '@numior/vue';
import { computed } from 'vue';
import { TASK_STATUSES, taskStatusOf } from './task-status';

const { node, editable, editor } = defineProps<NuiEditorBlockViewProps>();

const status = computed(() => taskStatusOf(node.attrs.status));

const choose = (value: unknown): void => {
  editor.setAttrs({ status: taskStatusOf(value) });
};
</script>
