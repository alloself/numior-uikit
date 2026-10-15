import { lazyIcon, type IconRegistry } from '@numior/primitives';

export const editorIcons: IconRegistry = {
  bold: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/bold.js')),
  italic: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/italic.js')),
  underline: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/underline.js')),
  strikethrough: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/strikethrough.js')),
  list: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/list.js')),
  'list-ordered': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/list-ordered.js')),
  'list-todo': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/list-todo.js')),
  quote: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/text-quote.js')),
  undo: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/undo-2.js')),
  redo: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/redo-2.js')),
  separator: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/separator-horizontal.js')),
  text: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/pilcrow.js')),
  'heading-1': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/heading-1.js')),
  'heading-2': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/heading-2.js')),
  'heading-3': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/heading-3.js')),
  'code-block': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/code-xml.js')),
  group: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/group.js')),
  'text-colour': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/baseline.js')),
};
