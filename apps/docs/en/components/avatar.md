# Avatar

`NuiAvatar` shows the image from `src`, the initials from `name` without one or after a load
error, and an icon without a name. `status` draws a status dot with a label, `NuiAvatarGroup`
overlaps avatars and collapses the extra ones into "+N".

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

`items` and `max` show the first members and the number of hidden ones; the group hands the
shared `size` and `shape` to its children.

<Example name="avatar/Group" />

### A badge in the corner

The `badge` slot places a [Badge](/en/components/badge) with a counter or a dot in the corner.

<Example name="avatar/Badge" />

## Behaviour

The fallback chain is image → initials → icon. The initials come from the first letter of the
first and the last word of `name`. On the server a given `src` always renders an `<img>`, and a
load error replaces it in the browser without hydration mismatches.

## Accessibility

The avatar figure is a `role="img"` named from `alt` or `name`; without a name it is decorative.
The status dot is a separate `role="img"` labelled from `statusLabel` or the dictionary. The
group is a `role="group"` with `label`.

## API

<ApiReference :names="['NuiAvatar', 'NuiAvatarGroup']" />
