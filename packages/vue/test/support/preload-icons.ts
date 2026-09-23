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
];

await Promise.all(loaders.map((load) => load()));

export const preloadedIcons = loaders.length;
