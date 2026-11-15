import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const SOURCES = [
  { dir: 'packages', consumer: false },
  { dir: 'apps/playground/src', consumer: true },
  { dir: 'apps/docs/.vitepress/theme', consumer: true },
  { dir: 'apps/docs/examples', consumer: true },
];

const SKIPPED = new Set(['node_modules', 'dist', 'test', 'bench', '.output', '.nuxt', 'cache']);

const SHARED = new Map([['nui-content', new Set(['editor-vue'])]]);

const isSource = (name) => /\.(?:css|vue)$/u.test(name);

const pathsOf = (dir, entry) => {
  const path = join(dir, entry.name);

  if (!entry.isDirectory()) {
    return isSource(entry.name) ? [path] : [];
  }
  return SKIPPED.has(entry.name) ? [] : walk(path);
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map((entry) => pathsOf(dir, entry)));

  return nested.flat();
};

const kebab = (name) =>
  name
    .replace(/^Nui/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .toLowerCase();

const packageOf = (path) => {
  const parts = relative(ROOT, path).split('/');

  return parts[0] === 'packages' ? parts[1] : `apps/${parts[1]}`;
};

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

const blockOf = (name) => name.split(/__|--/u)[0];

const ownerOf = (blocks, name) => {
  const segments = blockOf(name).split('-');

  for (let size = segments.length; size > 1; size -= 1) {
    const owner = blocks.get(segments.slice(0, size).join('-'));

    if (owner !== undefined) {
      return { block: segments.slice(0, size).join('-'), owner };
    }
  }
  return undefined;
};

const owns = (blocks, name, pack) => {
  const found = ownerOf(blocks, name);

  return found === undefined || found.owner === pack || SHARED.get(found.block)?.has(pack) === true;
};

const depthStep = (char) => (char === '(' ? 1 : char === ')' ? -1 : 0);

const closingOf = (text, open) => {
  let depth = 0;
  let end = open;

  do {
    depth += depthStep(text[end]);
    end += 1;
  } while (depth > 0 && end < text.length);

  return end;
};

const withoutGroups = (selector, names) => {
  const pattern = new RegExp(`:(?:${names.join('|')})\\(`, 'u');
  let rest = selector;
  let match = pattern.exec(rest);

  while (match !== null) {
    const end = closingOf(rest, match.index + match[0].length - 1);

    rest = `${rest.slice(0, match.index)}${rest.slice(end)}`;
    match = pattern.exec(rest);
  }
  return rest;
};

const splitTop = (text, separators) => {
  const parts = [];
  let depth = 0;
  let current = '';

  for (const char of text) {
    depth += depthStep(char);

    if (depth === 0 && separators.includes(char)) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== '');
};

const subjectClasses = (selector) => {
  const compounds = splitTop(withoutGroups(selector, ['not', 'has']), [' ', '>', '+', '~']);

  return [...(compounds.at(-1) ?? '').matchAll(/\.([\w-]+)/gu)].map((match) => match[1]);
};

const stylesOf = (path, source) => {
  if (path.endsWith('.css')) {
    return [{ text: source, offset: 0 }];
  }
  return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gu)].map((match) => ({
    text: match[1],
    offset: (match.index ?? 0) + match[0].indexOf(match[1]),
  }));
};

const rulesOf = (path, source) =>
  stylesOf(path, source).flatMap((style) =>
    [
      ...style.text
        .replace(/\/\*[\s\S]*?\*\//gu, (comment) => ' '.repeat(comment.length))
        .matchAll(/([^{};]+)\{/gu),
    ].flatMap((match) =>
      /^\s*(@|from\b|to\b|\d)/u.test(match[1])
        ? []
        : splitTop(match[1], [',']).map((selector) => ({
            selector,
            line: lineOf(source, style.offset + (match.index ?? 0)),
          })),
    ),
  );

const TAG = /<(Nui[A-Z][A-Za-z]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gu;

const classesOfTag = (attributes) => [
  ...[...attributes.matchAll(/(?:^|\s)class="([^"]*)"/gu)].flatMap((match) =>
    match[1].split(/\s+/u),
  ),
  ...[...attributes.matchAll(/:class="([^"]*)"/gu)].flatMap((match) =>
    [...match[1].matchAll(/'([\w-]+)'/gu)].map((literal) => literal[1]),
  ),
];

const CLASS_ATTRIBUTE = /(?:^|\s):?class="([^"]*)"/gu;
const BLOCK_TOKEN = /(?<![\w-])nui-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?/gu;

const templateOf = (path, source) => (path.endsWith('.vue') ? source.split('<script')[0] : '');

const classTokensOf = (template) =>
  [...template.matchAll(CLASS_ATTRIBUTE)].flatMap((attribute) =>
    [...attribute[1].matchAll(BLOCK_TOKEN)].map((token) => ({
      name: token[0],
      index: (attribute.index ?? 0) + attribute[0].indexOf(attribute[1]) + (token.index ?? 0),
    })),
  );

const files = (
  await Promise.all(
    SOURCES.map(async (source) =>
      (await walk(join(ROOT, source.dir))).map((path) => ({ path, consumer: source.consumer })),
    ),
  )
).flat();

const components = new Map(
  files.reduce((entries, file) => {
    const name = file.path.split('/').at(-1) ?? '';

    if (!file.consumer && /^Nui[A-Z]\w*\.vue$/u.test(name)) {
      entries.push([name.replace(/\.vue$/u, ''), packageOf(file.path)]);
    }
    return entries;
  }, []),
);

const blocks = new Map([...components].map(([name, pack]) => [`nui-${kebab(name)}`, pack]));

const sources = await Promise.all(
  files.map(async (file) => ({ ...file, source: await readFile(file.path, 'utf8') })),
);

const styled = new Set(
  sources.flatMap((file) =>
    rulesOf(file.path, file.source).flatMap((rule) => subjectClasses(rule.selector)),
  ),
);

const findings = sources.flatMap((file) => {
  const pack = packageOf(file.path);
  const where = relative(ROOT, file.path);

  const selectors = rulesOf(file.path, file.source).flatMap((rule) => {
    const classes = subjectClasses(rule.selector);
    const marked = classes.some((name) => !name.startsWith('nui-') || owns(blocks, name, pack));

    const foreign = classes.filter(
      (name) =>
        name.startsWith('nui-') &&
        !owns(blocks, name, pack) &&
        (!file.consumer || name !== blockOf(name)),
    );

    return foreign.length === 0 || (marked && !file.consumer)
      ? []
      : [`${where}:${rule.line}: ${rule.selector} styles ${foreign.join(', ')} from outside`];
  });

  const tags =
    file.consumer || !file.path.endsWith('.vue')
      ? []
      : [...file.source.split('<script')[0].matchAll(TAG)].flatMap((tag) => {
          return !components.has(tag[1]) || owns(blocks, `nui-${kebab(tag[1])}`, pack)
            ? []
            : classesOfTag(tag[2]).flatMap((name) =>
                styled.has(name)
                  ? [
                      `${where}:${lineOf(file.source, tag.index ?? 0)}: <${tag[1]}> carries the styled class .${name}`,
                    ]
                  : [],
              );
        });

  const borrowed = file.consumer
    ? []
    : classTokensOf(templateOf(file.path, file.source)).flatMap((token) =>
        owns(blocks, token.name, pack)
          ? []
          : [
              `${where}:${lineOf(file.source, token.index)}: the template borrows .${token.name} of @numior/${ownerOf(blocks, token.name)?.owner}`,
            ],
      );

  return [...selectors, ...tags, ...borrowed];
});

const PAUSABLE = /animation-play-state:\s*var\(--nui-animation-play-state\b/u;

const endless = sources.flatMap((file) =>
  stylesOf(file.path, file.source).flatMap((style) =>
    [...style.text.matchAll(/animation:[^;{}]*\binfinite\b[^;{}]*;/gu)].flatMap((match) => {
      const index = match.index ?? 0;

      const rule = style.text.slice(
        style.text.lastIndexOf('{', index),
        style.text.indexOf('}', index),
      );

      return PAUSABLE.test(rule)
        ? []
        : [`${relative(ROOT, file.path)}:${lineOf(file.source, style.offset + index)}`];
    }),
  ),
);

const POLAR_RELATIVE = /\b(?:oklch|lch|hsl|hwb)\(\s*from\b/gu;

const polar = sources.flatMap((file) =>
  stylesOf(file.path, file.source).flatMap((style) =>
    [...style.text.matchAll(POLAR_RELATIVE)].map(
      (match) =>
        `${relative(ROOT, file.path)}:${lineOf(file.source, style.offset + (match.index ?? 0))}`,
    ),
  ),
);

const COMPOSITED = new Set(['transform', 'translate', 'rotate', 'scale', 'opacity']);
const STEPPED = /\bstep-(?:start|end)\b|\bsteps\(/u;

const BRACES = new Map([
  ['{', 1],
  ['}', -1],
]);

const blockEnd = (text, open) => {
  let depth = 0;
  let end = open;

  do {
    depth += BRACES.get(text[end]) ?? 0;
    end += 1;
  } while (depth > 0 && end < text.length);

  return end;
};

const keyframesOf = (text) =>
  [...text.matchAll(/@keyframes\s+([\w-]+)\s*\{/gu)].map((match) => {
    const open = (match.index ?? 0) + match[0].length - 1;
    const body = text.slice(open, blockEnd(text, open));

    return [match[1], new Set([...body.matchAll(/([\w-]+)\s*:/gu)].map((found) => found[1]))];
  });

const keyframes = new Map(
  sources.flatMap((file) =>
    stylesOf(file.path, file.source).flatMap((style) => keyframesOf(style.text)),
  ),
);

const paintedOf = (name) =>
  [...(keyframes.get(name) ?? [])].filter((property) => !COMPOSITED.has(property));

const offCompositor = sources.flatMap((file) =>
  stylesOf(file.path, file.source).flatMap((style) =>
    [...style.text.matchAll(/animation:[^;{}]*\binfinite\b[^;{}]*;/gu)].flatMap((match) => {
      const name = match[0].split(/[\s:;]+/u).find((word) => keyframes.has(word));
      const painted = paintedOf(name);
      const composited = painted.length === 0 || STEPPED.test(match[0]);

      return composited
        ? []
        : [
            `${relative(ROOT, file.path)}:${lineOf(file.source, style.offset + (match.index ?? 0))}: ${name} animates ${painted.join(', ')}`,
          ];
    }),
  ),
);

if (findings.length > 0) {
  console.error(
    `Kit components are styled from outside their package (use props, own wrappers or a kit API):\n${findings.join('\n')}`,
  );

  process.exitCode = 1;
} else {
  console.log('kit styles: no outside overrides');
}

if (endless.length > 0) {
  console.error(
    `Infinite animations must pause through animation-play-state: var(--nui-animation-play-state, running):\n${endless.join('\n')}`,
  );

  process.exitCode = 1;
} else {
  console.log('kit styles: every infinite animation can be paused');
}

if (polar.length > 0) {
  console.error(
    `Relative colours change lightness through oklab(from … l a b): Chrome 157 drops the hue of oklch(from color-mix(…)):\n${polar.join('\n')}`,
  );

  process.exitCode = 1;
} else {
  console.log('kit styles: relative colours keep their hue');
}

if (offCompositor.length > 0) {
  console.error(
    `Infinite animations must animate only ${[...COMPOSITED].join(', ')} or move in steps (anything else wakes the main thread on every frame):\n${offCompositor.join('\n')}`,
  );

  process.exitCode = 1;
} else {
  console.log('kit styles: every infinite animation runs off the main thread');
}
