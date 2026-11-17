<template>
  <NuiContent :document="document" :views="views" class="w-full" />
</template>

<script setup lang="ts">
import { NuiContent } from '@numior/kit/content';
import { NuiContentCode } from '@numior/kit/content/code';
import { contentMediaViews } from '@numior/kit/content/media';
import { NuiContentTable } from '@numior/kit/content/table';
import { document } from './document';

const views = { ...contentMediaViews, table: NuiContentTable, code_block: NuiContentCode };
</script>
