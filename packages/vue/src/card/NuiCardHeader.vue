<template>
  <div class="nui-card__header">
    <div class="nui-card__heading"><slot /></div>
    <div v-if="$slots.actions" class="nui-card__actions"><slot name="actions" /></div>
  </div>
</template>

<script setup lang="ts"></script>
