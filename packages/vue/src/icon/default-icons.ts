import { lazyIcon, type IconRegistry } from '@numior/primitives';

export const defaultIcons: IconRegistry = {
  check: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/check.js')),
  minus: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/minus.js')),
  loader: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/loader-circle.js')),
  'chevron-down': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/chevron-down.js')),
  x: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/x.js')),
  search: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/search.js')),
  info: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/info.js')),
  success: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/circle-check.js')),
  warning: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/triangle-alert.js')),
  error: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/circle-x.js')),
};
