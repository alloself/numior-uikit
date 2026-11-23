import type { JSHandle, Locator, Page } from '@playwright/test';

export type Probe<T> = JSHandle<(root: Element) => T>;

const OPEN_FRAMES = 3;

const CLOSE_FRAMES = 2;

export const probeOn = <T>(scope: Locator, probe: Probe<T>): Promise<T> =>
  scope.evaluate((root, measure) => measure(root), probe);

export const acrossLayers = <T>(page: Page, selector: string, probe: Probe<T>): Promise<T[]> =>
  page.evaluate(
    async ({ layers, measure, openFrames, closeFrames }) => {
      const found: T[] = [];

      for (const layer of document.querySelectorAll(layers)) {
        const settle = async (frames: number): Promise<void> => {
          for (let frame = 0; frame < frames; frame += 1) {
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => {
                resolve();
              });
            });

            for (const item of layer.getAnimations({ subtree: true })) {
              if (!Number.isFinite(item.effect?.getComputedTiming().endTime)) {
                continue;
              }

              item.finish();
            }
          }
        };

        const show = (): boolean => {
          try {
            if (layer instanceof HTMLDialogElement) {
              layer.showModal();
            } else if (layer instanceof HTMLElement) {
              layer.showPopover();
            }
          } catch {
            return false;
          }

          return true;
        };

        const hide = (): void => {
          if (layer instanceof HTMLDialogElement) {
            layer.close();

            return;
          }

          if (!(layer instanceof HTMLElement)) {
            return;
          }

          layer.hidePopover();
        };

        if (!show()) {
          continue;
        }

        await settle(openFrames);

        if (layer.getBoundingClientRect().height > 0) {
          found.push(measure(layer));
        }

        hide();
        await settle(closeFrames);
      }

      return found;
    },
    { layers: selector, measure: probe, openFrames: OPEN_FRAMES, closeFrames: CLOSE_FRAMES },
  );
