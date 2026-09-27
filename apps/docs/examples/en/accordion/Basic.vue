<template>
  <NuiAccordion v-model="question" :heading-level="3">
    <NuiAccordionItem value="ssr" label="Does SSR work?">
      Yes: the markup is deterministic, ids match on the server and the client.
    </NuiAccordionItem>
    <NuiAccordionItem value="tailwind" label="Is Tailwind required?">
      No, the components run on standalone CSS; the Tailwind integration is optional.
    </NuiAccordionItem>
    <NuiAccordionItem value="rtl" label="Is RTL supported?">
      Yes, through logical properties and useDirection.
    </NuiAccordionItem>
  </NuiAccordion>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAccordion, NuiAccordionItem } from '@numior/vue';

const question = ref<string | null>('ssr');
</script>
