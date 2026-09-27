import registry from 'virtual:nui-reference';
import type { ComponentReference } from '../reference/reference.types';

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
