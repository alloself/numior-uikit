<template>
  <NuiMenu>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">File</NuiButton>
    </template>
    <NuiMenuItem icon="file" shortcut="mod+n" @select="last = 'New'">New document</NuiMenuItem>
    <NuiMenuItem icon="copy" shortcut="mod+d" @select="last = 'Duplicate'">Duplicate</NuiMenuItem>
    <NuiMenuSeparator />
    <NuiMenuLabel>View</NuiMenuLabel>
    <NuiMenuCheckboxItem v-model:checked="grid">Grid</NuiMenuCheckboxItem>
    <NuiMenuRadioGroup v-model="sort">
      <NuiMenuRadioItem value="name">By name</NuiMenuRadioItem>
      <NuiMenuRadioItem value="date">By date</NuiMenuRadioItem>
    </NuiMenuRadioGroup>
    <NuiMenuSeparator />
    <NuiMenuSub label="Export" icon="upload">
      <NuiMenuItem @select="last = 'PDF'">PDF</NuiMenuItem>
      <NuiMenuItem @select="last = 'CSV'">CSV</NuiMenuItem>
    </NuiMenuSub>
    <NuiMenuItem icon="trash" tone="error" @select="last = 'Delete'">Delete</NuiMenuItem>
  </NuiMenu>
  <p class="nui-text-sm nui-text-muted">
    Last: {{ last || '—' }} · grid: {{ grid ? 'yes' : 'no' }} · sort: {{ sort }}
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiMenu,
  NuiMenuCheckboxItem,
  NuiMenuItem,
  NuiMenuLabel,
  NuiMenuRadioGroup,
  NuiMenuRadioItem,
  NuiMenuSeparator,
  NuiMenuSub,
} from '@numior/vue';

const last = ref('');
const grid = ref(true);
const sort = ref('name');
</script>
