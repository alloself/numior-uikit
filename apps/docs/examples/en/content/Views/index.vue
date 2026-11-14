<template>
  <NuiContent :document="document" :views="views" class="w-full" />
</template>

<script setup lang="ts">
import { NuiContent } from '@numior/content';
import { NuiContentCode } from '@numior/content/code';
import { contentMediaViews } from '@numior/content/media';
import { NuiContentTable } from '@numior/content/table';
import { document } from './document';

const views = { ...contentMediaViews, table: NuiContentTable, code_block: NuiContentCode };
</script>
