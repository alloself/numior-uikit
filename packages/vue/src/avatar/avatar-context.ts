import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import type { NuiAvatarShape, NuiAvatarSize } from './avatar.types';

export interface AvatarGroupContext {
  readonly size: ComputedRef<NuiAvatarSize>;
  readonly shape: ComputedRef<NuiAvatarShape>;
}

const AVATAR_GROUP_KEY: InjectionKey<AvatarGroupContext> = Symbol('nui:avatar-group');

export const provideAvatarGroup = (context: AvatarGroupContext): void => {
  provide(AVATAR_GROUP_KEY, context);
};

export const useAvatarGroup = (): AvatarGroupContext | null => inject(AVATAR_GROUP_KEY, null);
