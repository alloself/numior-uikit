import { createDoc, createState, stepToJSON, type Doc } from '@numior/editor-core';
import { fixtureSchema } from '@numior/editor-core/fixtures';
import type { WireStep } from '@numior/collaboration';

export const textDoc = (text: string): Doc =>
  createDoc(
    fixtureSchema,
    fixtureSchema.element(fixtureSchema.top.name, {
      id: 'root',
      content: [
        fixtureSchema.element('paragraph', {
          id: 'p',
          content: text === '' ? [] : [fixtureSchema.text(text)],
        }),
      ],
    }),
  );

export const inserting = (doc: Doc, text: string, at: number): WireStep => {
  const [step] = createState({ doc }).tr.insertText(text, at).steps;

  if (step === undefined) {
    throw new Error('The transaction made no step');
  }
  return stepToJSON(step);
};
