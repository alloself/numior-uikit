const firstLetter = (word: string): string => [...word].slice(0, 1).join('');

export const initialsOf = (name: string): string => {
  const words = name.split(/\s+/).filter((word) => word !== '');
  const first = words[0];
  if (first === undefined) {
    return '';
  }
  const last = words.length > 1 ? words.at(-1) : undefined;
  const letters = last === undefined ? firstLetter(first) : firstLetter(first) + firstLetter(last);
  return letters.toLocaleUpperCase();
};
