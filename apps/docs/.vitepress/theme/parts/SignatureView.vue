<template>
  <NuiCode
    v-for="declaration in declarations"
    :key="declaration.name"
    class="nui-mb-5"
    :code="declaration.signature"
    :tokens="declaration.tokens"
    :title="importLineOf(declaration)"
    language="ts"
    wrap
  />
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/vue';
import type { DeclarationSlice } from '../../reference/reference.types';
import { loadDeclarationReference } from '../reference';
import type { SignatureViewProps } from '../theme.types';

const { names } = defineProps<SignatureViewProps>();

const declarations = await Promise.all(names.map(loadDeclarationReference));

const importLineOf = (declaration: DeclarationSlice): string =>
  `import ${declaration.kind === 'type' ? 'type ' : ''}{ ${declaration.name} } from '${declaration.package}';`;
</script>
