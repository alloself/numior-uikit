<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiField, NuiInput, NuiTextarea } from '@numior/vue';

const name = ref('');
const email = ref('');
const bio = ref('');
const submitted = ref(0);
const emailError = computed(() =>
  email.value && !email.value.includes('@') ? 'Укажите адрес с символом @' : undefined,
);
const output = computed(() =>
  JSON.stringify(
    { name: name.value, email: email.value, bio: bio.value, submitted: submitted.value },
    null,
    2,
  ),
);
function reset() {
  name.value = '';
  email.value = '';
  bio.value = '';
}
</script>

<template>
  <section class="panel" aria-labelledby="forms-title">
    <div class="section-heading">
      <h2 id="forms-title">Формы</h2>
      <span class="tag">NuiField · NuiInput · NuiTextarea</span>
    </div>
    <form class="form" @submit.prevent="submitted++" @reset.prevent="reset">
      <NuiField label="Имя" description="Как к вам обращаться" required>
        <NuiInput
          v-model="name"
          data-testid="input-name"
          placeholder="Алексей"
          autocomplete="name"
        />
      </NuiField>
      <NuiField label="Почта" description="Рабочий адрес" :error="emailError">
        <NuiInput v-model.trim="email" type="email" data-testid="input-email" autocomplete="email">
          <template #prefix>@</template>
        </NuiInput>
      </NuiField>
      <NuiField label="О себе">
        <NuiTextarea v-model="bio" data-testid="textarea-bio" />
      </NuiField>
      <NuiField label="Крупное поле">
        <NuiInput size="lg" data-testid="input-lg" />
      </NuiField>
      <NuiField label="Недоступное поле" disabled>
        <NuiInput model-value="Нельзя изменить" />
      </NuiField>
      <div class="nui-flex nui-gap-2">
        <NuiButton type="submit" data-testid="submit">Отправить</NuiButton>
        <NuiButton type="reset" variant="ghost" tone="neutral">Сбросить</NuiButton>
      </div>
    </form>
    <pre class="output" data-testid="forms-output">{{ output }}</pre>
  </section>
</template>
