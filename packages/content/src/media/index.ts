import { defineComponent, h, type Component } from 'vue';
import type { NuiContentViewProps, NuiContentViews } from '../content/content.types';
import type { NuiEmbedProvider } from '../content/embeds';
import NuiContentEmbed from './NuiContentEmbed.vue';
import NuiContentFile from './NuiContentFile.vue';
import NuiContentImage from './NuiContentImage.vue';

export { NuiContentEmbed, NuiContentFile, NuiContentImage };

export const contentEmbedView = (providers: readonly NuiEmbedProvider[]): Component =>
  defineComponent(
    (props: NuiContentViewProps) => () => h(NuiContentEmbed, { node: props.node, providers }),
    {
      props: ['node'],
    },
  );

export const contentMediaViews: NuiContentViews = {
  image: NuiContentImage,
  file: NuiContentFile,
  embed: NuiContentEmbed,
};

export { contentMessages } from './media.messages';
export type { NuiContentMessages } from './media.messages';
export type { NuiContentPackageMessages } from './messages.types';
