<template>
  <div class="mb-5 flex flex-col gap-3">
    <NuiCode
      v-for="declaration in declarations"
      :key="declaration.name"
      :code="declaration.signature"
      :tokens="declaration.tokens"
      wrap
    />
  </div>
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/vue';
import { loadDeclarationReference } from '../reference';
import type { SignatureViewProps } from '../theme.types';

const { names } = defineProps<SignatureViewProps>();

const declarations = await Promise.all(names.map(loadDeclarationReference));
</script>
