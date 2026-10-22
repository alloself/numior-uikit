import type { ExampleLocale } from '../examples/example.types.ts';
import type { ComponentReference, ReferenceBundle } from './reference.types.ts';

interface NamedMember {
  readonly name: string;
  readonly description: { readonly ru: string; readonly en: string } | undefined;
}

const SINGLE_RE = /<ApiReference\s+name="([^"]+)"/g;
const MANY_RE = /<ApiReference\s+:names="\[([^\]]+)\]"/g;

export const referencedComponents = (source: string): string[] => [
  ...new Set([
    ...[...source.matchAll(SINGLE_RE)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
    ...[...source.matchAll(MANY_RE)].flatMap((match) =>
      (match[1] ?? '').split(',').map((name) => name.trim().replaceAll(/['"]/g, '')),
    ),
  ]),
];

const memberLines = (members: readonly NamedMember[], locale: ExampleLocale): string[] =>
  members.map((member) =>
    member.description === undefined
      ? `- \`${member.name}\``
      : `- \`${member.name}\` — ${member.description[locale]}`,
  );

const componentText = (component: ComponentReference, locale: ExampleLocale): string =>
  [
    `### ${component.name}`,
    '',
    ...memberLines(
      [...component.props, ...component.models, ...component.events, ...component.slots],
      locale,
    ),
    '',
  ].join('\n');

export const apiSearchText = (
  bundle: ReferenceBundle,
  source: string,
  locale: ExampleLocale,
): string => {
  const components = referencedComponents(source).flatMap((name) => {
    const component = bundle.components[name];

    return component === undefined ? [] : [component];
  });

  return components.length === 0
    ? ''
    : `\n\n${components.map((component) => componentText(component, locale)).join('\n')}`;
};
