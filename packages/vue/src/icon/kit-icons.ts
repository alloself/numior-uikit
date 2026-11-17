import { lazyIcon, iconAliases, type IconAlias } from '@numior/primitives';
import type { Component } from 'vue';

const loaders = import.meta.glob<Component>(
  [
    './{arrow-down,arrow-left,arrow-left-right,arrow-right,arrow-up,arrow-up-down,calendar}.mjs',
    './{check,chevron-down,chevron-left,chevron-right,chevron-up,chevrons-left,chevrons-right}.mjs',
    './{chevrons-up-down,circle-check,circle-x,clipboard-paste,clock,code,columns-3,command}.mjs',
    './{copy,ellipsis,eraser,external-link,eye,eye-off,file,folder,folder-open,funnel}.mjs',
    './{file-archive,file-image,file-music,file-play,file-spreadsheet,file-text}.mjs',
    './{grip-horizontal,grip-vertical,hash,image,inbox,info,languages,link,list-tree}.mjs',
    './{loader-circle,maximize,menu,message-square-plus,minus,monitor,moon,move-horizontal,panel-left,plus}.mjs',
    './{rotate-cw,scissors,search,smartphone,sun,table-2,tablet,terminal,trash,triangle-alert}.mjs',
    './{upload,user,x}.mjs',
  ],
  { base: '../../node_modules/@lucide/vue/dist/esm/icons/', import: 'default' },
);

const loaded = new Map<IconAlias, Component>();

export const kitIcon = (alias: IconAlias): Component | undefined => {
  const known = loaded.get(alias);

  if (known !== undefined) {
    return known;
  }

  const load = loaders[`./${iconAliases[alias]}.mjs`];

  if (load === undefined) {
    return undefined;
  }

  const icon = lazyIcon(load);

  loaded.set(alias, icon);
  return icon;
};
