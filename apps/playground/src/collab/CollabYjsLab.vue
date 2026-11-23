<template>
  <div class="collab-lab__pair">
    <NuiCollapsible v-model:open="hintsOpen" label="Что проверить">
      <ol class="collab-lab__hints">
        <li v-for="hint in HINTS" :key="hint">{{ hint }}</li>
      </ol>
    </NuiCollapsible>
    <div class="collab-lab__frames">
      <section
        v-for="pane in PANES"
        :key="pane.side"
        class="collab-lab__pane"
        :aria-label="pane.name"
      >
        <div class="collab-lab__pane-bar">
          <strong>{{ pane.name }}</strong>
          <NuiSwitch
            :model-value="online[pane.side]"
            label="Связь"
            @update:model-value="(value) => link(pane.side, value)"
          />
        </div>
        <CollabYjsPane :ydoc="pane.ydoc" :label="`Документ: ${pane.name}`" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiCollapsible, NuiSwitch } from '@numior/vue';
import { markRaw, onScopeDispose, reactive, ref } from 'vue';
import { Doc as YDoc } from 'yjs';
import CollabYjsPane from './CollabYjsPane.vue';
import { createYjsRelay, type RelaySide } from './yjs-relay';
import { seedStart } from './yjs-start';

interface YjsPane {
  readonly side: RelaySide;
  readonly name: string;
  readonly ydoc: YDoc;
}

const HINTS = [
  'Печатайте слева: текст появится справа. Документ каждой панели — свой Y.Doc, обновления идут через канал в памяти страницы.',
  'Выключите «Связь» слева, нажмите Enter в конце первого абзаца в обеих панелях и напишите по слову. После включения связи оба новых абзаца останутся.',
  'Выключите связь слева, перенесите пункт списка за ручку слева, а справа допишите текст в этот пункт. После включения связи текст окажется в перенесённом пункте.',
  'Выключите связь справа, исправьте заголовок справа, а слева допишите первый и последний абзацы. Включите связь и нажмите Ctrl+Z справа: отменится только правка заголовка.',
];

const left = markRaw(new YDoc());
const right = markRaw(new YDoc());

seedStart(left);

const relay = createYjsRelay(left, right);

const PANES: readonly YjsPane[] = [
  { side: 'left', name: 'Анна', ydoc: left },
  { side: 'right', name: 'Борис', ydoc: right },
];

const online = reactive<Record<RelaySide, boolean>>({ left: true, right: true });
const hintsOpen = ref(true);

const link = (side: RelaySide, value: boolean): void => {
  online[side] = value;
  relay.link(side, value);
};

onScopeDispose(() => {
  relay.destroy();
});
</script>
