# Why Numior

Where Numior UI comes from and when it is the wrong choice.

## Where it comes from

We build our own products on it: the CMS admin, back offices, editors. Whenever something was
missing, we added it here, not to the product. Now it is open.

## What is inside

- [Components](/en/components/button): fields, lists, overlays, navigation and feedback.
- A [table](/en/components/table/) and a [spreadsheet](/en/components/spreadsheet) with formulas
  and XLSX files.
- An [editor](/en/editor/) for documents made of blocks, and
  [collaboration](/en/editor/collaboration) on them.
- [Charts](/en/components/charts) you can move through with the keyboard.
- [Forms](/en/components/form) with validation rules and Zod, Valibot or ArkType schemas.

The table, editor, spreadsheet, charts and forms ship as separate packages and stay out of your
app until you import them.

## When it is the wrong choice

- The project runs on Vue 2 or another framework. The components need Vue 3.5 or later.
- Your users need older browsers. The two latest versions of Chrome, Edge, Firefox and Safari are
  supported, and the packages ship no polyfills.
