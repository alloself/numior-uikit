<template>
  <div>
    <button type="button" class="outside">Outside</button>
    <NuiToaster v-bind="props">
      <template v-if="customToast" #default="{ toast: item, dismiss }">
        <article class="custom-toast">
          {{ item.title }}<button class="custom-dismiss" type="button" @click="dismiss()">x</button>
        </article>
      </template>
    </NuiToaster>
  </div>
</template>

<script setup lang="ts">
import { NuiToaster, useToast, type NuiToasterProps } from '../../src';

const { props = {}, customToast = false } = defineProps<{
  props?: NuiToasterProps | undefined;
  customToast?: boolean | undefined;
}>();

const toast = useToast();

defineExpose({ toast });
</script>
