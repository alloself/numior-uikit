import type { Locator, Page } from '@playwright/test';
import { test as base } from '../e2e/fixtures';
import { sectionScope } from '../e2e/helpers/axe';
import {
  clockNow,
  collect,
  dropMountMarkers,
  fontsReady,
  freezeMotion,
  nextFrame,
  pageHeight,
  recordMotion,
  scrollPageTo,
  scrollState,
  seedRandom,
  seekMotion,
  showCurrentLinks,
} from './page-scripts';
import { DEFAULT_PROFILE } from './profiles';
import { PROPERTIES } from './properties';
import { encodeScene, writeScene } from './store';
import type { Note, Profile, Shot } from './parity.types';

export interface ParityOptions {
  readonly profile: Profile;
}

interface ParityFixtures {
  readonly scenes: SceneRecorder;
}

const OUTPUT = process.env.PARITY_OUT ?? 'test-results/parity';
const FIXED_NOW = new Date('2026-11-11T09:00:00Z');
const TIMED_SECONDS = 31;
const SECOND = 1000;
const FRAME = 16;
const HELD_FRAMES = 4;
const HOLD_LEAD = 250;
const SETTLE_ROUNDS = 60;
const QUIET_ROUNDS = 3;
const SHOT = { animations: 'disabled', caret: 'hide', scale: 'device' } as const;
const PAGE_SHOT = { ...SHOT, fullPage: true, timeout: 60_000 } as const;
const LIVE_SHOT = { ...SHOT, animations: 'allow' } as const;
const PAGE_ATTEMPTS = 4;
const RETRY_FRAMES = 12;
const FROZEN = { playbackRate: 0 };
const RUNNING = { playbackRate: 1 };

export class SceneRecorder {
  private pending = 0;
  private held = false;

  constructor(
    private readonly page: Page,
    readonly profile: Profile,
  ) {
    page.on('request', () => {
      this.pending += 1;
    });

    page.on('requestfinished', () => {
      this.pending -= 1;
    });

    page.on('requestfailed', () => {
      this.pending -= 1;
    });
  }

  async settle(): Promise<void> {
    let quiet = 0;

    await this.page.evaluate(fontsReady);

    for (let round = 0; round < SETTLE_ROUNDS && quiet < QUIET_ROUNDS; round += 1) {
      const running = await this.page.evaluate(freezeMotion);

      await this.page.evaluate(nextFrame);
      quiet = running === 0 && this.pending <= 0 ? quiet + 1 : 0;
    }

    if (quiet < QUIET_ROUNDS) {
      throw new Error('The page never came to rest');
    }

    await this.page.evaluate(dropMountMarkers);
  }

  async finishTimers(): Promise<void> {
    for (let second = 0; second < TIMED_SECONDS; second += 1) {
      await this.page.clock.fastForward(SECOND);
    }
  }

  async showCurrentLinks(): Promise<void> {
    await this.page.evaluate(showCurrentLinks);
    await this.page.evaluate(nextFrame);
  }

  async holdTimers(): Promise<void> {
    const now = await this.page.evaluate(clockNow);

    await this.page.clock.pauseAt(now + HOLD_LEAD);
    this.held = true;
  }

  async releaseTimers(): Promise<void> {
    await this.page.clock.resume();
    this.held = false;
  }

  async reveal(): Promise<void> {
    const height = await this.page.evaluate(pageHeight);

    for (let top = 0; top < height; top += this.profile.height) {
      await this.page.evaluate(scrollPageTo, top);
      await this.page.evaluate(nextFrame);
    }

    await this.page.evaluate(scrollPageTo, 0);
    await this.page.evaluate(nextFrame);
  }

  async capture(name: string, root: string, shot: Shot): Promise<void> {
    await this.settle();
    await this.store(name, root, () => this.shoot(shot));
  }

  async motion(
    name: string,
    root: string,
    act: () => Promise<void>,
    pointer?: Locator,
  ): Promise<void> {
    await pointer?.hover();
    await this.settle();
    const session = await this.page.context().newCDPSession(this.page);

    await session.send('Animation.enable');
    await session.send('Animation.setPlaybackRate', FROZEN);

    await act();

    if (this.held) {
      await this.page.clock.runFor(HELD_FRAMES * FRAME);
    }

    await this.quiet();
    const notes = await this.page.evaluate(recordMotion, root);

    if (notes.length === 0) {
      throw new Error(`Nothing moved in ${name}`);
    }

    const frame = (): Promise<Buffer> => this.page.screenshot(LIVE_SHOT);
    const pictured = Number.isInteger(this.profile.dpr);

    await this.seek(root, 0);
    await this.store(`${name}--first-frame`, root, frame, pictured, notes);
    await this.seek(root, 0.5);
    await this.store(`${name}--half-way`, root, frame, pictured);

    await session.send('Animation.setPlaybackRate', RUNNING);
    await session.detach();
    await this.settle();
  }

  async captureSection(section: string, name = section): Promise<void> {
    const target = this.page.locator(sectionScope(section));

    await target.evaluate((element) => {
      element.scrollIntoView({ block: 'start', behavior: 'instant' });
    });

    await target.and(this.page.locator(':not(.panel--away)')).waitFor();
    await this.capture(name, sectionScope(section), target);
  }

  private async seek(root: string, progress: number): Promise<void> {
    await this.page.evaluate(seekMotion, { root, progress });
    await this.page.evaluate(nextFrame);
  }

  private async quiet(): Promise<void> {
    let quiet = 0;

    for (let round = 0; round < SETTLE_ROUNDS && quiet < QUIET_ROUNDS; round += 1) {
      await this.page.evaluate(nextFrame);
      quiet = this.pending <= 0 ? quiet + 1 : 0;
    }
  }

  private async store(
    name: string,
    root: string,
    shoot: () => Promise<Uint8Array>,
    pictured = true,
    notes: readonly Note[] = [],
  ): Promise<void> {
    const raw = await this.page.evaluate(collect, { root, properties: PROPERTIES });
    const scene = encodeScene(`${this.profile.id}/${name}`, PROPERTIES, raw, notes);
    const picture = await shoot();

    await writeScene(OUTPUT, scene, pictured ? picture : undefined);
  }

  private shoot(shot: Shot): Promise<Buffer> {
    if (shot === 'page') {
      return this.shootPage();
    }

    if (shot === 'viewport') {
      return this.page.screenshot(SHOT);
    }
    return shot.screenshot(SHOT);
  }

  private async shootPage(): Promise<Buffer> {
    let previous: Buffer | undefined;

    for (let attempt = 0; attempt < PAGE_ATTEMPTS; attempt += 1) {
      const scrolled = await this.page.evaluate(scrollState);
      const picture = await this.page.screenshot(PAGE_SHOT);
      const kept = (await this.page.evaluate(scrollState)) === scrolled;

      if (kept || previous?.equals(picture) === true) {
        return picture;
      }

      previous = picture;
      await this.showCurrentLinks();
      await this.settle();

      for (let frame = 0; frame < RETRY_FRAMES; frame += 1) {
        await this.page.evaluate(nextFrame);
      }
    }

    throw new Error('The page picture neither kept the scroll positions nor repeated');
  }
}

export const test = base.extend<ParityFixtures & ParityOptions>({
  profile: [DEFAULT_PROFILE, { option: true }],
  page: async ({ page }, use) => {
    await page.clock.install({ time: FIXED_NOW });
    await page.addInitScript(seedRandom);
    await use(page);
  },
  scenes: async ({ page, profile }, use) => {
    await use(new SceneRecorder(page, profile));
  },
});

export { expect } from '@playwright/test';
