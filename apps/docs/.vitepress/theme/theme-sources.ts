import accents from '@numior/tokens/accents.css?raw';
import kit from '@numior/tokens/theme.css?raw';
import site from './numior.css?raw';
import { createThemeModel } from './theme-builder';

export const themeModel = createThemeModel({ kit, accents, site });
