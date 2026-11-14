import type { DOMWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import {
  dispatchWheel,
  stubTrackScroll,
  type EdgeSide,
  type EdgeState,
  type TrackScroll,
} from '../support/track-scroll';
import { ComponentDriver } from './component';

export abstract class EdgeScrollDriver extends ComponentDriver {
  protected abstract readonly trackBlock: string;

  get track(): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(`.${this.trackBlock}__track`);
  }

  get edges(): EdgeState {
    return { start: this.edgeShown('start'), end: this.edgeShown('end') };
  }

  get fades(): EdgeState {
    const classes = this.track.classes();

    return {
      start: classes.includes(`${this.trackBlock}__track--clipped-start`),
      end: classes.includes(`${this.trackBlock}__track--clipped-end`),
    };
  }

  get scrolled(): number {
    return this.track.element.scrollLeft;
  }

  async scrollTrack(scroll: TrackScroll): Promise<void> {
    stubTrackScroll(this.track.element, scroll);
    await this.track.trigger('scroll');
  }

  async wheel(deltaY: number, init: WheelEventInit = {}): Promise<boolean> {
    const prevented = dispatchWheel(this.track.element, deltaY, init);

    await nextTick();
    return prevented;
  }

  async clickEdge(side: EdgeSide): Promise<void> {
    await this.edge(side).find('button').trigger('click');
  }

  private edge(side: EdgeSide): DOMWrapper<HTMLElement> {
    return this.wrapper.find<HTMLElement>(`.${this.trackBlock}__edge--${side}`);
  }

  private edgeShown(side: EdgeSide): boolean {
    return this.edge(side).classes().includes(`${this.trackBlock}__edge--shown`);
  }
}
