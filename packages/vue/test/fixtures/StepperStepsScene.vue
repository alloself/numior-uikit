<template>
  <NuiStepper v-bind="props">
    <NuiStepperStep title="Install the package">
      <p>Run the install command.</p>
    </NuiStepperStep>
    <NuiStepperStep>
      <template #title>
        <h3 id="add-the-plugin">Add the plugin</h3>
      </template>
      <p>Register the plugin in the config.</p>
    </NuiStepperStep>
    <NuiStepperStep title="Use the components" />
  </NuiStepper>
</template>

<script setup lang="ts">
import { NuiStepper, NuiStepperStep, type NuiStepperProps } from '../../src';

const { props = { readonly: true } } = defineProps<{
  props?: Partial<NuiStepperProps> | undefined;
}>();
</script>
