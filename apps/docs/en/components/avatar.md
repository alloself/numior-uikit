# Avatar

`NuiAvatar` shows the picture from `src`; without one, or after a load error, it shows
initials from `name`, and without a name the `user` icon. `size` (`sm`…`xl`) and `shape`
(`circle`, `square`) set the geometry, `status` draws a labelled status dot and the `badge`
slot puts a [badge](/en/components/badge) in the corner. `NuiAvatarGroup` overlaps avatars,
collapses the rest into "+N" and shares `size` and `shape` with its children. Grouped avatars
and the status dot wear a ring in `--nui-ring`: a third colour distinct from both the surface
and a muted card, so the overlap reads on any background.

<div class="vp-raw nui-demo" data-nui-theme="light">
  <NuiAvatar src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%234f46e5'/%3E%3Ccircle cx='32' cy='24' r='11' fill='%23fff'/%3E%3Cellipse cx='32' cy='54' rx='20' ry='14' fill='%23fff'/%3E%3C/svg%3E" name="Alice Brown" status="online" />
  <NuiAvatar src="/missing.png" name="Alice Brown" />
  <NuiAvatar shape="square" />
  <NuiAvatar name="Bob Stone" status="busy" size="lg">
    <template #badge><NuiBadge tone="error" :count="5" size="sm" /></template>
  </NuiAvatar>
  <NuiAvatar name="Cara Lee" status="away" size="xl" shape="square" />
  <NuiAvatarGroup :items="[{ name: 'Alice Brown' }, { name: 'Bob Stone' }, { name: 'Cara Lee' }, { name: 'Dan Wu' }, { name: 'Eve Park' }]" :max="3" size="lg" label="Team" />
</div>

```vue
<script setup lang="ts">
import { NuiAvatar, NuiAvatarGroup } from '@numior/vue';
import '@numior/vue/styles/avatar.css';
</script>

<template>
  <NuiAvatar :src="user.photo" :name="user.name" status="online" />
  <NuiAvatarGroup :max="3" size="lg" label="Team">
    <NuiAvatar v-for="member in team" :key="member.id" :name="member.name" />
  </NuiAvatarGroup>
</template>
```

## Behaviour

The fallback chain is picture → initials → icon. Initials come from the first letter of the
first and last word of `name` (1–2 characters, upper case). On the server an `<img>` is always
rendered when `src` is set: a load error exists only in the browser, and after it Vue swaps
the picture for the fallback without a hydration mismatch. A new `src` tries the picture again.

In a group `items` wins over the slot; without `max` every avatar is shown. The overflow is a
regular `NuiAvatar` with the text `+N` (`overflowLabel` changes the format). A child's own
`size`/`shape` wins over the group's.

## Accessibility

The avatar figure is `role="img"` named by `alt ?? name`; without a name it is decorative
(`aria-hidden="true"`). The status dot is a separate `role="img"` labelled by `statusLabel`
or the built-in map (`Online`, `Offline`, `Busy`, `Away`); pass localised text. The group is
`role="group"` with `label`.

## API

| Prop          | Type                                        | Default    | Description                     |
| ------------- | ------------------------------------------- | ---------- | ------------------------------- |
| `src`         | `string`                                    | —          | Picture                         |
| `alt`         | `string`                                    | `name`     | Name of the picture and figure  |
| `name`        | `string`                                    | —          | Source of the initials and name |
| `size`        | `'sm' \| 'md' \| 'lg' \| 'xl'`              | `'md'`     | 1.5 / 2 / 2.5 / 3.5rem          |
| `shape`       | `'circle' \| 'square'`                      | `'circle'` | Shape                           |
| `status`      | `'online' \| 'offline' \| 'busy' \| 'away'` | —          | Status dot                      |
| `statusLabel` | `string`                                    | map        | Label of the dot                |
| `icon`        | `IconAlias`                                 | `'user'`   | Icon of the last fallback       |

`NuiAvatarGroup`: `items?: NuiAvatarItem[]`, `max`, `size`, `shape`, `label`,
`overflowLabel?: (count) => string`. Blocks `nui-avatar` (modifiers `--size-*`, `--shape-*`,
`--status-*`, `--grouped`; elements `__figure`, `__image`, `__initials`, `__icon`, `__status`,
`__badge`; variables `--_size`, `--_radius`, `--_font-size`, `--_status-tone`) and
`nui-avatar-group` (`--size-*`, element `__overflow`, variable `--_overlap`).
