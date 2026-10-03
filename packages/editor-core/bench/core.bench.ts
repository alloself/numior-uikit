import {
  createMapping,
  createTransform,
  invertStep,
  type Doc,
  type Transform,
} from '@numior/editor-core';
import { createRandom, fixtureSchema, generateDoc } from '@numior/editor-core/fixtures';
import { measure, record, type Operation } from '../../../scripts/bench-harness.ts';

const BLOCKS = 10_000;
const TYPED = 1000;
const heavy = { iterations: 5, warmup: 1 };
const light = { iterations: 20, warmup: 2 };

const doc = generateDoc(fixtureSchema, { blocks: BLOCKS, seed: 1 });

const blockStart = (target: Doc, index: number): number => {
  const block = target.root.content[index];

  return block?.kind === 'element' ? (target.positionOf(block.id) ?? 0) : 0;
};

const textAfter = (target: Doc, from: number): number => {
  let found = -1;

  target.nodesBetween(from, target.size, (node, pos) => {
    if (found < 0 && node.kind === 'text' && node.text.length > 1) {
      found = pos + 1;
    }
    return found < 0;
  });

  return found;
};

const middle = textAfter(doc, blockStart(doc, BLOCKS / 2));

const typeRun = (start: Doc, at: number, count: number): Transform => {
  const transform = createTransform(start);

  for (let index = 0; index < count; index += 1) {
    transform.insertText('x', at + index);
  }
  return transform;
};

console.log(
  `editor core on ${BLOCKS.toLocaleString('en-US')} blocks (${doc.size.toLocaleString('en-US')} positions)`,
);

const operations: Operation[] = [];

operations.push(
  await measure(
    `generate a ${BLOCKS.toLocaleString('en-US')} block document`,
    async () => {
      generateDoc(fixtureSchema, { blocks: BLOCKS, seed: 1 });
    },
    heavy,
  ),
);

operations.push(
  await measure(
    `check a ${BLOCKS.toLocaleString('en-US')} block document against the schema`,
    async () => {
      fixtureSchema.check(doc.root);
    },
    heavy,
  ),
);

const random = createRandom(7);
const spots = Array.from({ length: 1000 }, () => random.int(0, doc.size));

operations.push(
  await measure(
    'resolve 1,000 random positions',
    async () => {
      for (const spot of spots) {
        doc.resolve(spot);
      }
    },
    light,
  ),
);

operations.push(
  await measure(
    'find 1,000 blocks by id in a fresh document',
    async () => {
      const fresh = createTransform(doc).insertText('y', middle).doc;

      for (let index = 0; index < BLOCKS; index += 10) {
        blockStart(fresh, index);
      }
    },
    light,
  ),
);

operations.push(
  await measure(
    'type one character in the middle of the document',
    async () => {
      createTransform(doc).insertText('x', middle);
    },
    light,
  ),
);

operations.push(
  await measure(
    `type ${TYPED.toLocaleString('en-US')} characters one step at a time`,
    async () => {
      typeRun(doc, middle, TYPED);
    },
    heavy,
  ),
);

operations.push(
  await measure(
    'split and join a paragraph in the middle',
    async () => {
      const split = createTransform(doc).split(middle);

      createTransform(split.doc).join(middle + 1);
    },
    light,
  ),
);

const rangeFrom = blockStart(doc, 4500);
const rangeTo = blockStart(doc, 5500);

operations.push(
  await measure(
    'bold and unbold a range of 1,000 blocks',
    async () => {
      const bold = createTransform(doc).addMark(rangeFrom, rangeTo, fixtureSchema.mark('bold'));

      createTransform(bold.doc).removeMark(rangeFrom, rangeTo, 'bold');
    },
    heavy,
  ),
);

operations.push(
  await measure(
    'cut 1,000 blocks and paste them back',
    async () => {
      const slice = doc.slice(rangeFrom, rangeTo);
      const cut = createTransform(doc).delete(rangeFrom, rangeTo);

      cut.replace(rangeFrom, rangeFrom, slice);
    },
    heavy,
  ),
);

const typed = typeRun(doc, middle, TYPED);

operations.push(
  await measure(
    `invert and apply ${TYPED.toLocaleString('en-US')} typing steps`,
    async () => {
      const undo = createTransform(typed.doc);

      for (let index = typed.steps.length - 1; index >= 0; index -= 1) {
        const step = typed.steps[index];
        const before = typed.docs[index];

        if (step !== undefined && before !== undefined) {
          undo.step(invertStep(step, before));
        }
      }
    },
    heavy,
  ),
);

operations.push(
  await measure(
    `map 10,000 positions through ${TYPED.toLocaleString('en-US')} step maps`,
    async () => {
      const mapping = createMapping(typed.mapping.maps);

      for (let pos = 0; pos < doc.size; pos += Math.ceil(doc.size / 10_000)) {
        mapping.map(pos);
      }
    },
    heavy,
  ),
);

const file = await record(
  new URL('./results/', import.meta.url),
  `${BLOCKS} generated mixed blocks (fixture schema, seed 1), ${doc.size} positions`,
  operations,
);

console.log(`bench: recorded ${operations.length} operations to ${file}`);
