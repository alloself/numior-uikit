import type { NuiContentViews } from '../content/content.types';
import NuiContentEmbed from './NuiContentEmbed.vue';
import NuiContentFile from './NuiContentFile.vue';
import NuiContentImage from './NuiContentImage.vue';

export { NuiContentEmbed, NuiContentFile, NuiContentImage };

export const contentMediaViews: NuiContentViews = {
  image: NuiContentImage,
  file: NuiContentFile,
  embed: NuiContentEmbed,
};

export { contentMessages } from './media.messages';
export type { NuiContentMessages } from './media.messages';
export type { NuiContentPackageMessages } from './messages.types';
