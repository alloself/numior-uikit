import type { IconAlias } from '@numior/primitives';
import { NuiContentFileKind } from './content.types';

export const CONTENT_FILE_ICONS: Readonly<Record<NuiContentFileKind, IconAlias>> = {
  [NuiContentFileKind.File]: 'file',
  [NuiContentFileKind.Image]: 'file-image',
  [NuiContentFileKind.Video]: 'file-video',
  [NuiContentFileKind.Audio]: 'file-audio',
  [NuiContentFileKind.Pdf]: 'file-pdf',
  [NuiContentFileKind.Archive]: 'file-archive',
  [NuiContentFileKind.Sheet]: 'file-sheet',
  [NuiContentFileKind.Text]: 'file-text',
};
