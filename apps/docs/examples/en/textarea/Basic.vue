<template>
  <NuiTextarea
    v-model="comment"
    label="Order note"
    description="The courier reads it before leaving"
    :rows="4"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTextarea } from '@numior/kit';

const comment = ref('Please call an hour before delivery: the intercom is broken.');
</script>
