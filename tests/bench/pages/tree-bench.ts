import type { Browser, Locator, Page } from '@playwright/test';
import { BenchPage } from './bench-page';

export class TreeBenchPage extends BenchPage {
  readonly tree: Locator;

  constructor(page: Page) {
    super(page, 'view=tree&');
    this.tree = page.getByTestId('bench-tree');
  }

  async focusTree(): Promise<void> {
    await this.tree.focus();
    await this.nextFrame();
  }

  wheelFrames(steps: number, delta: number): Promise<number[]> {
    return this.framesWhileWheeling(this.tree, steps, delta);
  }

  windowMoves(browser: Browser, rounds: number): Promise<number[]> {
    return this.mainThreadPerWindowMove(browser, this.tree, rounds);
  }
}
