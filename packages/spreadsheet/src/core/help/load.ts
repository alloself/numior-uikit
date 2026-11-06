import { HelpLanguage, type FunctionHelpCatalog } from './help.types';

const loadRussian = async (): Promise<FunctionHelpCatalog> => {
  const { RU_FUNCTION_HELP } = await import('./ru');

  return RU_FUNCTION_HELP;
};

const loadEnglish = async (): Promise<FunctionHelpCatalog> => {
  const { EN_FUNCTION_HELP } = await import('./en');

  return EN_FUNCTION_HELP;
};

export const loadFunctionHelp = async (language: HelpLanguage): Promise<FunctionHelpCatalog> =>
  language === HelpLanguage.Ru ? loadRussian() : loadEnglish();
