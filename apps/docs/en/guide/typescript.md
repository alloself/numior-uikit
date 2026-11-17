# TypeScript

How component types work in templates and what to set in `tsconfig.json`.

## Set up the compiler

Turn on module resolution through the `exports` field:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

The packages declare their types in `exports`, so the legacy `node` mode cannot find them.
The `node16` and `nodenext` modes work too.

The package types are checked with `strict`, `exactOptionalPropertyTypes` and
`noUncheckedIndexedAccess`. Turn these flags on in your project: the component types hold up.

## Describe the value type

Type the options as `NuiOptionSource<T>`, and `v-model` takes only values of `T`:

<Example name="guide/Typed" />

A typo in `value` or an extra status now gets underlined in the editor. `NuiCombobox`,
`NuiRadioGroup`, `NuiCheckboxGroup`, `NuiToggleGroup`, `NuiTree` and `NuiList` infer the value
type the same way.

## Take prop values from constants

Import the constant named after the prop type to avoid typing strings by hand:

```vue
<template>
  <NuiButton :variant="NuiButtonVariant.Soft" :size="NuiButtonSize.Sm">Save</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, NuiButtonSize, NuiButtonVariant } from '@numior/kit';
</script>
```

The strings `'soft'` and `'sm'` work as well: the prop type is made of the same values. The
constants help when the value lives in data or comes from a function.

## Keep a set of props in an object

Type the object as `Nui<Name>Props` and pass it with `v-bind`:

```vue
<template>
  <NuiButton v-bind="quiet">Cancel</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, type NuiButtonProps } from '@numior/kit';

const quiet: NuiButtonProps = { variant: 'ghost', tone: 'neutral', size: 'sm' };
</script>
```

Every component has such a type: `NuiSelectProps`, `NuiDialogProps`, `NuiTableProps`.

## Call a component method

Get a reference to the component with `useTemplateRef` and call its method:

<Example name="guide/Focus" />

The methods of a component are listed in the API section of its page.
