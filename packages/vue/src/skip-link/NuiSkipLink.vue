<template>
  <a class="nui-skip-link" :href="`#${target}`" @click="skip">
    <slot>{{ text }}</slot>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMessages } from '@numior/primitives';
import { skipLinkMessages } from './skip-link.messages';
import type { NuiSkipLinkProps } from './skip-link.types';

const { target, label } = defineProps<NuiSkipLinkProps>();

defineSlots<{ default?(): unknown }>();

const messages = useMessages(skipLinkMessages);
const text = computed(() => label ?? messages.value.skip);

const skip = (event: MouseEvent): void => {
  const element = document.getElementById(target);

  if (!element) {
    return;
  }
  event.preventDefault();

  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }
  element.focus();
  history.replaceState(history.state, '', `#${target}`);
};
</script>
