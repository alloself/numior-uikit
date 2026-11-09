<template>
  <div class="collab-lab__pair">
    <NuiCollapsible v-model:open="hintsOpen" label="Что проверить">
      <ol class="collab-lab__hints">
        <li v-for="hint in hints" :key="hint">{{ hint }}</li>
      </ol>
    </NuiCollapsible>
    <div class="collab-lab__frames">
      <section v-for="pane in panes" :key="pane.name" class="collab-lab__pane">
        <div class="collab-lab__pane-bar">
          <strong>{{ pane.name }}</strong>
          <NuiButton size="sm" variant="ghost" tone="neutral" @click="reload(pane.name)">
            Перезагрузить
          </NuiButton>
        </div>
        <iframe
          :key="`${pane.src}:${String(reloads[pane.name] ?? 0)}`"
          class="collab-lab__frame"
          :src="pane.src"
          :title="`${title}: ${pane.name}`"
          :data-testid="`collab-lab-${pane.key}`"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiCollapsible } from '@numior/vue';
import { computed, reactive, ref } from 'vue';

interface LabPane {
  readonly key: string;
  readonly name: string;
  readonly src: string;
}

const { kind, room } = defineProps<{ kind: 'editor' | 'book'; room: string }>();

const EDITOR_HINTS = [
  'Печатайте слева: текст появится справа, а рядом будет чужая каретка с именем и аватар сверху.',
  'Выключите «Связь» слева, измените текст в обеих панелях и включите связь: правки сольются.',
  'Введите /table, Enter. Выключите связь слева и измените одну ячейку в обеих панелях. После включения связи проигравшее значение появится в блоке «История» под документом у той панели, чья правка победила.',
  'Выключите связь слева, напишите текст и нажмите «Перезагрузить» над левой панелью: страница откроется заново со связью, правки сохранятся и уйдут Борису.',
  'Выделите текст и нажмите значок комментария в панельке над выделением: поповер откроется у текста. Щёлкните по подсвеченному тексту, чтобы открыть обсуждение снова; весь список — в кнопке «Обсуждения». В блоке «История» сохраните версию и восстановите её.',
];

const BOOK_HINTS = [
  'Щёлкните ячейку слева и протяните выделение: справа появятся цветная рамка с именем и заливка диапазона, а вверху — аватар второго участника. Перейдите на другой лист слева: рамка справа исчезнет, аватар останется.',
  'Введите 2 в A1 слева и =A1*3 в B1 справа: формула посчитается в обеих панелях, а смена A1 пересчитает её.',
  'Вставьте строку выше через правую кнопку на ячейке справа: данные слева сдвинутся.',
  'Выключите «Связь» слева, введите значение, вставьте строку справа и включите связь: значение сдвинется вслед за строкой.',
  'Введите значение слева и нажмите Ctrl+Z: оно исчезнет и справа.',
  'Нажмите «+» у вкладок: новый лист появится у обоих. Измените ширину разных колонок в двух панелях: обе ширины сохранятся.',
];

const reloads = reactive<Record<string, number>>({});
const hintsOpen = ref(true);

const title = computed(() => (kind === 'editor' ? 'Редактор' : 'Книга'));

const hints = computed(() => (kind === 'editor' ? EDITOR_HINTS : BOOK_HINTS));

const paneSrc = (user: string, persisted: boolean): string => {
  const query = new URLSearchParams({ user });

  if (kind === 'book') {
    query.set('book', '1');
    query.set('doc', `book-${room}`);
  } else {
    query.set('doc', room);
  }
  if (persisted && kind === 'editor') {
    query.set('offline', '1');
  }
  return `/collab?${query.toString()}`;
};

const panes = computed((): readonly LabPane[] => [
  { key: 'left', name: 'Анна', src: paneSrc('Анна', true) },
  { key: 'right', name: 'Борис', src: paneSrc('Борис', false) },
]);

const reload = (name: string): void => {
  reloads[name] = (reloads[name] ?? 0) + 1;
};
</script>
