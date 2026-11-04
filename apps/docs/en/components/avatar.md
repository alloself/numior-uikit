# Avatar

`NuiAvatar` shows a user's photo, and without one their initials or an icon. A status can sit
next to the avatar: online, busy, away.

<Example name="avatar/Basic" />

## Installation

```ts
import { NuiAvatar, NuiAvatarGroup } from '@numior/vue';
import '@numior/vue/styles/avatar.css';
```

## Usage

<Configurator name="NuiAvatar" />

## Examples

### A group

`NuiAvatarGroup` renders the members from `items`, overlapping each other. The `max` prop limits
how many avatars are shown, and the rest collapse into "+N". Set the size and the shape once on
the group with `size` and `shape`.

<Example name="avatar/Group" />

### A badge in the corner

Put a [Badge](/en/components/badge) into the `badge` slot to show a counter or a dot in the
corner.

<Example name="avatar/Badge" />

## Behaviour

The photo comes from `src`. When there is none or it fails to load, the avatar shows the initials
from `name`, the first letters of its first and last words. Without `name` an icon is shown.

The `status` prop accepts `online`, `offline`, `busy` and `away` and draws a dot of the matching
colour. `size` accepts `sm`, `md`, `lg` and `xl`, and `shape` accepts `circle` or `square`.

## Accessibility

A screen reader names the avatar by `alt` or `name` and skips an avatar without a name. The
status dot has its own label, such as "Online" or "Busy", which `statusLabel` replaces. Label
the group with `label`.

## API

<ApiReference :names="['NuiAvatar', 'NuiAvatarGroup']" />
