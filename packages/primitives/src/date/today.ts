import { inject, provide, type InjectionKey } from 'vue';

export type TodayProvider = () => string;

export const TODAY_KEY: InjectionKey<TodayProvider> = Symbol('nui:today');

const pad = (value: number): string => String(value).padStart(2, '0');

export const localToday = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const provideToday = (today: TodayProvider): void => {
  provide(TODAY_KEY, today);
};

export const useToday = (): TodayProvider => inject(TODAY_KEY, localToday);
