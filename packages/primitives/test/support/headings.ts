export interface HeadingPositions {
  readonly [id: string]: number;
}

export const placeHeadings = (scope: ParentNode, positions: HeadingPositions): void => {
  for (const [id, top] of Object.entries(positions)) {
    const element = scope.querySelector(`#${id}`);

    if (element === null) {
      continue;
    }

    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top, bottom: top + 24, left: 0, right: 0, width: 0, height: 24 }),
    });
  }
};
