import MagicString from 'magic-string';
import { componentName } from './names';
import type { KitManifest } from './vite.types';

const RESOLVED = /_resolveComponent\((["'])(Nui[A-Za-z0-9]+|nui-[a-z0-9-]+)\1(?:,\s*true)?\)/gu;
const LOCAL_PREFIX = '__nui_';

const importLines = (imports: ReadonlyMap<string, string>): string => {
  const byModule = [...imports].reduce((modules, [name, from]) => {
    modules.set(from, [...(modules.get(from) ?? []), `${name} as ${LOCAL_PREFIX}${name}`]);

    return modules;
  }, new Map<string, string[]>());

  return [...byModule]
    .map(([from, names]) => `import { ${names.join(', ')} } from '${from}';\n`)
    .join('');
};

export const importKitComponents = (
  code: string,
  manifest: KitManifest,
): MagicString | undefined => {
  const output = new MagicString(code);
  const imports = new Map<string, string>();

  for (const match of code.matchAll(RESOLVED)) {
    const name = componentName(match[2] ?? '');
    const from = manifest.components[name]?.from;

    if (from === undefined) {
      continue;
    }
    imports.set(name, from);
    output.overwrite(match.index, match.index + match[0].length, `${LOCAL_PREFIX}${name}`);
  }

  return imports.size === 0 ? undefined : output.prepend(importLines(imports));
};
