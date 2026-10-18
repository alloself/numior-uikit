<template>
  <button :aria-label="messages.close">{{ messages.count({ count: 2 }) }}</button>
</template>

<script setup lang="ts">
import { useMessages } from '../../src';
import { probeMessages } from '../harness/messages';

const messages = useMessages(probeMessages);
</script>
