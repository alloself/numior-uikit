# Avatar

A person's photo, initials or icon.

<Example name="avatar/Basic" />

Pass the photo in `src` and the name in `name`: without a photo the avatar shows the initials.

## Installation

```ts install
import { NuiAvatar, NuiAvatarGroup } from '@numior/kit';
```

## Usage

Change the size, the shape and the status.

<Configurator name="NuiAvatar" />

## Examples

### Show a team

Pass the people in `items` and cap how many show with `max`.

<Example name="avatar/Group" />

### Show a status

Set `status` to tell whether the person is online, busy or away.

<Example name="avatar/Status" />

### Add a counter to the corner

Put a [Badge](/en/components/badge) into the `badge` slot.

<Example name="avatar/Badge" />

## Behavior

A photo that fails to load gives way to the initials from the first and last words of `name`.
Without a name, an icon shows.

## Accessibility

A screen reader names the avatar by `alt` or `name` and skips an avatar without either. The
status dot has its own label, such as "Online" or "Busy", and `statusLabel` replaces it. Name a
group with `label`.

## API

<ApiReference :names="['NuiAvatar', 'NuiAvatarGroup']" />
