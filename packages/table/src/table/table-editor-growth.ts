export const growthEdges = (natural: number, neighbours: readonly number[]): readonly number[] =>
  neighbours.reduce<number[]>(
    (edges, width) => {
      edges.push((edges.at(-1) ?? natural) + width);
      return edges;
    },
    [natural],
  );

export const grownSize = (edges: readonly number[], needed: number, room: number): number => {
  const natural = edges[0] ?? 0;
  const edge = edges.find((candidate) => candidate >= needed) ?? needed;

  return Math.max(natural, Math.min(edge, room));
};
