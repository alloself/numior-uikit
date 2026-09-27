import { describe, expect, it } from 'vitest';
import { configurableButton, ConfiguratorFrameDriver } from './drivers/configurator-frame';

describe('ConfiguratorFrame', () => {
  it('renders the live component with the configured props and the default content', () => {
    const frame = ConfiguratorFrameDriver.mount(configurableButton());

    expect(frame.button.text()).toBe('Сохранить');
    expect(frame.button.classes()).toContain('nui-button--variant-solid');
    expect(frame.fieldLabels).toEqual(['variant', 'disabled', 'Содержимое']);
    expect(frame.code).toBe('<template>  <NuiButton>Сохранить</NuiButton></template>');
    frame.unmount();
  });

  it('reflects panel changes in the preview and the generated code', async () => {
    const frame = ConfiguratorFrameDriver.mount(configurableButton());

    await frame.toggle('disabled');
    expect(frame.button.element.disabled).toBe(true);
    await frame.typeContent('Отправить');
    expect(frame.code).toBe('<template>  <NuiButton disabled>Отправить</NuiButton></template>');
    frame.unmount();
  });
});
