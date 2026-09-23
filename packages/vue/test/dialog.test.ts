import { describe, expect, it } from 'vitest';
import { DialogDriver } from './drivers/dialog';

describe('NuiDialog', () => {
  it('opens modally with title and description wired through aria attributes', () => {
    const dialog = DialogDriver.mount({
      props: { id: 'confirm', title: 'Delete project?', description: 'Cannot be undone.' },
    });
    expect(dialog.showModalCalls).toBe(1);
    expect(dialog.isOpen).toBe(true);
    expect(dialog.labelledBy).toBe('confirm-title');
    expect(dialog.describedBy).toBe('confirm-description');
    expect(dialog.titleText).toBe('Delete project?');
    expect(dialog.descriptionText).toBe('Cannot be undone.');
    expect(dialog.hasModifier('size-md')).toBe(true);
    dialog.unmount();
  });

  it('renders closed without aria references when nothing labels it', () => {
    const dialog = DialogDriver.mount({ open: false, props: { size: 'lg' } });
    expect(dialog.showModalCalls).toBe(0);
    expect(dialog.isOpen).toBe(false);
    expect(dialog.labelledBy).toBeUndefined();
    expect(dialog.describedBy).toBeUndefined();
    expect(dialog.hasModifier('size-lg')).toBe(true);
    dialog.unmount();
  });

  it('closes from the close button, Escape and the backdrop, reporting the return value', async () => {
    const dialog = DialogDriver.mount({ props: { title: 'Filters' } });
    await dialog.clickClose();
    expect(dialog.closedWith).toEqual(['']);
    expect(dialog.emittedOpen).toEqual([false]);
    expect(dialog.emittedClose).toEqual(['']);
    await dialog.reopen();
    expect(dialog.showModalCalls).toBe(2);
    expect(dialog.pressEscape()).toBe(false);
    expect(dialog.emittedOpen).toEqual([false, false]);
    await dialog.reopen();
    dialog.clickInside();
    expect(dialog.emittedOpen).toHaveLength(2);
    dialog.clickBackdrop();
    expect(dialog.emittedOpen).toEqual([false, false, false]);
    dialog.unmount();
  });

  it('keeps a non-closable dialog open on Escape and the backdrop and hides the close button', () => {
    const dialog = DialogDriver.mount({ props: { title: 'Required', closable: false } });
    expect(dialog.closeButton.exists()).toBe(false);
    expect(dialog.pressEscape()).toBe(true);
    dialog.clickBackdrop();
    expect(dialog.emittedOpen).toEqual([]);
    expect(dialog.isOpen).toBe(true);
    dialog.unmount();
  });

  it('renders footer and named slots', () => {
    const dialog = DialogDriver.mount({
      slots: { title: () => 'Custom title', footer: () => 'Actions' },
    });
    expect(dialog.titleText).toBe('Custom title');
    expect(dialog.labelledBy).toBeTruthy();
    expect(dialog.footer.text()).toBe('Actions');
    dialog.unmount();
  });

  it('draws a single backdrop for stacked dialogs by marking the upper ones nested', async () => {
    const base = DialogDriver.mount({ props: { title: 'Base' } });
    const upper = DialogDriver.mount({ props: { title: 'Upper' } });
    await upper.settle();
    expect(base.hasModifier('nested')).toBe(false);
    expect(upper.hasModifier('nested')).toBe(true);
    await base.receiveOpen(false);
    await upper.settle();
    expect(upper.hasModifier('nested')).toBe(false);
    upper.unmount();
    base.unmount();
  });
});
