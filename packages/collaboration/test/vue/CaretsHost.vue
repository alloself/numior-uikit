<template>
  <div class="nui-editor">
    <p class="carets-host__line">Line <img class="carets-host__picture" alt="" /></p>
    <NuiCollabCarets :peers="peers" :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import type { NuiEditorApi } from '@numior/editor-vue';
import type { RemotePeer } from '../../src';
import { NuiCollabCarets } from '../../src/vue';

interface Props {
  peers: readonly RemotePeer[];
  editor: NuiEditorApi;
}

const { peers, editor } = defineProps<Props>();
</script>
