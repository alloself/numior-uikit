import type { Locator, Page } from '@playwright/test';
import {
  isBoolean,
  isNumber,
  isString,
  parseAs,
  shapeOf,
  type Guarded,
} from '../../../packages/primitives/test/support/guards';
import { type Box } from '../helpers/geometry';

const isFeedbackOutput = shapeOf({
  placement: isString,
  toastCount: isNumber,
  alertOpen: isBoolean,
  progress: isNumber,
});

export type FeedbackOutput = Guarded<typeof isFeedbackOutput>;

const parseFeedbackOutput = (text: string): FeedbackOutput =>
  parseAs(text, isFeedbackOutput, 'feedback output');

const readBoxes = (elements: readonly Element[]): Box[] =>
  elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

export const bottomOf = (box: Box): number => box.y + box.height;

export class FeedbackSection {
  readonly toaster: Locator;
  readonly stackItems: Locator;
  readonly toastShow: Locator;
  readonly toastQuick: Locator;
  readonly toastError: Locator;
  readonly toastDialogOpen: Locator;
  readonly toastDialog: Locator;
  readonly toastFromDialog: Locator;
  readonly placementSelect: Locator;
  readonly alert: Locator;
  readonly alertReset: Locator;
  readonly progressInput: Locator;
  readonly progressDeterminate: Locator;
  readonly progressIndeterminate: Locator;
  readonly skeleton: Locator;
  readonly output: Locator;

  constructor(page: Page) {
    this.toaster = page.getByTestId('toaster');
    this.stackItems = this.toaster.locator('.nui-toaster__item');
    this.toastShow = page.getByTestId('toast-show');
    this.toastQuick = page.getByTestId('toast-quick');
    this.toastError = page.getByTestId('toast-error');
    this.toastDialogOpen = page.getByTestId('toast-dialog-open');
    this.toastDialog = page.getByTestId('toast-dialog');
    this.toastFromDialog = page.getByTestId('toast-from-dialog');
    this.placementSelect = page.getByTestId('toast-placement');
    this.alert = page.getByTestId('alert');
    this.alertReset = page.getByTestId('alert-reset');
    this.progressInput = page.getByTestId('progress-input');
    this.progressDeterminate = page.getByTestId('progress-determinate');
    this.progressIndeterminate = page.getByTestId('progress-indeterminate');
    this.skeleton = page.getByTestId('skeleton');
    this.output = page.getByTestId('feedback-output');
  }

  toastByText(text: string): Locator {
    return this.toaster.locator('.nui-toast:not(.nui-toast--leaving)', { hasText: text });
  }

  closeButtonOf(toast: Locator): Locator {
    return toast.locator('.nui-toast__close');
  }

  actionOf(toast: Locator): Locator {
    return toast.locator('.nui-toast__action');
  }

  get skeletonLine(): Locator {
    return this.skeleton.locator('.nui-skeleton__line').first();
  }

  async setPlacement(placement: string): Promise<void> {
    await this.placementSelect.selectOption(placement);
  }

  async setProgress(value: string): Promise<void> {
    await this.progressInput.fill(value);
  }

  async stackBox(index: number): Promise<Box> {
    const boxes = await this.stackItems.evaluateAll(readBoxes);
    const box = boxes[index];
    if (!box) {
      throw new Error(`No stack item at index ${index}`);
    }
    return box;
  }

  isSquare(target: Locator): Promise<boolean> {
    return target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return Math.round(rect.width) === Math.round(rect.height);
    });
  }

  animationName(target: Locator): Promise<string> {
    return target.evaluate((element) => getComputedStyle(element).animationName);
  }

  async readOutput(): Promise<FeedbackOutput> {
    return parseFeedbackOutput(await this.output.innerText());
  }
}
