# FAQ

Short answers to common questions about Numior UI.

## Which Vue version do I need?

Vue 3.5 or later. Vue 2 is not supported.

## Does it work with Nuxt?

Yes. The `@numior/nuxt` module adds the styles, auto-imports for components and composables and
the theme script, and renders links with a `to` prop through `NuxtLink`. The setup is in the
[SSR and Nuxt](/en/guide/ssr) guide.

## Do the components render on the server?

Yes. They render without a DOM and hydrate without markup mismatches. What to pass from the server
is in the [SSR and Nuxt](/en/guide/ssr) guide.

## Can I include only the components I use?

Yes. Your bundler keeps only the components you import, because the packages mark CSS as their
only side effect. Styles come as one file per component too, and each component page names it.

## How do I change the language of the labels?

Built-in labels come in Russian and English, and the `locale` option picks the language. A prop
on the component always wins over the dictionary. Your own texts and new languages are covered in
the [Localization](/en/guide/localization) guide.

## Is there a dark theme and right-to-left support?

There are light, dark and system themes, an accent color and density. Switching them is covered
in the [Theming](/en/guide/theming) guide, right-to-left layout in the [RTL](/en/guide/direction)
guide.

## What is the license?

MIT.
