<template>
  <div class="w-full">
    <NuiEditor v-model="guide" aria-label="Furniture care" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiEditor } from '@numior/editor-vue';

const guide = ref(`
<h2>Furniture care</h2>
<p>This guide ships to the customer with every order.</p>
<h3>In the first week</h3>
<ul>
  <li><input type="checkbox" checked> Peel the film off the legs</li>
  <li><input type="checkbox"> Air the room: the fabric smell fades in a couple of days</li>
  <li><input type="checkbox"> Tighten the screws after seven days</li>
</ul>
<div class="nui-content__callout nui-content__callout--tone-warning">
  <p>Keep oak furniture away from radiators: the wood dries out and cracks.</p>
</div>
<h3>Cleaning the upholstery</h3>
<div class="nui-content__columns">
  <div class="nui-content__column">
    <h4>Fabric</h4>
    <p>Vacuum once a week with a soft brush. Blot a stain with a damp cloth, do not rub.</p>
  </div>
  <div class="nui-content__column">
    <h4>Leather</h4>
    <p>Wipe with a dry soft cloth. Apply leather cream twice a year.</p>
  </div>
</div>
<details>
  <summary>If the wood gets scratched</summary>
  <p>Fill the scratch with a wax crayon that matches the wood and buff it with a dry cloth.</p>
</details>
`);
</script>
