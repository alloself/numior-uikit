import {
  createHTMLWriter,
  fromHTML,
  type Doc,
  type EditorState,
  type Schema,
} from '@numior/editor-core';
import { onScopeDispose, watch, type Ref } from 'vue';

export interface EditorHTMLOptions {
  readonly schema: Schema;
  readonly model: Ref<string>;
  readonly state: () => EditorState;
  readonly receive: (doc: Doc) => void;
}

export interface EditorHTML {
  readonly initial: Doc | undefined;
  changed(): void;
  flush(): void;
}

const PAUSE_MS = 300;

export const useEditorHTML = (options: EditorHTMLOptions): EditorHTML => {
  const write = createHTMLWriter();
  let written = options.model.value;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  const flush = (): void => {
    stop();
    if (!pending) {
      return;
    }
    pending = false;
    written = write(options.state().doc);
    options.model.value = written;
  };

  watch(options.model, (value) => {
    if (value === written) {
      return;
    }
    stop();
    pending = false;
    written = value;
    options.receive(fromHTML(options.schema, value));
  });

  onScopeDispose(stop);

  return {
    initial: written === '' ? undefined : fromHTML(options.schema, written),
    changed: () => {
      pending = true;
      stop();
      timer = setTimeout(flush, PAUSE_MS);
    },
    flush,
  };
};
