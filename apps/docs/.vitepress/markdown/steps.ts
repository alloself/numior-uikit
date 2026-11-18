import { range } from 'lodash-es';
import type { MarkdownRenderer } from 'vitepress';

type BlockRule = Parameters<MarkdownRenderer['block']['ruler']['before']>[2];

type BlockState = Parameters<BlockRule>[0];

type Token = BlockState['tokens'][number];

const OPEN_RE = /^::::\s*steps\s*$/;
const CLOSE_RE = /^::::\s*$/;
const STEP_HEADING_RE = /^###\s/;
const STEP_TAG = 'h3';
const STEP_HEADING_CLASS = 'scroll-mt-20';

const STEPS_OPEN = 'steps_open';
const STEPS_CLOSE = 'steps_close';
const STEP_OPEN = 'step_open';
const STEP_TITLE_CLOSE = 'step_title_close';
const STEP_CLOSE = 'step_close';

const lineOf = (state: BlockState, line: number): string =>
  state.src.slice((state.bMarks[line] ?? 0) + (state.tShift[line] ?? 0), state.eMarks[line]);

const closingLine = (state: BlockState, start: number, end: number): number | undefined =>
  range(start, end).find((line) => CLOSE_RE.test(lineOf(state, line)));

const opensWithStep = (state: BlockState, start: number, end: number): boolean => {
  const first = range(start, end).find((line) => lineOf(state, line).trim() !== '');

  return first !== undefined && STEP_HEADING_RE.test(lineOf(state, first));
};

const blockToken = (state: BlockState, type: string, nesting: Token['nesting']): Token => {
  const token = new state.Token(type, '', nesting);

  token.block = true;
  return token;
};

const isStepHeading = (token: Token, level: number): boolean =>
  token.tag === STEP_TAG && token.level === level;

const wrapSteps = (state: BlockState, from: number, level: number): void => {
  const inner = state.tokens.splice(from);
  let opened = false;

  for (const token of inner) {
    if (token.type === 'heading_open' && isStepHeading(token, level)) {
      if (opened) {
        state.tokens.push(blockToken(state, STEP_CLOSE, -1));
      }

      state.tokens.push(blockToken(state, STEP_OPEN, 1));
      token.attrJoin('class', STEP_HEADING_CLASS);
      opened = true;
    }

    state.tokens.push(token);

    if (token.type !== 'heading_close' || !isStepHeading(token, level)) {
      continue;
    }

    state.tokens.push(blockToken(state, STEP_TITLE_CLOSE, 0));
  }

  state.tokens.push(blockToken(state, STEP_CLOSE, -1));
};

const stepsRule: BlockRule = (state, startLine, endLine, silent) => {
  if (!OPEN_RE.test(lineOf(state, startLine))) {
    return false;
  }

  const close = closingLine(state, startLine + 1, endLine);
  const found = close !== undefined && opensWithStep(state, startLine + 1, close);

  if (!found || silent) {
    return found;
  }

  const lineMax = state.lineMax;
  const open = state.push(STEPS_OPEN, '', 1);

  open.block = true;
  open.map = [startLine, close + 1];
  state.lineMax = close;
  state.md.block.tokenize(state, startLine + 1, close);
  state.lineMax = lineMax;
  wrapSteps(state, state.tokens.indexOf(open) + 1, open.level + 1);
  state.push(STEPS_CLOSE, '', -1).block = true;
  state.line = close + 1;
  return true;
};

export const stepLists = (md: MarkdownRenderer): void => {
  md.block.ruler.before('fence', 'steps', stepsRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });

  md.renderer.rules[STEPS_OPEN] = () => '<NuiStepper readonly>\n';
  md.renderer.rules[STEPS_CLOSE] = () => '</NuiStepper>\n';
  md.renderer.rules[STEP_OPEN] = () => '<NuiStepperStep>\n<template #title>\n';
  md.renderer.rules[STEP_TITLE_CLOSE] = () => '</template>\n';
  md.renderer.rules[STEP_CLOSE] = () => '</NuiStepperStep>\n';
};
