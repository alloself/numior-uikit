---
description: Every Numior UI theme token with a sample and its value in the light and dark schemes.
---

# Tokens

A Numior UI theme is a set of Tailwind theme keys from `@numior/tokens/theme.css`. Here they all are, each with a sample, its name and its value.

To change the theme, set a key again in the `@theme` block of your Tailwind CSS file. The [Custom theme](/en/guide/custom-theme) guide walks through it.

## Surfaces and text

Page and panel backgrounds, three levels of text, and borders. `light-dark()` holds the value for both schemes.

<TokenReference section="surfaces" />

## Tones

Each tone has four tokens: a fill, the text on it, a soft fill and the text on the soft fill. The soft fill is derived from the main one, so you rarely set it yourself.

<TokenReference section="tones" />

## States

The focus ring, the opacity of disabled elements, and the hover and press steps. All tones share the same steps.

<TokenReference section="states" />

## Radius

The whole scale is derived from `--radius-base`. Change it and the other steps follow.

<TokenReference section="shape" />

## Spacing and sizes

The spacing scale, plus control heights and paddings for each size.

<TokenReference section="sizes" />

## Type

Font families, sizes, weights, line heights and caption styling.

<TokenReference section="type" />

## Code and charts

Syntax colors for `NuiCode` and the data series of charts.

<TokenReference section="code" />

## Shadows, motion and layers

Shadows, transition durations and the stacking order. Every component transition uses these durations.

<TokenReference section="effects" />
