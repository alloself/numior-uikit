import type { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { centreOf, layOutPivot } from '../support/pivot-geometry';

interface PointerAt {
  readonly x: number;
  readonly y: number;
  readonly touch?: boolean;
}

const PANEL = '.nui-spreadsheet-pivot';

const EDITOR = '.nui-spreadsheet-pivot__editor';

const ITEMS = '.nui-spreadsheet-pivot__items';

const trimmed = (element: Element): string => element.textContent?.trim() ?? '';

const pointer = (type: string, at: PointerAt): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 1,
    pointerType: at.touch === true ? 'touch' : 'mouse',
    clientX: at.x,
    clientY: at.y,
  });

export class PivotPanelDriver {
  constructor(private readonly wrapper: VueWrapper) {}

  private get panel(): DOMWrapper<Element> {
    return this.wrapper.find(PANEL);
  }

  get open(): boolean {
    return this.panel.exists();
  }

  get label(): string | undefined {
    const id = this.panel.element.closest('[role="dialog"]')?.getAttribute('aria-labelledby');

    return id === null || id === undefined
      ? undefined
      : document.getElementById(id)?.textContent?.trim();
  }

  get focused(): boolean {
    return this.panel.element.contains(document.activeElement);
  }

  get fields(): string[] {
    return this.panel.findAll('.nui-spreadsheet-pivot__field').map((field) => field.text());
  }

  get checkedFields(): string[] {
    return this.panel.findAll('.nui-spreadsheet-pivot__field').reduce<string[]>((names, field) => {
      const input = field.find('input').element;

      return input instanceof HTMLInputElement && input.checked ? [...names, field.text()] : names;
    }, []);
  }

  get announcement(): string {
    return this.panel.find('.nui-spreadsheet-pivot__live').text();
  }

  chips(area: string): string[] {
    return (
      this.areaOf(area)
        ?.findAll('.nui-spreadsheet-pivot__chip')
        .map((chip) => chip.text()) ?? []
    );
  }

  async check(field: string, on = true): Promise<void> {
    await this.panel
      .findAll('.nui-spreadsheet-pivot__field')
      .find((item) => item.text() === field)
      ?.find('input')
      .setValue(on);
  }

  async chooseAction(chip: string, action: string): Promise<void> {
    const menu = this.menuOf(chip);

    menu?.showPopover();
    await nextTick();

    [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
      .find((item) => trimmed(item) === action)
      ?.click();

    await nextTick();
  }

  async actions(chip: string): Promise<string[]> {
    const menu = this.menuOf(chip);

    menu?.showPopover();
    await nextTick();

    return [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].map(trimmed);
  }

  async pressOnChip(chip: string, key: string, alt = false): Promise<void> {
    const element = this.chip(chip);

    element?.focus();

    element?.dispatchEvent(
      new KeyboardEvent('keydown', { key, altKey: alt, bubbles: true, cancelable: true }),
    );

    await nextTick();
  }

  get focusedChip(): string | undefined {
    const active = document.activeElement;

    return active?.classList.contains('nui-spreadsheet-pivot__chip') === true
      ? trimmed(active)
      : undefined;
  }

  async press(key: string): Promise<void> {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );

    await nextTick();
  }

  get targetArea(): string | undefined {
    const title = this.panel.find(
      '.nui-spreadsheet-pivot__area--target .nui-spreadsheet-pivot__area-title',
    );

    return title.exists() ? title.text() : undefined;
  }

  get ghost(): string | undefined {
    const ghost = this.panel.find('.nui-spreadsheet-pivot__ghost--shown');

    return ghost.exists() ? ghost.text() : undefined;
  }

  async holdChip(chip: string, area: string, slot?: number): Promise<void> {
    const element = this.chip(chip);

    if (element !== undefined) {
      await this.hold(element, this.pointIn(area, slot));
    }
  }

  async dragChip(chip: string, area: string, slot?: number): Promise<void> {
    await this.holdChip(chip, area, slot);
    await this.release(this.pointIn(area, slot));
  }

  async dragChipToFields(chip: string): Promise<void> {
    layOutPivot(this.panel.element);

    const element = this.chip(chip);
    const list = this.panel.find('.nui-spreadsheet-pivot__fields').element;

    if (element !== undefined) {
      await this.hold(element, centreOf(list));
      await this.release(centreOf(list));
    }
  }

  async dragField(field: string, area: string, touch = false): Promise<void> {
    const element = this.panel
      .findAll('.nui-spreadsheet-pivot__field')
      .find((item) => item.text() === field)?.element;

    if (element !== undefined) {
      await this.hold(element, this.pointIn(area), touch);
      await this.release(this.pointIn(area), touch);
    }
  }

  get subview(): string | undefined {
    const title = this.panel.find('.nui-spreadsheet-pivot__subtitle');

    return title.exists() ? title.text() : undefined;
  }

  get items(): string[] {
    return this.itemBoxes().slice(1).map(trimmed);
  }

  get checkedItems(): string[] {
    return this.itemBoxes()
      .slice(1)
      .reduce<string[]>((names, label) => {
        const input = label.querySelector('input');

        return input?.checked === true ? [...names, trimmed(label)] : names;
      }, []);
  }

  get selectAll(): string {
    const input = this.itemBoxes()[0]?.querySelector('input');

    if (input?.indeterminate === true) {
      return 'mixed';
    }
    return input?.checked === true ? 'checked' : 'unchecked';
  }

  get sortOptions(): string[] {
    return [
      ...this.panel.element.querySelectorAll<HTMLInputElement>(`${EDITOR} input[type="radio"]`),
    ].map((input) => input.labels?.[0]?.textContent?.trim() ?? '');
  }

  get canApply(): boolean {
    const button = this.panel.find(`${EDITOR} button[type="submit"]`).element;

    return button instanceof HTMLButtonElement && !button.disabled;
  }

  get editorErrors(): string[] {
    return this.panel.findAll(`${EDITOR} .nui-field__error`).map((error) => error.text());
  }

  get focusedInput(): string | undefined {
    const field = document.activeElement;

    return field instanceof HTMLInputElement ? field.labels?.[0]?.textContent?.trim() : undefined;
  }

  async toggleItem(label: string): Promise<void> {
    this.itemBoxes()
      .find((item) => trimmed(item) === label)
      ?.querySelector('input')
      ?.click();

    await nextTick();
  }

  async fill(label: string, value: string): Promise<void> {
    const input = this.editorInput(label);

    if (input !== undefined) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await nextTick();
  }

  value(label: string): string | undefined {
    return this.editorInput(label)?.value;
  }

  async chooseSort(label: string): Promise<void> {
    [...this.panel.element.querySelectorAll<HTMLInputElement>(`${EDITOR} input[type="radio"]`)]
      .find((input) => input.labels?.[0]?.textContent?.trim() === label)
      ?.click();

    await nextTick();
  }

  async choose(label: string, option: string): Promise<void> {
    const select = [
      ...this.panel.element.querySelectorAll<HTMLElement>(`${EDITOR} [role="combobox"]`),
    ].find(
      (each) =>
        document.getElementById(each.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ===
        label,
    );

    select?.focus();

    select?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );

    await nextTick();

    const entry = [
      ...this.panel.element.querySelectorAll<HTMLElement>(`${EDITOR} [role="option"]`),
    ].find((each) => trimmed(each) === option);

    if (entry === undefined) {
      throw new Error(`No option ${option}`);
    }
    entry.click();
    await nextTick();
  }

  async applyEditor(): Promise<void> {
    await this.panel.find(EDITOR).trigger('submit');
  }

  async cancelEditor(): Promise<void> {
    await this.panel
      .findAll(`${EDITOR} .nui-spreadsheet-pivot__footer button`)
      .find((button) => button.attributes('type') !== 'submit')
      ?.trigger('click');
  }

  async toggleAction(chip: string, action: string): Promise<void> {
    const menu = this.menuOf(chip);

    menu?.showPopover();
    await nextTick();

    [...(menu?.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]') ?? [])]
      .find((item) => trimmed(item) === action)
      ?.click();

    await nextTick();
  }

  async actionChecked(chip: string, action: string): Promise<boolean | undefined> {
    const menu = this.menuOf(chip);

    menu?.showPopover();
    await nextTick();

    const item = [...(menu?.querySelectorAll('[role="menuitemcheckbox"]') ?? [])].find(
      (each) => trimmed(each) === action,
    );

    return item === undefined ? undefined : item.getAttribute('aria-checked') === 'true';
  }

  private itemBoxes(): Element[] {
    return [...this.panel.element.querySelectorAll(`${ITEMS} label`)];
  }

  private editorInput(label: string): HTMLInputElement | undefined {
    return [...this.panel.element.querySelectorAll<HTMLInputElement>(`${EDITOR} input`)].find(
      (input) => input.labels?.[0]?.textContent?.trim() === label,
    );
  }

  private async hold(source: Element, to: PointerAt, touch = false): Promise<void> {
    layOutPivot(this.panel.element);

    const from = centreOf(source);

    source.dispatchEvent(pointer('pointerdown', { ...from, touch }));
    this.panel.element.dispatchEvent(pointer('pointermove', { ...to, touch }));
    await nextTick();
  }

  private async release(at: PointerAt, touch = false): Promise<void> {
    this.panel.element.dispatchEvent(pointer('pointerup', { ...at, touch }));
    await nextTick();
  }

  private pointIn(area: string, slot?: number): PointerAt {
    layOutPivot(this.panel.element);

    const element = this.areaOf(area)?.element;

    if (element === undefined) {
      return { x: -1, y: -1 };
    }

    const box = element.getBoundingClientRect();

    const chip =
      slot === undefined
        ? undefined
        : element.querySelectorAll('.nui-spreadsheet-pivot__chip')[slot];

    return chip === undefined
      ? { x: box.left + box.width / 2, y: box.bottom - 4 }
      : { x: box.left + box.width / 2, y: chip.getBoundingClientRect().top + 2 };
  }

  private areaOf(area: string): DOMWrapper<Element> | undefined {
    return this.panel
      .findAll('.nui-spreadsheet-pivot__area')
      .find((item) => item.find('.nui-spreadsheet-pivot__area-title').text() === area);
  }

  private chip(label: string): HTMLElement | undefined {
    const found = this.panel
      .findAll('.nui-spreadsheet-pivot__chip')
      .find((chip) => chip.text() === label)?.element;

    return found instanceof HTMLElement ? found : undefined;
  }

  private menuOf(chip: string): HTMLElement | undefined {
    const id = this.chip(chip)?.getAttribute('aria-controls');
    const menu = id === null || id === undefined ? null : document.getElementById(id);

    return menu instanceof HTMLElement ? menu : undefined;
  }
}
