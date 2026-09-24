import type { VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

export const choosePageSize = async (wrapper: VueWrapper, size: number): Promise<void> => {
  await wrapper.find('[role="combobox"]').trigger('keydown', { key: 'ArrowDown' });
  await nextTick();

  const option = wrapper
    .findAll<HTMLElement>('[role="option"]')
    .find((entry) => entry.text() === String(size));

  if (!option) {
    throw new Error(`No page size ${size}`);
  }
  await option.trigger('click');
  await nextTick();
};
