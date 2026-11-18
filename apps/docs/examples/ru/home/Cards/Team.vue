<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Доступ к кабинету</NuiCardTitle>
      <NuiCardDescription>Кто видит заказы и что может менять</NuiCardDescription>
      <template #actions>
        <NuiButton variant="soft" size="sm" icon="plus">Пригласить</NuiButton>
      </template>
    </NuiCardHeader>
    <NuiCardContent class="flex flex-col gap-4">
      <div v-for="person in people" :key="person.id" class="flex items-center gap-3">
        <NuiAvatar :name="person.name" />
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-medium">{{ person.name }}</span>
          <span class="truncate text-sm text-muted-foreground">{{ person.email }}</span>
        </div>
        <div class="w-32 shrink-0">
          <NuiSelect
            v-model="access[person.id]"
            :options="levels"
            size="sm"
            :aria-label="`Доступ: ${person.name}`"
          />
        </div>
      </div>
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiAvatar,
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
  NuiSelect,
} from '@numior/kit';
import { team } from '#demo/team';

const levels = [
  { value: 'owner', label: 'Владелец' },
  { value: 'edit', label: 'Правка' },
  { value: 'view', label: 'Просмотр' },
];

const people = team.slice(0, 4);

const access = ref<Record<string, string | null>>({
  anna: 'owner',
  igor: 'edit',
  maria: 'edit',
  oleg: 'view',
});
</script>
