import type { NuiContentViews } from '../content/content.types';
import NuiContentFile from './NuiContentFile.vue';
import NuiContentImage from './NuiContentImage.vue';

export { NuiContentFile, NuiContentImage };

export const contentMediaViews: NuiContentViews = {
  image: NuiContentImage,
  file: NuiContentFile,
};

export { contentMessages } from './media.messages';
export type { NuiContentMessages } from './media.messages';
export type { NuiContentPackageMessages } from './messages.types';
