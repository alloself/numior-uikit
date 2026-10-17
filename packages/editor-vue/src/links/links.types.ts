import type { IconAlias } from '@numior/primitives';
import type { NodeId } from '@numior/editor-core';

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

export type LinkKind = 'embed' | 'bookmark';

export interface LinkAddress {
  readonly url: string;
  readonly valid: (url: string) => boolean;
  readonly invalidText: string;
}

export interface LinkBarAction {
  readonly key: string;
  readonly label: string;
  readonly icon: IconAlias;
  readonly href?: string | undefined;
  readonly run?: (() => void) | undefined;
}
