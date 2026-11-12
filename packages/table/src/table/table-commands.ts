export interface CommandStack<C> {
  push(command: C): void;
  undo(): C | undefined;
  redo(): C | undefined;
  clear(): void;
}

export const createCommandStack = <C>(limit: number): CommandStack<C> => {
  const done: C[] = [];
  const undone: C[] = [];

  return {
    push: (command) => {
      done.push(command);
      undone.length = 0;

      if (done.length <= limit) {
        return;
      }

      done.shift();
    },
    undo: () => {
      const command = done.pop();

      if (command !== undefined) {
        undone.push(command);
      }
      return command;
    },
    redo: () => {
      const command = undone.pop();

      if (command !== undefined) {
        done.push(command);
      }
      return command;
    },
    clear: () => {
      done.length = 0;
      undone.length = 0;
    },
  };
};
