import { lazyIcon } from '@numior/primitives';

export const editorIcons = {
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
  'code-block': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/braces.js')),
  group: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/group.js')),
  'text-colour': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/baseline.js')),
  type: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/type.js')),
  'square-check': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/square-check.js')),
  'circle-chevron-down': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/circle-chevron-down.js'),
  ),
  pencil: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/pencil.js')),
  'between-vertical-start': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/between-vertical-start.js'),
  ),
  'between-horizontal-start': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/between-horizontal-start.js'),
  ),
  'between-horizontal-end': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/between-horizontal-end.js'),
  ),
  'between-vertical-end': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/between-vertical-end.js'),
  ),
  'align-start': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/text-align-start.js')),
  'align-center': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/text-align-center.js')),
  'align-end': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/text-align-end.js')),
  'image-up': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/image-up.js')),
  'wrap-inline': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/baseline.js')),
  'wrap-text': lazyIcon(() => import('lucide-vue-next/dist/esm/icons/text-wrap.js')),
  'wrap-break': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/between-horizontal-start.js'),
  ),
  download: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/download.js')),
  captions: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/captions.js')),
  embed: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/square-play.js')),
  bookmark: lazyIcon(() => import('lucide-vue-next/dist/esm/icons/bookmark.js')),
  'list-indent-increase': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/list-indent-increase.js'),
  ),
  'list-indent-decrease': lazyIcon(
    () => import('lucide-vue-next/dist/esm/icons/list-indent-decrease.js'),
  ),
};

declare module '@numior/primitives' {
  interface NuiIconSets {
    editor: typeof editorIcons;
  }
}
