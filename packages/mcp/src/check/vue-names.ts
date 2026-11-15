import { camelCase, upperFirst } from 'lodash-es';

export const DEFAULT_MODEL = 'modelValue';

const KIT_TAG = /^Nui[A-Z]/u;
const KIT_KEBAB_TAG = /^nui-[a-z]/u;
const PASCAL_TAG = /^[A-Z]/u;
const PASSED_PREFIXES = /^(?:aria-|data-|on[A-Z])/u;
const VNODE_HOOK = /^vue:/u;

const SPECIAL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'key',
  'ref',
  'ref_for',
  'ref_key',
  'is',
  'slot',
]);

const NATIVE_ATTRIBUTES: ReadonlySet<string> = new Set([
  'accept',
  'accesskey',
  'alt',
  'autocapitalize',
  'autocomplete',
  'autofocus',
  'checked',
  'cols',
  'contenteditable',
  'dir',
  'disabled',
  'download',
  'draggable',
  'enterkeyhint',
  'for',
  'form',
  'height',
  'hidden',
  'href',
  'hreflang',
  'id',
  'inert',
  'inputmode',
  'lang',
  'max',
  'maxlength',
  'min',
  'minlength',
  'multiple',
  'name',
  'pattern',
  'placeholder',
  'popover',
  'popovertarget',
  'popovertargetaction',
  'readonly',
  'referrerpolicy',
  'rel',
  'required',
  'role',
  'rows',
  'selected',
  'size',
  'spellcheck',
  'src',
  'step',
  'tabindex',
  'target',
  'title',
  'translate',
  'type',
  'value',
  'width',
  'wrap',
]);

export const DOM_EVENT_NAMES: readonly string[] = [
  'animationend',
  'animationstart',
  'auxclick',
  'beforeinput',
  'beforetoggle',
  'blur',
  'change',
  'click',
  'compositionend',
  'compositionstart',
  'compositionupdate',
  'contextmenu',
  'copy',
  'cut',
  'dblclick',
  'drag',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'dragstart',
  'drop',
  'focus',
  'focusin',
  'focusout',
  'input',
  'invalid',
  'keydown',
  'keyup',
  'load',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
  'mouseup',
  'paste',
  'pointercancel',
  'pointerdown',
  'pointerenter',
  'pointerleave',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerup',
  'reset',
  'scroll',
  'scrollend',
  'submit',
  'toggle',
  'touchcancel',
  'touchend',
  'touchmove',
  'touchstart',
  'transitionend',
  'transitionstart',
  'wheel',
];

const DOM_EVENTS: ReadonlySet<string> = new Set(DOM_EVENT_NAMES);

export const propName = (attribute: string): string => camelCase(attribute);

export const eventName = (attribute: string): string =>
  attribute.split(':').map(camelCase).join(':');

export const kitTagName = (tag: string): string | undefined => {
  if (KIT_TAG.test(tag)) {
    return tag;
  }
  return KIT_KEBAB_TAG.test(tag) ? upperFirst(camelCase(tag)) : undefined;
};

export const pascalTagName = (tag: string): string =>
  PASCAL_TAG.test(tag) ? tag : upperFirst(camelCase(tag));

export const passesThrough = (attribute: string): boolean =>
  SPECIAL_ATTRIBUTES.has(attribute) ||
  NATIVE_ATTRIBUTES.has(attribute.toLowerCase()) ||
  PASSED_PREFIXES.test(attribute);

export const isNativeEvent = (event: string): boolean =>
  DOM_EVENTS.has(event.toLowerCase()) || VNODE_HOOK.test(event);
