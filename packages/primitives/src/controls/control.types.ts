import type { Component, InputHTMLAttributes } from 'vue';
import type { Guard } from '../guards/guards';

export type ComponentProps<C> = C extends new (...args: never[]) => { $props: infer P }
  ? P
  : C extends (props: infer P, ...args: never[]) => unknown
    ? P
    : object;

export type ModelKeys<M extends string> = M | `onUpdate:${M}`;

export type ControlKeys =
  | ModelKeys<'modelValue'>
  | 'id'
  | 'name'
  | 'invalid'
  | 'required'
  | 'disabled'
  | 'readonly';

export type ControlProps<C, M extends string = 'modelValue'> = Omit<
  ComponentProps<C>,
  ControlKeys | ModelKeys<M>
> &
  Omit<InputHTMLAttributes, ControlKeys | ModelKeys<M> | 'value'>;

export type ControlValue<C, M extends string = 'modelValue'> =
  ComponentProps<C> extends { readonly [K in M]: infer V }
    ? V
    : ComponentProps<C> extends { readonly [K in M]?: infer V }
      ? V | undefined
      : unknown;

export type ControlEmit<C, M extends string> =
  ComponentProps<C> extends {
    readonly [K in `onUpdate:${M}`]?: (value: infer E) => unknown;
  }
    ? E
    : unknown;

type Unchecked<E> = unknown extends E
  ? true
  : E extends readonly (infer I)[]
    ? unknown extends I
      ? true
      : false
    : false;

export type EmitsInto<C, R, M extends string> =
  Unchecked<ControlEmit<C, M>> extends true
    ? unknown
    : [ControlEmit<C, M>] extends [R]
      ? unknown
      : { readonly updateModel: ControlEmit<C, M> };

export interface NuiControlEntry<
  C extends Component = Component,
  V = unknown,
  M extends string = string,
> {
  readonly component: C;
  readonly model: M;
  readonly accepts: Guard<V>;
  readonly props: Guard<Readonly<Record<string, unknown>>>;
}

export type NuiControlRegistry = Readonly<Record<string, NuiControlEntry>>;

export type ControlOf<R extends NuiControlRegistry, K extends keyof R> =
  R[K] extends NuiControlEntry<infer C, infer V, infer M>
    ? { readonly component: C; readonly value: V; readonly model: M }
    : never;

export interface ControlOptions<M extends string> {
  readonly model?: M | undefined;
  readonly props?: Guard<Readonly<Record<string, unknown>>> | undefined;
}
