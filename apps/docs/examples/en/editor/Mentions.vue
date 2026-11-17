<template>
  <div class="w-full">
    <NuiEditor
      v-model="note"
      :mentions="mentions"
      label="Note on order 20411"
      placeholder="Type @ to bring in a teammate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { foldText } from '@numior/kit';
import { NuiEditor, type NuiEditorMention, type NuiEditorMentions } from '@numior/kit/editor';
import { team } from '#demo/team';

const note = ref('<p>The customer wants both armchairs reupholstered in dark linen. </p>');

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
