import { defineBlockState } from '../define-block';

export const OPEN_CLASS = 'nui-content__toggle--open';

export const toggleOpen = defineBlockState((node) => node.attrs.open === true);
