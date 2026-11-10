<template>
  <slot name="trigger" :attrs="triggerAttrs" :open="open" />
  <div
    ref="content"
    role="menu"
    :tabindex="open ? 0 : -1"
    class="nui-menu nui-layer"
    :class="{ 'nui-menu--compact': compact, 'nui-menu--pointed': pointed }"
    :aria-label="label"
    :aria-labelledby="label === undefined ? triggerId : undefined"
    v-bind="{ ...contentAttrs, ...surfaceAttrs, ...$attrs }"
  >
    <template v-if="!lazy || opened">
      <NuiMenuEntries v-if="items" :items="items" />
      <slot />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { FLOATING_OFFSET, FloatingPlacement, Key, useControlId } from '@numior/primitives';
import { useTriggerElement } from '../shared/trigger-ref';
import NuiMenuEntries from './NuiMenuEntries.vue';
import { provideMenu } from './menu-context';
import { useMenuSurface } from './use-menu-surface';
import {
  MenuFocusRequest,
  NuiMenuFocus,
  type NuiMenuExposed,
  type NuiMenuProps,
  type NuiMenuTriggerAttrs,
  type NuiMenuTriggerSlot,
} from './menu.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  placement = FloatingPlacement.BottomStart,
  offset = FLOATING_OFFSET,
  items,
  closeOnSelect = true,
  loop = true,
  typeahead = true,
  label,
  anchor,
  compact = false,
  lazy = false,
} = defineProps<NuiMenuProps>();

const open = defineModel<boolean>('open', { default: false });
const opened = ref(open.value);

defineSlots<{ trigger(props: NuiMenuTriggerSlot): unknown; default(): unknown }>();

const { trigger, setTrigger } = useTriggerElement();
const reference = computed(() => (anchor === undefined ? trigger.value : anchor));
const contentElement = useTemplateRef<HTMLElement>('content');
const triggerId = useControlId(() => (id === undefined ? undefined : `${id}-trigger`));

const {
  control,
  context,
  pointed,
  attrs: surfaceAttrs,
} = useMenuSurface({
  open,
  id: () => id,
  trigger: reference,
  content: contentElement,
  placement: () => placement,
  offset: () => offset,
  size: { fitHeight: true },
  loop: () => loop,
  typeahead: () => typeahead,
  closeOnSelect: () => closeOnSelect,
  parent: null,
});

provideMenu(context);

watch(open, (value) => {
  opened.value ||= value;
});

const contentAttrs = control.contentAttrs;

const onTriggerKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.ArrowDown || event.key === Key.ArrowUp) {
    event.preventDefault();
    context.requestFocus(event.key === Key.ArrowDown ? NuiMenuFocus.First : NuiMenuFocus.Last);
    control.show();
  } else if (event.key === Key.Enter || event.key === Key.Space) {
    context.requestFocus(NuiMenuFocus.First);
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
  get trigger() {
    return trigger.value;
  },
  show: (focus) => {
    context.requestFocus(focus ?? MenuFocusRequest.None);
    control.show();
  },
});
</script>
