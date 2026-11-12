import {
  applyStep,
  createDoc,
  createState,
  stepToJSON,
  type Attrs,
  type Doc,
  type EditorState,
  type ElementNode,
  type NodeId,
  type Step,
} from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import { describe, expect, it } from 'vite-plus/test';
import {
  collab,
  conflictsIn,
  editorCollabDocument,
  sendableSteps,
  type CollabAlternative,
  type CollabDocument,
} from '../src';
import { received } from './harness/received';

const base = (): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, {
      id: 'root',
      content: [
        fixtureSchema.element('heading', { id: 'title', attrs: { level: 1 } }),
        fixtureSchema.element('image', { id: 'picture', attrs: { src: 'a.png', alt: 'old' } }),
      ],
    }),
  );

const fresh = (): EditorState => createState({ doc: base(), plugins: [collab()] });

const positionOf = (state: EditorState, id: NodeId): number => {
  const position = state.doc.positionOf(id);

  if (position === undefined) {
    throw new Error(`No node ${id}`);
  }
  return position;
};

const editing = (state: EditorState, id: NodeId, attrs: Attrs): EditorState =>
  state.apply(state.tr.setNodeAttrs(positionOf(state, id), attrs));

const remoteSteps = (...changes: readonly (readonly [NodeId, Attrs])[]): readonly Step[] =>
  changes.reduce(
    ({ state, steps }, [id, attrs]) => {
      const tr = state.tr.setNodeAttrs(positionOf(state, id), attrs);

      return { state: state.apply(tr), steps: [...steps, ...tr.steps] };
    },
    { state: createState({ doc: base() }), steps: new Array<Step>() },
  ).steps;

const attrsOf = (doc: Doc, id: NodeId): ElementNode['attrs'] | undefined => doc.byId(id)?.attrs;

const applied = (doc: Doc, steps: readonly Step[]): Doc =>
  steps.reduce((current, step) => {
    const result = applyStep(current, step);

    if (!result.ok) {
      throw new Error(result.reason);
    }
    return result.doc;
  }, doc);

const documentOver = (start: EditorState, found: CollabAlternative[]): CollabDocument => {
  let state = start;

  return editorCollabDocument({
    schema: fixtureSchema,
    getState: () => state,
    dispatch: (tr) => {
      state = state.apply(tr);
    },
    load: () => undefined,
    authorOf: (id) => (id === 'boris' ? { id, name: 'Борис' } : undefined),
    onAlternatives: (values) => {
      found.push(...values);
    },
  });
};

describe('single value conflicts', () => {
  it('reports the remote value when both sides changed the same attribute', () => {
    const local = editing(fresh(), 'title', { level: 2 });

    const tr = received(local, remoteSteps(['title', { level: 3 }]));

    expect(conflictsIn(tr)).toEqual([{ index: 0, nodeId: 'title', attr: 'level', value: 3 }]);
    expect(attrsOf(tr.doc, 'title')).toEqual({ level: 2 });
  });

  it('sees no conflict when both sides chose the same value', () => {
    const local = editing(fresh(), 'title', { level: 3 });

    const tr = received(local, remoteSteps(['title', { level: 3 }]));

    expect(conflictsIn(tr)).toEqual([]);
  });

  it('sees no conflict without local changes', () => {
    const tr = received(fresh(), remoteSteps(['title', { level: 3 }]));

    expect(conflictsIn(tr)).toEqual([]);
  });

  it('reports only the last value one batch wrote', () => {
    const local = editing(fresh(), 'title', { level: 2 });

    const tr = received(local, remoteSteps(['title', { level: 3 }], ['title', { level: 1 }]));

    expect(conflictsIn(tr)).toEqual([{ index: 1, nodeId: 'title', attr: 'level', value: 1 }]);
  });

  it('compares the remote value with the last local one', () => {
    const local = editing(editing(fresh(), 'title', { level: 3 }), 'title', { level: 2 });

    const tr = received(local, remoteSteps(['title', { level: 3 }]));

    expect(conflictsIn(tr)).toEqual([{ index: 0, nodeId: 'title', attr: 'level', value: 3 }]);
  });

  it('keeps both changes when they touch different attributes', () => {
    const local = editing(fresh(), 'picture', { alt: 'new' });
    const remote = remoteSteps(['picture', { src: 'b.png' }]);

    const tr = received(local, remote);

    expect(conflictsIn(tr)).toEqual([]);
    expect(attrsOf(tr.doc, 'picture')).toMatchObject({ src: 'b.png', alt: 'new' });
  });

  it('converges with the server after rebasing over a neighbouring attribute', () => {
    const local = editing(fresh(), 'picture', { alt: 'new' });
    const remote = remoteSteps(['picture', { src: 'b.png' }]);

    const rebased = local.apply(received(local, remote));

    expect(applied(applied(base(), remote), sendableSteps(rebased)).root).toEqual(rebased.doc.root);
  });

  it('notices a remote markup step writing the same attribute', () => {
    const local = editing(fresh(), 'title', { level: 2 });
    const start = createState({ doc: base() });

    const remote = start.tr.setNodesMarkup([
      { pos: positionOf(start, 'title'), attrs: { level: 3 } },
    ]).steps;

    expect(conflictsIn(received(local, remote))).toMatchObject([{ attr: 'level', value: 3 }]);
  });
});

describe('editorCollabDocument alternatives', () => {
  it('dates the alternative by the server version of the losing step', () => {
    const found: CollabAlternative[] = [];
    const document = documentOver(editing(fresh(), 'title', { level: 2 }), found);

    document.receive({
      version: 7,
      clientId: 'boris',
      steps: remoteSteps(['picture', { src: 'b.png' }], ['title', { level: 3 }]).map(stepToJSON),
    });

    expect(found).toMatchObject([
      {
        version: 8,
        nodeId: 'title',
        attr: 'level',
        value: 3,
        clientId: 'boris',
        author: { name: 'Борис' },
      },
    ]);
  });

  it('stays silent when nothing was overwritten', () => {
    const found: CollabAlternative[] = [];
    const document = documentOver(fresh(), found);

    document.receive({
      version: 0,
      clientId: 'boris',
      steps: remoteSteps(['title', { level: 3 }]).map(stepToJSON),
    });

    expect(found).toEqual([]);
  });
});
