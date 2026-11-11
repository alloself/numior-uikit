import registry from 'virtual:nui-reference';
import type {
  CatalogReference,
  ComponentReference,
  DeclarationSlice,
  IconReference,
  TokenReference,
} from '../reference/reference.types';

export const loadComponentReference = async (name: string): Promise<ComponentReference> => {
  const loader = registry.components[name];

  if (loader === undefined) {
    throw new Error(`Unknown component in the docs reference: ${name}`);
  }
  const component = (await loader()).default;

  if (component === null) {
    throw new Error(`Unknown component in the docs reference: ${name}`);
  }
  return component;
};

export const loadCatalogReference = async (namespace: string): Promise<CatalogReference> => {
  const loader = registry.catalogs[namespace];

  if (loader === undefined) {
    throw new Error(`Unknown catalog in the docs reference: ${namespace}`);
  }
  const catalog = (await loader()).default;

  if (catalog === null) {
    throw new Error(`Unknown catalog in the docs reference: ${namespace}`);
  }
  return catalog;
};

export const loadDeclarationReference = async (name: string): Promise<DeclarationSlice> => {
  const loader = registry.declarations[name];

  if (loader === undefined) {
    throw new Error(`Unknown declaration in the docs reference: ${name}`);
  }
  const declaration = (await loader()).default;

  if (declaration === null) {
    throw new Error(`Unknown declaration in the docs reference: ${name}`);
  }
  return declaration;
};

export const loadTokenReference = async (): Promise<readonly TokenReference[]> =>
  (await import('virtual:nui-reference/tokens')).default;

export const loadIconReference = async (): Promise<readonly IconReference[]> =>
  (await import('virtual:nui-reference/icons')).default;
