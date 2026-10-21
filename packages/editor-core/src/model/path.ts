export interface PathLink {
  readonly parent: PathLink | undefined;
  readonly index: number;
}

export const childLink = (parent: PathLink | undefined, index: number): PathLink => ({
  parent,
  index,
});

export const pathOf = (link: PathLink | undefined): number[] => {
  const path: number[] = [];

  for (let at = link; at !== undefined; at = at.parent) {
    path.push(at.index);
  }
  return path.toReversed();
};
