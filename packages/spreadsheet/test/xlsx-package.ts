import { writeZip, type Bytes } from '../src/xlsx';

const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const RELATIONSHIPS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const PACKAGE = 'http://schemas.openxmlformats.org/package/2006/relationships';

const relationship = (id: string, type: string, target: string): string =>
  `<Relationship Id="${id}" Type="${RELATIONSHIPS}/${type}" Target="${target}"/>`;

const relationships = (...items: readonly string[]): string =>
  `${HEADER}<Relationships xmlns="${PACKAGE}">${items.join('')}</Relationships>`;

export const SALES_SHEET = `${HEADER}<worksheet xmlns="${MAIN}" xmlns:r="${RELATIONSHIPS}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><dimension ref="A1:H5"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25"/><cols><col min="1" max="1" width="14" customWidth="1"/></cols><sheetData>
<row r="1" spans="1:8"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c></row>
<row r="2" spans="1:8"><c r="A2" t="s"><v>4</v></c><c r="B2"><v>3</v></c><c r="C2" s="2"><f>B2*Rate</f><v>0.75</v></c><c r="D2"><f t="shared" ref="D2:D4" si="0">B2*2</f><v>6</v></c><c r="E2"><f t="array" ref="E2:E4">_xlfn._xlws.SORT(B2:B4)</f><v>1</v></c><c r="F2" t="b"><v>1</v></c><c r="G2" t="e"><v>#N/A</v></c><c r="H2" s="1"><v>45658</v></c></row>
<row r="3" spans="1:8"><c r="A3" t="s"><v>5</v></c><c r="B3"><v>1</v></c><c r="C3" s="2"><f>B3*Rate</f><v>0.25</v></c><c r="D3"><f t="shared" si="0"/><v>2</v></c><c r="E3"><v>2</v></c><c r="F3" t="inlineStr"><is><t xml:space="preserve"> inline </t></is></c><c r="G3"><f>_xlfn.FORECAST.ETS(B2,B2:B4,A2:A4)</f><v>42</v></c></row>
<row r="4" spans="1:8"><c r="A4" t="str"><f>"Ma"&amp;"t"</f><v>Mat</v></c><c r="B4"><v>2</v></c><c r="C4" s="3"><f>B4*Rate</f><v>0.5</v></c><c r="D4"><f t="shared" si="0"/><v>4</v></c><c r="E4"><v>3</v></c></row>
<row r="5" spans="1:8"><c t="s"><v>6</v></c><c><f>SUM(Orders[Amount])</f><v>6</v></c></row>
</sheetData><mergeCells count="1"><mergeCell ref="F4:G4"/></mergeCells><conditionalFormatting sqref="B2:B4"><cfRule type="dataBar" priority="1"/></conditionalFormatting><hyperlinks><hyperlink ref="A2" r:id="rId2"/></hyperlinks><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>`;

const RATES_SHEET = `${HEADER}<worksheet xmlns="${MAIN}"><sheetData><row r="1"><c r="A1" t="s"><v>7</v></c><c r="B1"><v>0.25</v></c></row></sheetData></worksheet>`;

export const RATES_SHEET_WITH_SPLIT = `${HEADER}<worksheet xmlns="${MAIN}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1200" topLeftCell="A4" state="split"/></sheetView></sheetViews><sheetData><row r="1"><c r="A1" t="s"><v>7</v></c><c r="B1"><v>0.25</v></c></row></sheetData></worksheet>`;

export const THEME = `${HEADER}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Custom"><a:themeElements><a:clrScheme name="Custom"><a:dk1><a:sysClr val="windowText" lastClr="101010"/></a:dk1><a:lt1><a:srgbClr val="fafafa"/></a:lt1><a:accent1><a:srgbClr val="112233"/></a:accent1></a:clrScheme></a:themeElements></a:theme>`;

const WORKBOOK = (extra: string): string =>
  `${HEADER}<workbook xmlns="${MAIN}" xmlns:r="${RELATIONSHIPS}"><workbookPr defaultThemeVersion="164011"${extra}/><sheets><sheet name="Sales" sheetId="1" r:id="rId1"/><sheet name="Rates" sheetId="2" state="hidden" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Sales!$A$1:$D$4</definedName><definedName name="Rate">Rates!$B$1</definedName></definedNames><calcPr calcId="191029"/></workbook>`;

const STYLES = `${HEADER}<styleSheet xmlns="${MAIN}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color theme="1" tint="-0.25"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="ffffff00"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" applyFill="1"><alignment horizontal="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

const STRINGS = `${HEADER}<sst xmlns="${MAIN}" count="8" uniqueCount="8"><si><t>Item</t></si><si><t>Amount</t></si><si><t>Cost</t></si><si><t>Twice</t></si><si><t>Pen</t></si><si><r><rPr><b/></rPr><t>In</t></r><r><t>k</t></r><rPh sb="0" eb="1"><t>ignored</t></rPh></si><si><t>Total_x000D_</t></si><si><t>Rate</t></si></sst>`;

const TABLE = `${HEADER}<table xmlns="${MAIN}" id="1" name="Table1" displayName="Orders" ref="A1:D4" totalsRowShown="0"><autoFilter ref="A1:D4"/><tableColumns count="4"><tableColumn id="1" name="Item"/><tableColumn id="2" name="Amount"/><tableColumn id="3" name="Cost"/><tableColumn id="4" name="Twice"/></tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;

const WORKBOOK_RELATIONSHIPS = (...extra: readonly string[]): string =>
  relationships(
    relationship('rId1', 'worksheet', 'worksheets/sheet1.xml'),
    relationship('rId2', 'worksheet', 'worksheets/sheet2.xml'),
    relationship('rId3', 'styles', 'styles.xml'),
    relationship('rId4', 'sharedStrings', 'sharedStrings.xml'),
    ...extra,
  );

export const WORKBOOK_RELATIONSHIPS_WITH_THEME = WORKBOOK_RELATIONSHIPS(
  relationship('rId5', 'theme', 'theme/theme1.xml'),
);

const PARTS: Readonly<Record<string, string>> = {
  '[Content_Types].xml': `${HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`,
  '_rels/.rels': relationships(
    relationship('rId1', 'officeDocument', 'xl/workbook.xml'),
    relationship('rId2', 'extended-properties', 'docProps/app.xml'),
  ),
  'docProps/app.xml': `${HEADER}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>`,
  'xl/workbook.xml': WORKBOOK(''),
  'xl/_rels/workbook.xml.rels': WORKBOOK_RELATIONSHIPS(),
  'xl/styles.xml': STYLES,
  'xl/sharedStrings.xml': STRINGS,
  'xl/worksheets/sheet1.xml': SALES_SHEET,
  'xl/worksheets/sheet2.xml': RATES_SHEET,
  'xl/worksheets/_rels/sheet1.xml.rels': relationships(
    relationship('rId1', 'table', '../tables/table1.xml'),
    `<Relationship Id="rId2" Type="${RELATIONSHIPS}/hyperlink" Target="https://example.com/" TargetMode="External"/>`,
  ),
  'xl/tables/table1.xml': TABLE,
};

export const workbookWith = (extra: string): string => WORKBOOK(extra);

export const xlsxPackage = (
  changes: Readonly<Record<string, string | undefined>> = {},
): Promise<Bytes> => {
  const parts = { ...PARTS, ...changes };
  const encoder = new TextEncoder();

  return writeZip(
    Object.entries(parts).reduce<{ name: string; data: Bytes }[]>((entries, [name, text]) => {
      if (text !== undefined) {
        entries.push({ name, data: encoder.encode(text) });
      }
      return entries;
    }, []),
  );
};
