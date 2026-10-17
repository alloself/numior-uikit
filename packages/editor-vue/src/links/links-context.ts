import type { NuiEmbed } from '@numior/content';
import type { NodeId } from '@numior/editor-core';
import { inject, provide, type InjectionKey } from 'vue';
import type { LinkKind } from './links.types';

export interface EditorLinkContext {
  readonly loading: ReadonlySet<NodeId>;
  readonly previews: boolean;
  embedOf(url: string, provider?: string): NuiEmbed | undefined;
  refresh(id: NodeId): void;
  turn(id: NodeId, kind: LinkKind): boolean;
  relink(id: NodeId, url: string): boolean;
  accepts(kind: LinkKind, url: string): boolean;
}

const LINKS: InjectionKey<EditorLinkContext> = Symbol('nui-editor-links');

export const provideEditorLinks = (context: EditorLinkContext): void => {
  provide(LINKS, context);
};

export const useEditorLinkContext = (): EditorLinkContext | undefined => inject(LINKS, undefined);
