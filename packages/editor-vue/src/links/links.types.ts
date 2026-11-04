import type { IconSource } from '@numior/primitives';
import type { NodeId } from '@numior/editor-core';
import { type NuiContentNodeType } from '@numior/content';

export interface NuiEditorLinkPreview {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly image?: string | undefined;
  readonly icon?: string | undefined;
  readonly site?: string | undefined;
}

export type NuiEditorLinkMetadata = (
  url: string,
  context: { readonly signal: AbortSignal },
) => Promise<NuiEditorLinkPreview>;

export interface PastedLink {
  readonly url: string;
  readonly block: NodeId;
}

export type LinkKind = typeof NuiContentNodeType.Embed | typeof NuiContentNodeType.Bookmark;

export interface LinkDetails {
  readonly title: string;
  readonly description: string;
}

export interface LinkEdit {
  readonly url: string;
  readonly label: string;
  readonly valid: (url: string) => boolean;
  readonly invalidText: string;
  readonly details?: LinkDetails | undefined;
}

export interface LinkChange {
  readonly url: string;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
}

export interface LinkBarAction {
  readonly key: string;
  readonly label: string;
  readonly icon: IconSource;
  readonly href?: string | undefined;
  readonly run?: (() => void) | undefined;
}
