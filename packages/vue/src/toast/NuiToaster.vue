<template>
  <div
    ref="region"
    role="region"
    class="nui-toaster"
    :class="`nui-toaster--placement-${placement}`"
    aria-live="polite"
    :aria-label="label"
    v-bind="{ ...contentAttrs, ...$attrs }"
  >
    <slot :toasts="visible" :dismiss="dismiss">
      <NuiToast v-for="toast in visible" :key="toast.id" :toast="toast" :close-label="closeLabel" />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onScopeDispose, ref, useTemplateRef, watch } from 'vue';
import { usePopover, useToastStore } from '@numior/primitives';
import NuiToast from './NuiToast.vue';
import type { NuiToasterProps, NuiToasterSlot } from './toast.types';

defineOptions({ inheritAttrs: false });
const {
  id,
  placement = 'top-end',
  label = 'Notifications',
  closeLabel = 'Close',
} = defineProps<NuiToasterProps>();
defineSlots<{ default(props: NuiToasterSlot): unknown }>();
const store = useToastStore();
const visible = store.visible;
const dismiss = (toastId: string): void => store.dismiss(toastId);
const open = ref(true);
const regionElement = useTemplateRef<HTMLElement>('region');
const { contentAttrs, raise } = usePopover(regionElement, { open, id: () => id, mode: 'manual' });

const modalOpen = (): boolean => document.querySelector('dialog[open]') !== null;
watch(
  () => store.toasts.value.length,
  (next, previous) => {
    if (next > previous && modalOpen()) {
      raise();
    }
  },
);

const onVisibilityChange = (): void => {
  const apply = document.hidden ? store.pause : store.resume;
  for (const toast of visible.value) {
    apply(toast.id);
  }
};
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  onScopeDispose(() => document.removeEventListener('visibilitychange', onVisibilityChange));
});
</script>
