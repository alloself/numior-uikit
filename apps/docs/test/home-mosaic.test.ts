import { afterEach, describe, expect, it } from 'vitest';
import { HomeMosaicDriver } from './drivers/home-mosaic';

describe('DocsHomeMosaic', () => {
  let mosaic: HomeMosaicDriver | undefined;

  afterEach(() => {
    mosaic?.unmount();
    mosaic = undefined;
  });

  it('renders the live form card with its own labels', async () => {
    mosaic = HomeMosaicDriver.mount();
    await mosaic.ready();
    expect(mosaic.nameLabel.text()).toBe('Название');
    expect(mosaic.nameLabel.attributes('for')).toBe(mosaic.nameInput.attributes('id'));
    expect(mosaic.switchLabel).toContain('Виден всей компании');
  });
});
