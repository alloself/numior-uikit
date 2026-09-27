import registry from 'virtual:nui-examples';
import type { ExampleLocale, ExampleModule } from '../examples/example.types';

export const exampleLocaleOf = (localeIndex: string): ExampleLocale =>
  localeIndex === 'en' ? 'en' : 'ru';

export const loadExample = async (locale: ExampleLocale, name: string): Promise<ExampleModule> => {
  const loader = registry[locale][name];

  if (loader === undefined) {
    throw new Error(`Unknown docs example: ${locale}/${name}`);
  }
  return (await loader()).default;
};
