<template>
  <div class="w-full">
    <NuiEditor
      v-model="note"
      :mentions="mentions"
      label="Заметка к заказу 20411"
      placeholder="Наберите @, чтобы позвать коллегу"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { foldText } from '@numior/kit';
import { NuiEditor, type NuiEditorMention, type NuiEditorMentions } from '@numior/kit/editor';
import { team } from '#demo/team';

const note = ref('<p>Покупатель просит заменить обивку обоих кресел на тёмный лён. </p>');

const mentions: NuiEditorMentions = (query) => {
  const needle = foldText(query);

  return Promise.resolve(
    team.reduce<NuiEditorMention[]>((found, person) => {
      if (foldText(person.name).includes(needle)) {
        found.push({ id: person.id, label: person.name, description: person.role });
      }
      return found;
    }, []),
  );
};
</script>
