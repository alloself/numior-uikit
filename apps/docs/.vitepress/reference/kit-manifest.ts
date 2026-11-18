import type { KitComponent, KitManifest } from '@numior/kit/vite';
import { kitEntries } from './kit-entries.ts';
import { kitStylesheets } from './stylesheets.ts';

const COMPONENT_NAME = /^Nui[A-Z]/u;
const COMPONENT_FILE = '.vue';

export const kitManifest = (root: string): KitManifest => {
  const sheets = kitStylesheets(root);
  const kit = kitEntries(root);
  const components: Record<string, KitComponent> = {};
  const exports: Record<string, readonly string[]> = {};

  for (const script of kit.scripts) {
    for (const [name, file] of sheets.exports(script.file)) {
      const styles = sheets.of(file).map(kit.sheet);
      const component = COMPONENT_NAME.test(name) && file.endsWith(COMPONENT_FILE);

      if (component && components[name] === undefined) {
        components[name] = { from: script.specifier, styles };
        continue;
      }
      if (component || styles.length === 0 || exports[name] !== undefined) {
        continue;
      }
      exports[name] = styles;
    }
  }
  return { order: sheets.order.map(kit.sheet), components, exports };
};
