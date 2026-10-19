import type { NuiMessageCatalog } from '@numior/primitives';

export interface NuiAvatarMessages {
  readonly online: string;
  readonly offline: string;
  readonly busy: string;
  readonly away: string;
}

export const avatarMessages: NuiMessageCatalog<NuiAvatarMessages> = {
  namespace: 'avatar',
  en: { online: 'Online', offline: 'Offline', busy: 'Busy', away: 'Away' },
  ru: { online: 'В сети', offline: 'Не в сети', busy: 'Занят', away: 'Нет на месте' },
};
