import { readFile } from 'node:fs/promises';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vite-plus/test';
import {
  XML_NAMESPACE,
  createXmlParser,
  createXmlWriter,
  decodeXstring,
  encodeXstring,
  parseXmlStream,
  readZip,
  xmlStream,
  type XmlFailure,
  type XmlHandlers,
  type XmlWriter,
} from '../src/xlsx';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const RELATIONSHIPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const recorder = (): { readonly events: string[]; readonly handlers: XmlHandlers } => {
  const events: string[] = [];

  return {
    events,
    handlers: {
      open: (name, attributes) => {
        events.push(
          `<${name.uri}|${name.local}${attributes
            .map((attribute) => ` ${attribute.name.uri}|${attribute.name.local}=${attribute.value}`)
            .join('')}>`,
        );
      },
      close: (name) => {
        events.push(`</${name.local}>`);
      },
      text: (text) => {
        events.push(`"${text}"`);
      },
    },
  };
};

const parsed = (
  chunks: readonly string[],
): { readonly events: string[]; readonly failure: XmlFailure | undefined } => {
  const { events, handlers } = recorder();
  const parser = createXmlParser(handlers);

  chunks.forEach((chunk) => {
    parser.write(chunk);
  });

  return { events, failure: parser.end() };
};

const failureOf = (xml: string): string | undefined => parsed([xml]).failure?.reason;

const written = (build: (writer: XmlWriter) => void): string => {
  const chunks: string[] = [];
  const writer = createXmlWriter((chunk) => chunks.push(chunk), { declaration: false });

  build(writer);
  writer.end();
  return chunks.join('');
};

const SHEET = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!-- generated -->
<x:worksheet xmlns:x="${MAIN}" xmlns:r="${RELATIONSHIPS}">
  <x:sheetData><x:row r="1" spans="1:2"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="B1" t="inlineStr"><x:is><x:t xml:space="preserve"> a &amp; b &lt;c&gt; &#x41;&#66; </x:t></x:is></x:c></x:row></x:sheetData>
  <x:hyperlinks><x:hyperlink ref="A1" r:id="rId1" display="1 &gt; 0"/></x:hyperlinks>
  <x:extLst><![CDATA[<raw> & text]]></x:extLst>
</x:worksheet>`;

describe('XML reading', () => {
  it('reports elements with resolved namespaces, attributes, entities and CDATA', () => {
    const { events, failure } = parsed([SHEET]);

    expect(failure).toBeUndefined();

    expect(events.filter((event) => !/^"\s+"$/u.test(event))).toEqual([
      `<${MAIN}|worksheet>`,
      `<${MAIN}|sheetData>`,
      `<${MAIN}|row |r=1 |spans=1:2>`,
      `<${MAIN}|c |r=A1 |t=s>`,
      `<${MAIN}|v>`,
      '"0"',
      '</v>',
      '</c>',
      `<${MAIN}|c |r=B1 |t=inlineStr>`,
      `<${MAIN}|is>`,
      `<${MAIN}|t ${XML_NAMESPACE}|space=preserve>`,
      '" a & b <c> AB "',
      '</t>',
      '</is>',
      '</c>',
      '</row>',
      '</sheetData>',
      `<${MAIN}|hyperlinks>`,
      `<${MAIN}|hyperlink |ref=A1 ${RELATIONSHIPS}|id=rId1 |display=1 > 0>`,
      '</hyperlink>',
      '</hyperlinks>',
      `<${MAIN}|extLst>`,
      '"<raw> & text"',
      '</extLst>',
      '</worksheet>',
    ]);
  });

  it('reads the same events however the text is cut into chunks', () => {
    const whole = parsed([SHEET]).events;

    expect(
      Array.from({ length: SHEET.length - 1 }, (_unused, at) =>
        parsed([SHEET.slice(0, at + 1), SHEET.slice(at + 1)]).events.join(''),
      ).every((events) => events === whole.join('')),
    ).toBe(true);

    fc.assert(
      fc.property(fc.array(fc.nat({ max: SHEET.length }), { maxLength: 12 }), (cuts) => {
        const points = [0, ...cuts.toSorted((left, right) => left - right), SHEET.length];
        const chunks = points.slice(1).map((end, index) => SHEET.slice(points[index], end));

        expect(parsed(chunks).events).toEqual(whole);
      }),
    );
  });

  it('refuses document types, broken nesting, unknown entities and prefixes', () => {
    expect(
      [
        '<!DOCTYPE x [<!ENTITY a "b">]><x>&a;</x>',
        '<a><b></a></b>',
        '<a><b>',
        '<a>&nbsp;</a>',
        '<p:a/>',
        'text<a/>',
        '<a/><b/>',
        '<a b="1"',
        '',
      ].map(failureOf),
    ).toEqual([
      'doctype',
      'mismatch',
      'unclosed',
      'entity',
      'prefix',
      'syntax',
      'syntax',
      'syntax',
      'unclosed',
    ]);
  });

  it('normalises line breaks in text and white space in attribute values', () => {
    expect(parsed(['<a b="1\r\n2\t3&#10;">x\r\ny\rz&#13;</a>']).events).toEqual([
      '<|a |b=1 2 3\n>',
      '"x\ny\nz\r"',
      '</a>',
    ]);
  });

  it('streams a sheet out of a zip entry', async () => {
    const read = readZip(
      new Uint8Array(await readFile(new URL('./corpus/zip/python.zip', import.meta.url))),
    );

    const values: string[] = [];
    let inValue = false;

    if (!read.ok) {
      throw new Error('the fixture is not a zip');
    }

    const failure = await parseXmlStream(read.archive.stream('xl/worksheets/sheet1.xml'), {
      open: (name) => {
        inValue = name.local === 'v';
      },
      close: () => {
        inValue = false;
      },
      text: (text) => {
        if (inValue) {
          values.push(text);
        }
      },
    });

    expect(failure).toBeUndefined();
    expect(values.length).toBe(200);
    expect(values.at(-1)).toBe('200');
  });

  it('reports bytes that are not UTF-8', async () => {
    const stream = new Response(new Uint8Array([60, 97, 62, 0xff, 60, 47, 97, 62])).body;

    expect(await parseXmlStream(stream ?? new ReadableStream(), {})).toEqual({
      reason: 'encoding',
      position: 0,
    });
  });
});

describe('XML writing', () => {
  it('escapes text and attribute values and checks that every element is closed', () => {
    expect(
      written((writer) => {
        writer.open('sheet', [
          ['name', 'a "b" & <c>\n'],
          ['skipped', undefined],
          ['count', 3],
        ]);

        writer.element('t', ' x < y & z\r ');
        writer.empty('br');
        writer.close();
      }),
    ).toBe(
      '<sheet name="a &quot;b&quot; &amp; &lt;c&gt;&#10;" count="3"><t> x &lt; y &amp; z&#13; </t><br/></sheet>',
    );

    expect(() => written((writer) => writer.open('a'))).toThrow(RangeError);
    expect(() => written((writer) => writer.close())).toThrow(RangeError);
  });

  it('writes what the reader reads back, for any text', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary' }), fc.string({ unit: 'binary' }), (value, body) => {
        const xml = written((writer) => {
          writer.element('t', encodeXstring(body), [['v', encodeXstring(value)]]);
        });

        const { events, failure } = parsed([xml]);

        expect(failure).toBeUndefined();

        expect(events.map(decodeXstring)).toEqual(
          [`<|t |v=${value}>`, body === '' ? undefined : `"${body}"`, '</t>'].filter(
            (event) => event !== undefined,
          ),
        );
      }),
    );
  });

  it('streams a part as UTF-8 chunks', async () => {
    const stream = xmlStream(
      (writer) => {
        writer.open('root');

        Array.from({ length: 2000 }, (_unused, index) =>
          writer.element('c', `значение ${String(index)}`),
        );

        writer.close();
      },
      { chunk: 1000 },
    );

    const text = await new Response(stream).text();

    expect(text.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true);
    expect(text.endsWith('<c>значение 1999</c></root>')).toBe(true);
  });
});

describe('OOXML strings', () => {
  it('escapes characters XML cannot hold and keeps literal escapes literal', () => {
    expect(encodeXstring('a\u0001b_x0041_￿')).toBe('a_x0001_b_x005F_x0041__xFFFF_');
    expect(decodeXstring('a_x0001_b_x005F_x0041__xFFFF_')).toBe('a\u0001b_x0041_￿');
    expect(decodeXstring('_x000D__x000a_')).toBe('\r\n');
  });
});
