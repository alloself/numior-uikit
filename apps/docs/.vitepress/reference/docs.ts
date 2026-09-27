import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  ComponentDocs,
  ComponentReference,
  DescriptionMap,
  DocsMap,
  LocalizedText,
} from './reference.types.ts';

interface Described {
  readonly name: string;
  readonly description: LocalizedText | undefined;
}

const SECTIONS = ['props', 'models', 'events', 'slots', 'exposed'] as const;

type Section = (typeof SECTIONS)[number];

const describe = <T extends Described>(
  members: readonly T[],
  descriptions: DescriptionMap | undefined,
): T[] => members.map((member) => ({ ...member, description: descriptions?.[member.name] }));

export const applyDocs = (
  component: ComponentReference,
  docs: ComponentDocs | undefined,
): ComponentReference => ({
  ...component,
  props: describe(component.props, docs?.props),
  models: describe(component.models, docs?.models),
  events: describe(component.events, docs?.events),
  slots: describe(component.slots, docs?.slots),
  exposed: describe(component.exposed, docs?.exposed),
  keyboard: docs?.keyboard ?? [],
  configurator: docs?.configurator,
});

const isComplete = (text: LocalizedText | undefined): boolean =>
  text !== undefined && text.ru.trim() !== '' && text.en.trim() !== '';

const sectionProblems = (
  component: ComponentReference,
  docs: ComponentDocs,
  section: Section,
): string[] => {
  const members: readonly Described[] = component[section];
  const described = docs[section] ?? {};
  const names = new Set(members.map((member) => member.name));

  return [
    ...members
      .filter((member) => !isComplete(described[member.name]))
      .map(
        (member) => `${component.name}: ${section} "${member.name}" needs a RU and EN description`,
      ),
    ...Object.keys(described)
      .filter((name) => !names.has(name))
      .map((name) => `${component.name}: ${section} "${name}" does not exist`),
  ];
};

const configuratorProblems = (component: ComponentReference, docs: ComponentDocs): string[] => {
  const names = new Set(component.props.map((prop) => prop.name));

  return [...(docs.configurator?.props ?? []), ...Object.keys(docs.configurator?.values ?? {})]
    .filter((name) => !names.has(name))
    .map((name) => `${component.name}: configurator prop "${name}" does not exist`);
};

export const checkDocs = (component: ComponentReference, docs: ComponentDocs): string[] => [
  ...SECTIONS.flatMap((section) => sectionProblems(component, docs, section)),
  ...configuratorProblems(component, docs),
  ...(docs.keyboard ?? [])
    .filter((key) => !isComplete(key.description))
    .map((key) => `${component.name}: keyboard "${key.keys}" needs a RU and EN description`),
];

const isDocsMap = (value: unknown): value is DocsMap =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const docsExportOf = (module: unknown): unknown =>
  typeof module === 'object' && module !== null && 'default' in module ? module.default : undefined;

const isDocsFile = (name: string): boolean => name.endsWith('.ts') && !name.endsWith('.types.ts');

export const loadDocsDir = async (dir: string): Promise<DocsMap> => {
  const docs: Record<string, ComponentDocs> = {};

  for (const file of readdirSync(dir).filter(isDocsFile).toSorted()) {
    const map = docsExportOf(await import(pathToFileURL(join(dir, file)).href));

    if (!isDocsMap(map)) {
      throw new Error(`${join(dir, file)} must default-export a docs map`);
    }
    Object.assign(docs, map);
  }
  return docs;
};
