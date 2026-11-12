import { CellError } from '../../core/cell.types';

const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

const DYNAMIC_ARRAY = 'http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray';

const RICH_DATA = 'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata';

const RICH_ERRORS = [
  { code: CellError.Spill, type: 8 },
  { code: CellError.Calc, type: 13 },
] as const;

const METADATA_FLAGS =
  'minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1"';

const DYNAMIC_ARRAY_TYPE = `<metadataType name="XLDAPR" ${METADATA_FLAGS} cellMeta="1"/>`;

const RICH_VALUE_TYPE = `<metadataType name="XLRICHVALUE" ${METADATA_FLAGS}/>`;

const DYNAMIC_ARRAY_FUTURE = `<futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata>`;

const CELL_METADATA = '<cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata>';

const COUNT = String(RICH_ERRORS.length);

const RICH_FUTURE = `<futureMetadata name="XLRICHVALUE" count="${COUNT}">${RICH_ERRORS.map(
  (_, index) =>
    `<bk><extLst><ext uri="{3e2802c4-a4d2-4d8b-9148-e3be6c30e623}"><xlrd:rvb i="${String(index)}"/></ext></extLst></bk>`,
).join('')}</futureMetadata>`;

const VALUE_METADATA = `<valueMetadata count="${COUNT}">${RICH_ERRORS.map(
  (_, index) => `<bk><rc t="2" v="${String(index)}"/></bk>`,
).join('')}</valueMetadata>`;

export const RICH_DATA_RELATIONSHIPS = 'http://schemas.microsoft.com/office/2017/06/relationships';

export const RICH_STRUCTURES_XML = `${HEADER}<rvStructures xmlns="${RICH_DATA}" count="1"><s t="_error"><k n="errorType" t="i"/></s></rvStructures>`;

export const RICH_VALUES_XML = `${HEADER}<rvData xmlns="${RICH_DATA}" count="${COUNT}">${RICH_ERRORS.map(
  (error) => `<rv s="0"><v>${String(error.type)}</v></rv>`,
).join('')}</rvData>`;

export const metadataXml = (errors: boolean): string =>
  errors
    ? `${HEADER}<metadata xmlns="${MAIN}" xmlns:xda="${DYNAMIC_ARRAY}" xmlns:xlrd="${RICH_DATA}"><metadataTypes count="2">${DYNAMIC_ARRAY_TYPE}${RICH_VALUE_TYPE}</metadataTypes>${DYNAMIC_ARRAY_FUTURE}${RICH_FUTURE}${CELL_METADATA}${VALUE_METADATA}</metadata>`
    : `${HEADER}<metadata xmlns="${MAIN}" xmlns:xda="${DYNAMIC_ARRAY}"><metadataTypes count="1">${DYNAMIC_ARRAY_TYPE}</metadataTypes>${DYNAMIC_ARRAY_FUTURE}${CELL_METADATA}</metadata>`;

export const richErrorSlot = (code: CellError): number | undefined => {
  const index = RICH_ERRORS.findIndex((error) => error.code === code);

  return index < 0 ? undefined : index + 1;
};

export const plainErrorCode = (code: CellError): CellError =>
  richErrorSlot(code) === undefined ? code : CellError.Value;
