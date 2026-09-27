import registry from 'virtual:nui-reference';
import type { CatalogReference, ComponentReference } from '../reference/reference.types';

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
