<template>
  <slot name="trigger" :attrs="triggerAttrs" :open="open" />
  <div
    ref="content"
    role="menu"
    tabindex="-1"
    class="nui-menu"
    :aria-label="label"
    :aria-labelledby="label === undefined ? triggerId : undefined"
    v-bind="{ ...contentAttrs, ...surfaceAttrs, ...$attrs }"
  >
    <NuiMenuEntries v-if="items" :items="items" />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useControlId } from '@numior/primitives';
import { useTriggerElement } from '../shared/trigger-ref';
import NuiMenuEntries from './NuiMenuEntries.vue';
import { provideMenu } from './menu-context';
import { useMenuSurface } from './use-menu-surface';
import type {
  NuiMenuExposed,
  NuiMenuProps,
  NuiMenuTriggerAttrs,
  NuiMenuTriggerSlot,
} from './menu.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  placement = 'bottom-start',
  offset = 4,
  items,
  closeOnSelect = true,
  loop = true,
  typeahead = true,
  label,
  anchor,
} = defineProps<NuiMenuProps>();

const open = defineModel<boolean>('open', { default: false });
defineSlots<{ trigger(props: NuiMenuTriggerSlot): unknown; default(): unknown }>();

const { trigger, setTrigger } = useTriggerElement();
const reference = computed(() => (anchor === undefined ? trigger.value : anchor));
const contentElement = useTemplateRef<HTMLElement>('content');
const triggerId = useControlId(() => (id === undefined ? undefined : `${id}-trigger`));

const {
  control,
  context,
  attrs: surfaceAttrs,
} = useMenuSurface({
  open,
  id: () => id,
  trigger: reference,
  content: contentElement,
  placement: () => placement,
  offset: () => offset,
  loop: () => loop,
  typeahead: () => typeahead,
  closeOnSelect: () => closeOnSelect,
  parent: null,
});

provideMenu(context);
const contentAttrs = control.contentAttrs;

const onTriggerKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    context.requestFocus(event.key === 'ArrowDown' ? 'first' : 'last');
    control.show();
  } else if (event.key === 'Enter' || event.key === ' ') {
    context.requestFocus('first');
  }
};

const triggerAttrs = computed<NuiMenuTriggerAttrs>(() => ({
  ...control.invokerAttrs.value,
  id: triggerId.value,
  'aria-haspopup': 'menu',
  ref: setTrigger,
  onKeydown: onTriggerKeydown,
}));

defineExpose<NuiMenuExposed>({
  show: (focus) => {
    context.requestFocus(focus ?? 'none');
    control.show();
  },
});
</script>
