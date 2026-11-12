import type { Profile } from './parity.types';

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const REST = {
  direction: 'ltr',
  density: 'comfortable',
  accent: null,
  states: false,
  stills: true,
  motion: false,
} as const;

const motionTwin = (profile: Profile): Profile => ({
  ...profile,
  id: `${profile.id}-motion`,
  dpr: 1,
  stills: false,
  motion: true,
});

export const DEFAULT_PROFILE: Profile = {
  ...REST,
  ...DESKTOP,
  id: 'pg-light-1440',
  target: 'playground',
  scheme: 'light',
  dpr: 1,
  states: true,
  motion: true,
};

const PG_DARK: Profile = {
  ...REST,
  ...DESKTOP,
  id: 'pg-dark-1440',
  target: 'playground',
  scheme: 'dark',
  dpr: 1.25,
  states: true,
};

const DOCS_DARK: Profile = {
  ...REST,
  ...DESKTOP,
  id: 'docs-dark-1440',
  target: 'docs',
  scheme: 'dark',
  dpr: 1.25,
  states: true,
};

const DOCS_PHONE: Profile = {
  ...REST,
  ...PHONE,
  id: 'docs-light-390',
  target: 'docs',
  scheme: 'light',
  dpr: 1.25,
  states: true,
};

export const PROFILES: readonly Profile[] = [
  DEFAULT_PROFILE,
  PG_DARK,
  motionTwin(PG_DARK),
  { ...REST, ...PHONE, id: 'pg-light-390', target: 'playground', scheme: 'light', dpr: 1.25 },
  { ...REST, ...PHONE, id: 'pg-dark-390', target: 'playground', scheme: 'dark', dpr: 1 },
  {
    ...REST,
    ...DESKTOP,
    id: 'pg-rtl-1440',
    target: 'playground',
    scheme: 'light',
    dpr: 1,
    direction: 'rtl',
  },
  {
    ...REST,
    ...DESKTOP,
    id: 'pg-compact-1440',
    target: 'playground',
    scheme: 'light',
    dpr: 1,
    density: 'compact',
    states: true,
    motion: true,
  },
  {
    ...REST,
    ...DESKTOP,
    id: 'pg-rose-1440',
    target: 'playground',
    scheme: 'dark',
    dpr: 1,
    accent: 'rose',
  },
  {
    ...REST,
    ...DESKTOP,
    id: 'docs-light-1440',
    target: 'docs',
    scheme: 'light',
    dpr: 1,
    states: true,
    motion: true,
  },
  DOCS_DARK,
  motionTwin(DOCS_DARK),
  DOCS_PHONE,
  motionTwin(DOCS_PHONE),
  { ...REST, ...PHONE, id: 'docs-dark-390', target: 'docs', scheme: 'dark', dpr: 1 },
  {
    ...REST,
    ...DESKTOP,
    id: 'docs-base-light-1440',
    target: 'docs',
    scheme: 'light',
    dpr: 1,
    accent: 'indigo',
  },
  {
    ...REST,
    ...DESKTOP,
    id: 'docs-base-dark-1440',
    target: 'docs',
    scheme: 'dark',
    dpr: 1,
    accent: 'indigo',
  },
];

export const takesStillStates = (profile: Profile): boolean => profile.states && profile.stills;
