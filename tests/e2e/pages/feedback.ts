import type { Locator, Page } from '@playwright/test';

export interface FeedbackOutput {
  readonly placement: string;
  readonly toastCount: number;
  readonly alertOpen: boolean;
  readonly progress: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseFeedbackOutput = (text: string): FeedbackOutput => {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data)) {
    throw new Error('Feedback output is not an object');
  }
  const { placement, toastCount, alertOpen, progress } = data;
  if (
    typeof placement !== 'string' ||
    typeof toastCount !== 'number' ||
    typeof alertOpen !== 'boolean' ||
    typeof progress !== 'number'
  ) {
    throw new Error(`Unexpected feedback output: ${text}`);
  }
  return { placement, toastCount, alertOpen, progress };
};

export class FeedbackSection {
  readonly toaster: Locator;
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

  animationName(target: Locator): Promise<string> {
    return target.evaluate((element) => getComputedStyle(element).animationName);
  }

  async readOutput(): Promise<FeedbackOutput> {
    return parseFeedbackOutput(await this.output.innerText());
  }
}
