<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Sign in</NuiCardTitle>
      <NuiCardDescription>Enter the code we emailed you</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiOtpField v-model="code" label="Code from the email" :description="`Sent to ${email}`" />
    </NuiCardContent>
    <NuiCardFooter class="flex justify-between gap-2">
      <NuiButton variant="ghost" tone="neutral">Send again</NuiButton>
      <NuiButton :disabled="code.length < LENGTH">Sign in</NuiButton>
    </NuiCardFooter>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardTitle,
  NuiOtpField,
} from '@numior/kit';
import { team } from '#demo/team';

const LENGTH = 6;

const [{ email }] = team;

const code = ref('');
</script>
