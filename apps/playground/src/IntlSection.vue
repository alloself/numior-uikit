<template>
  <section class="panel" aria-labelledby="intl-title">
    <div class="section-heading">
      <h2 id="intl-title">Числа и время</h2>
      <span class="tag">NuiNumberField · NuiTimeField · locale</span>
    </div>
    <div class="settings">
      <label
        >Локаль
        <select v-model="locale" data-testid="intl-locale">
          <option value="ru-RU">ru-RU</option>
          <option value="en-US">en-US</option>
          <option value="de-DE">de-DE</option>
          <option value="ar-EG">ar-EG</option>
        </select>
      </label>
    </div>
    <NuiConfigProvider :locale="locale">
      <div class="form">
        <NuiField label="Цена" description="Евро, шаг 0,5">
          <NuiNumberField
            v-model="price"
            data-testid="number-price"
            :min="0"
            :step="0.5"
            :format-options="{ style: 'currency', currency: 'EUR' }"
            increment-label="Увеличить"
            decrement-label="Уменьшить"
          />
        </NuiField>
        <NuiField label="Количество" description="От 0 до 10">
          <NuiNumberField
            v-model="quantity"
            data-testid="number-quantity"
            :min="0"
            :max="10"
            increment-label="Увеличить"
            decrement-label="Уменьшить"
          />
        </NuiField>
        <NuiField label="Скидка" description="Проценты без степперов">
          <NuiNumberField
            v-model="discount"
            data-testid="number-percent"
            :min="0"
            :max="1"
            :step="0.01"
            :steppers="false"
            :format-options="{ style: 'percent' }"
          />
        </NuiField>
        <NuiField label="Начало" description="С 09:00 до 18:00, шаг 30 минут">
          <NuiTimeField
            v-model="start"
            data-testid="time-start"
            min="09:00"
            max="18:00"
            :step="30"
            clock-label="Выбрать время"
            empty-label="Нет времени"
          />
        </NuiField>
        <NuiField label="Точное время" description="Секунды и 24 часа">
          <NuiTimeField
            v-model="precise"
            data-testid="time-precise"
            seconds
            hour-cycle="h23"
            clock-label="Выбрать точное время"
          />
        </NuiField>
        <NuiField label="Только чтение">
          <NuiNumberField
            :model-value="42"
            readonly
            increment-label="Увеличить"
            decrement-label="Уменьшить"
          />
        </NuiField>
        <NuiField label="Недоступно" disabled>
          <NuiTimeField model-value="10:30" clock-label="Выбрать время" />
        </NuiField>
      </div>
    </NuiConfigProvider>
    <pre class="output" data-testid="intl-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiConfigProvider, NuiField, NuiNumberField, NuiTimeField } from '@numior/vue';

const locale = ref('ru-RU');
const price = ref<number | null>(1234.5);
const quantity = ref<number | null>(null);
const discount = ref<number | null>(0.15);
const start = ref<string | null>(null);
const precise = ref<string | null>('13:05:09');
const output = computed(() =>
  JSON.stringify(
    {
      locale: locale.value,
      price: price.value,
      quantity: quantity.value,
      discount: discount.value,
      start: start.value,
      precise: precise.value,
    },
    null,
    2,
  ),
);
</script>
