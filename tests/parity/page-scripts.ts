import type { CollectOptions, Note, RawNode, RawScene, SeekOptions } from './parity.types';

export const collect = ({ root, properties }: CollectOptions): RawScene => {
  const skipped = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'TEMPLATE']);
  const values: string[] = [];
  const indexes = new Map<string, number>();
  const nodes: RawNode[] = [];
  const origin = document.querySelector(root);

  if (origin === null) {
    throw new Error(`Scene root is missing: ${root}`);
  }

  const frame = origin.getBoundingClientRect();

  const intern = (value: string): number => {
    const known = indexes.get(value);

    if (known !== undefined) {
      return known;
    }
    indexes.set(value, values.length);
    values.push(value);
    return values.length - 1;
  };

  const styleOf = (element: Element, pseudo: string | null): number[] => {
    const style = getComputedStyle(element, pseudo);

    return properties.map((name) => intern(style.getPropertyValue(name)));
  };

  const rectOf = (element: Element): string => {
    const rect = element.getBoundingClientRect();

    return [rect.x - frame.x, rect.y - frame.y, rect.width, rect.height]
      .map((side) => Math.round(side * 100) / 100)
      .join(' ');
  };

  const addPseudos = (element: Element, owner: number): void => {
    const conditional: [string, string][] = [
      ['::marker', 'li'],
      ['::placeholder', 'input[placeholder], textarea[placeholder]'],
      ['::backdrop', ':modal, :popover-open'],
      ['::file-selector-button', 'input[type="file"]'],
    ];

    ['::before', '::after'].forEach((pseudo) => {
      if (getComputedStyle(element, pseudo).content !== 'none') {
        nodes.push([owner, pseudo, '', styleOf(element, pseudo)]);
      }
    });

    conditional.forEach(([pseudo, selector]) => {
      if (element.matches(selector)) {
        nodes.push([owner, pseudo, '', styleOf(element, pseudo)]);
      }
    });
  };

  const visit = (element: Element, parent: number, position: number): void => {
    if (skipped.has(element.tagName)) {
      return;
    }

    const index = nodes.length;
    const classes = Array.from(element.classList, (name) => `.${name}`).join('');
    const segment = `${element.tagName.toLowerCase()}${classes}:${position}`;

    nodes.push([parent, segment, rectOf(element), styleOf(element, null)]);

    addPseudos(element, index);

    Array.from(element.children).forEach((child, at) => {
      visit(child, index, at);
    });
  };

  visit(origin, -1, 0);
  return { values, nodes };
};

export const freezeMotion = (): number => {
  return document.getAnimations().reduce((running, animation) => {
    if (!(animation.timeline instanceof DocumentTimeline)) {
      return running;
    }

    if (animation.effect?.getComputedTiming().endTime === Infinity) {
      animation.pause();
      animation.currentTime = 0;
      return running;
    }

    if (animation.playState === 'finished') {
      return running;
    }
    animation.finish();
    return running + 1;
  }, 0);
};

export const recordMotion = async (root: string): Promise<Note[]> => {
  const origin = document.querySelector(root);

  if (origin === null) {
    throw new Error(`Scene root is missing: ${root}`);
  }

  const view = origin.ownerDocument.defaultView ?? window;

  const frame = (): Promise<void> => {
    return new Promise((resolve) => {
      view.requestAnimationFrame(() => {
        resolve();
      });
    });
  };

  const moving = (): Animation[] => {
    return origin
      .getAnimations({ subtree: true })
      .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity);
  };

  const segmentOf = (element: Element): string => {
    const siblings =
      element === origin ? [element] : Array.from(element.parentElement?.children ?? []);

    const classes = Array.from(element.classList, (name) => `.${name}`).join('');

    return `${element.tagName.toLowerCase()}${classes}:${siblings.indexOf(element)}`;
  };

  const pathOf = (element: Element): string => {
    return element === origin || element.parentElement === null
      ? segmentOf(element)
      : `${pathOf(element.parentElement)} > ${segmentOf(element)}`;
  };

  const describe = (animation: Animation, effect: KeyframeEffect): Note => {
    const kind =
      animation instanceof CSSTransition
        ? `transition ${animation.transitionProperty}`
        : `animation ${animation instanceof CSSAnimation ? animation.animationName : animation.id}`;

    const pseudo = effect.pseudoElement === null ? '' : ` > ${effect.pseudoElement}`;
    const { duration, delay, endDelay, easing, fill, iterations, direction } = effect.getTiming();

    const keyframes = effect
      .getKeyframes()
      .map(({ composite: _composite, ...keyframe }) => keyframe);

    return [
      `${effect.target === null ? '' : pathOf(effect.target)}${pseudo} | motion ${kind}`,
      JSON.stringify({ duration, delay, endDelay, easing, fill, iterations, direction, keyframes }),
    ];
  };

  for (let waited = 0; waited < 120 && moving().length === 0; waited += 1) {
    await frame();
  }

  await frame();
  await frame();

  return moving()
    .reduce<Note[]>((notes, animation) => {
      if (animation.effect instanceof KeyframeEffect) {
        animation.pause();
        notes.push(describe(animation, animation.effect));
      }
      return notes;
    }, [])
    .toSorted(([left], [right]) => left.localeCompare(right));
};

export const seekMotion = ({ root, progress }: SeekOptions): void => {
  document
    .querySelector(root)
    ?.getAnimations({ subtree: true })
    .forEach((animation) => {
      const end = animation.effect?.getComputedTiming().endTime;

      if (typeof end === 'number' && end !== Infinity) {
        animation.pause();
        animation.currentTime = end * progress;
      }
    });
};

export const nextFrame = (): Promise<void> => {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
};

export const fontsReady = async (): Promise<void> => {
  await document.fonts.ready;
};

export const scrollPageTo = (top: number): void => {
  window.scrollTo({ top, behavior: 'instant' });
};

export const pageHeight = (): number => document.documentElement.scrollHeight;

export const seedRandom = (): void => {
  let state = 0x2f6e2b1;

  Math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};
