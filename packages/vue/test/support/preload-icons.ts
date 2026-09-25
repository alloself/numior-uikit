const loaders = [
  () => import('lucide-vue-next/dist/esm/icons/check.js'),
  () => import('lucide-vue-next/dist/esm/icons/minus.js'),
  () => import('lucide-vue-next/dist/esm/icons/loader-circle.js'),
  () => import('lucide-vue-next/dist/esm/icons/chevron-down.js'),
  () => import('lucide-vue-next/dist/esm/icons/x.js'),
  () => import('lucide-vue-next/dist/esm/icons/search.js'),
  () => import('lucide-vue-next/dist/esm/icons/info.js'),
  () => import('lucide-vue-next/dist/esm/icons/circle-check.js'),
  () => import('lucide-vue-next/dist/esm/icons/triangle-alert.js'),
  () => import('lucide-vue-next/dist/esm/icons/circle-x.js'),
  () => import('lucide-vue-next/dist/esm/icons/chevron-right.js'),
  () => import('lucide-vue-next/dist/esm/icons/chevron-left.js'),
  () => import('lucide-vue-next/dist/esm/icons/chevrons-left.js'),
  () => import('lucide-vue-next/dist/esm/icons/chevrons-right.js'),
  () => import('lucide-vue-next/dist/esm/icons/ellipsis.js'),
  () => import('lucide-vue-next/dist/esm/icons/external-link.js'),
  () => import('lucide-vue-next/dist/esm/icons/user.js'),
  () => import('lucide-vue-next/dist/esm/icons/image.js'),
  () => import('lucide-vue-next/dist/esm/icons/inbox.js'),
  () => import('lucide-vue-next/dist/esm/icons/folder.js'),
  () => import('lucide-vue-next/dist/esm/icons/folder-open.js'),
  () => import('lucide-vue-next/dist/esm/icons/file.js'),
  () => import('lucide-vue-next/dist/esm/icons/arrow-up.js'),
  () => import('lucide-vue-next/dist/esm/icons/arrow-up-down.js'),
  () => import('lucide-vue-next/dist/esm/icons/grip-vertical.js'),
  () => import('lucide-vue-next/dist/esm/icons/plus.js'),
  () => import('lucide-vue-next/dist/esm/icons/clock.js'),
  () => import('lucide-vue-next/dist/esm/icons/calendar.js'),
];

await Promise.all(loaders.map((load) => load()));

export const preloadedIcons = loaders.length;
