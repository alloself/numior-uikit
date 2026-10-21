import {
  createEmptyDoc,
  createHTMLWriter,
  fromHTML,
  fromJSON,
  toJSON,
  type Doc,
  type DocJSON,
  type EditorState,
  type Schema,
} from '@numior/editor-core';
import { onScopeDispose, toRaw, watch, type Ref } from 'vue';
import type { NuiEditorFormat, NuiEditorValue } from './editor.types';

export interface EditorValueOptions<V extends NuiEditorValue | undefined> {
  readonly schema: Schema;
  readonly model: Ref<V>;
  readonly format: () => NuiEditorFormat;
  readonly state: () => EditorState;
  readonly receive: (doc: Doc) => void;
}

export interface EditorValue {
  readonly initial: Doc;
  changed(json: DocJSON): void;
  flush(): void;
}

const PAUSE_MS = 300;

const docOf = (schema: Schema, value: NuiEditorValue | undefined): Doc => {
  if (typeof value === 'string') {
    return value === '' ? createEmptyDoc(schema) : fromHTML(schema, value);
  }
  const read = value === undefined ? undefined : fromJSON(schema, value);

  return read?.ok === true ? read.doc : createEmptyDoc(schema);
};

export const useEditorValue = <V extends NuiEditorValue | undefined>(
  options: EditorValueOptions<V>,
): EditorValue => {
  const write = createHTMLWriter();
  const current = (): NuiEditorValue | undefined => toRaw(options.model.value);
  let written = current();
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const fits = (value: NuiEditorValue): value is NonNullable<V> => {
    const bound = current();

    return bound === undefined
      ? (typeof value === 'string') === (options.format() === 'html')
      : typeof bound === typeof value;
  };

  const stop = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  const publish = (value: NuiEditorValue): void => {
    if (fits(value)) {
      written = value;
      options.model.value = value;
    }
  };

  const flush = (): void => {
    stop();
    if (!pending) {
      return;
    }
    pending = false;

    const { doc } = options.state();

    publish(options.format() === 'json' ? toJSON(doc) : write(doc));
  };

  watch(options.model, () => {
    const value = current();

    if (value === written) {
      return;
    }
    stop();
    pending = false;
    written = value;
    options.receive(docOf(options.schema, value));
  });

  onScopeDispose(stop);

  return {
    initial: docOf(options.schema, written),
    changed: (json) => {
      stop();
      if (options.format() === 'json') {
        pending = false;
        publish(json);
      } else {
        pending = true;
        timer = setTimeout(flush, PAUSE_MS);
      }
    },
    flush,
  };
};
