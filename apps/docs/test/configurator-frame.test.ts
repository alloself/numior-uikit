import { describe, expect, it } from 'vite-plus/test';
import {
  configurableButton,
  configurableScene,
  configurableSeparator,
  ConfiguratorFrameDriver,
  sendScene,
} from './drivers/configurator-frame';

describe('ConfiguratorFrame', () => {
  it('renders the live component with the configured props and the default content', async () => {
    const frame = ConfiguratorFrameDriver.mount(configurableButton());

    expect(frame.button.text()).toBe('Сохранить');
    expect(frame.button.classes()).toContain('nui-button--variant-solid');
    expect(frame.optionNames).toEqual(['variant', 'Содержимое', 'disabled']);

    await frame.showCode();
    expect(frame.code).toBe('<template>  <NuiButton>Сохранить</NuiButton></template>');

    frame.unmount();
  });

  it('leaves the default slot alone when the component takes no content', () => {
    const frame = ConfiguratorFrameDriver.mount(configurableSeparator());

    expect(frame.separatorLabel).toBe('или');

    frame.unmount();
  });

  it('reflects panel changes in the preview and the generated code', async () => {
    const frame = ConfiguratorFrameDriver.mount(configurableButton());

    await frame.choose('variant', 'soft');
    expect(frame.button.classes()).toContain('nui-button--variant-soft');

    await frame.toggle('disabled');
    expect(frame.button.element.disabled).toBe(true);

    await frame.typeContent('Отправить');
    await frame.showCode();

    expect(frame.code).toBe(
      '<template>  <NuiButton variant="soft" disabled>Отправить</NuiButton></template>',
    );

    await frame.reset();
    expect(frame.code).toBe('<template>  <NuiButton>Сохранить</NuiButton></template>');

    frame.unmount();
  });

  it('configures a scene with its own data and prints the scene with the chosen props', async () => {
    const frame = ConfiguratorFrameDriver.mount(configurableScene(), sendScene());

    expect(frame.button.text()).toBe('Отправить');
    expect(frame.choicesOf('variant')).toEqual(['solid', 'soft']);
    expect(frame.optionNames).toEqual(['variant', 'disabled']);

    await frame.choose('variant', 'soft');
    await frame.button.trigger('click');
    expect(frame.button.text()).toBe('Отправлено');
    expect(frame.button.classes()).toContain('nui-button--variant-soft');

    await frame.showCode();
    expect(frame.fileNames).toEqual(['Example.vue', 'team.ts']);
    expect(frame.code).toContain('<NuiButton variant="soft" @click="sent = true">');

    frame.unmount();
  });
});
