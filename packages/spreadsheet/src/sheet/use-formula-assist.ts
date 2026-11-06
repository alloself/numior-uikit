import { Key } from '@numior/primitives';
import { optionElementId, type NuiListEntry } from '@numior/vue';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import {
  BASE_FUNCTIONS,
  canonicalFunction,
  functionCallAt,
  functionPrefixAt,
  loadFunctionHelp,
  localFunction,
  signatureOf,
  type FormulaLocale,
  type FunctionHelpCatalog,
  type FunctionSpec,
  type HelpLanguage,
  type SignaturePart,
} from '../core';
import type { FormulaAssist, FormulaAssistOptions } from './sheet.types';
import { caretFieldIn, placeCaretIn } from './sheet-caret';

interface KnownFunction {
  readonly canonical: string;
  readonly local: string;
  readonly key: string;
}

const FORMULA_START = '=';

const ARIA_CONTROLS = 'aria-controls';

const ARIA_ACTIVE = 'aria-activedescendant';

const ARIA_DESCRIBED = 'aria-describedby';

const ARIA_AUTOCOMPLETE = 'aria-autocomplete';

const keyOf = (name: string): string => name.toUpperCase().replaceAll('Ё', 'Е');

const SPECS: ReadonlyMap<string, FunctionSpec> = new Map(
  BASE_FUNCTIONS.map((spec) => [spec.name, spec]),
);

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

const namesFor = new WeakMap<FormulaLocale, readonly KnownFunction[]>();

const knownFunctions = (locale: FormulaLocale): readonly KnownFunction[] => {
  const known = namesFor.get(locale);

  if (known !== undefined) {
    return known;
  }

  const names = BASE_FUNCTIONS.map((spec) => {
    const local = localFunction(spec.name, locale);

    return { canonical: spec.name, local, key: keyOf(local) };
  }).toSorted((a, b) => collator.compare(a.local, b.local));

  namesFor.set(locale, names);
  return names;
};

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const setAttribute = (field: Element, name: string, value: string | undefined): void => {
  if (value === undefined) {
    field.removeAttribute(name);
  } else {
    field.setAttribute(name, value);
  }
};

export const useFormulaAssist = (options: FormulaAssistOptions): FormulaAssist => {
  const { editing } = options;
  const listId = useId();
  const hintId = useId();

  const caret = ref(0);
  const active = ref(0);
  const dismissed = ref<string>();
  const help = shallowRef<FunctionHelpCatalog>();
  const anchor = shallowRef<HTMLElement | null>(null);

  let loaded: HelpLanguage | undefined;

  const formulas = computed(() => options.locale().formulas);

  const draftText = computed(() => textOf(editing.draft.value?.value));

  const formula = computed(() => draftText.value.startsWith(FORMULA_START));

  const prefix = computed(() =>
    formula.value ? functionPrefixAt(draftText.value, caret.value, formulas.value) : undefined,
  );

  const prefixKey = computed(() =>
    prefix.value === undefined ? undefined : `${String(prefix.value.start)}:${prefix.value.text}`,
  );

  const matches = computed((): readonly KnownFunction[] => {
    const typed = prefix.value;

    if (typed === undefined || prefixKey.value === dismissed.value) {
      return [];
    }

    const wanted = keyOf(typed.text);

    return knownFunctions(formulas.value).filter((known) => known.key.startsWith(wanted));
  });

  const entries = computed((): readonly NuiListEntry[] =>
    matches.value.map((known) => ({
      key: known.canonical,
      value: known.canonical,
      label: known.local,
      description: help.value?.[known.canonical]?.summary,
    })),
  );

  const open = computed(() => entries.value.length > 0);

  const called = computed(() => {
    const call =
      formula.value && !open.value
        ? functionCallAt(draftText.value, caret.value, formulas.value)
        : undefined;

    const canonical = call === undefined ? undefined : canonicalFunction(call.name, formulas.value);
    const spec = canonical === undefined ? undefined : SPECS.get(canonical);
    const entry = canonical === undefined ? undefined : help.value?.[canonical];

    return call === undefined || spec === undefined || entry === undefined
      ? undefined
      : { call, spec, entry };
  });

  const summary = computed(() => called.value?.entry.summary ?? '');

  const typedLength = computed(() => prefix.value?.text.length ?? 0);

  const hint = computed((): readonly SignaturePart[] => {
    const found = called.value;

    if (found === undefined) {
      return [];
    }
    const { call, spec, entry } = found;

    return signatureOf({
      name: localFunction(spec.name, formulas.value),
      min: spec.min,
      max: spec.max,
      help: entry,
      argument: call.argument,
      separator: formulas.value.argument,
    });
  });

  const field = (): HTMLInputElement | HTMLTextAreaElement | undefined =>
    caretFieldIn(options.root.value, options.nameField.value);

  const loadHelp = async (language: HelpLanguage): Promise<void> => {
    const catalog = await loadFunctionHelp(language);

    if (loaded === language) {
      help.value = catalog;
    }
  };

  const syncCaret = (): void => {
    const current = field();

    anchor.value = current ?? null;
    caret.value = current?.selectionEnd ?? draftText.value.length;
  };

  const write = (text: string, at: number): void => {
    const draft = editing.draft.value;

    if (draft !== undefined) {
      editing.setDraft({ ...draft, value: text });
      caret.value = at;
      void placeCaretIn(options.root.value, options.nameField.value, at);
    }
  };

  const choose = (canonical: string): void => {
    const typed = prefix.value;
    const text = draftText.value;

    if (typed === undefined) {
      return;
    }

    const inserted = `${localFunction(canonical, formulas.value)}(`;

    write(
      `${text.slice(0, typed.start)}${inserted}${text.slice(caret.value)}`,
      typed.start + inserted.length,
    );
  };

  const hover = (index: number): void => {
    active.value = index;
  };

  const move = (step: number): void => {
    const count = matches.value.length;

    active.value = (active.value + step + count) % count;
  };

  const handled = (event: KeyboardEvent): boolean => {
    switch (event.key) {
      case Key.ArrowDown: {
        move(1);
        return true;
      }
      case Key.ArrowUp: {
        move(-1);
        return true;
      }
      case Key.Enter:
      case Key.Tab: {
        const chosen = matches.value[active.value];

        if (chosen !== undefined && !event.shiftKey) {
          choose(chosen.canonical);
        }
        return chosen !== undefined && !event.shiftKey;
      }
      case Key.Escape: {
        dismissed.value = prefixKey.value;
        return true;
      }
      default: {
        return false;
      }
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (open.value && !event.altKey && !event.ctrlKey && !event.metaKey && handled(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  watch(matches, () => {
    active.value = 0;
  });

  watch(
    () => (formula.value ? options.language() : undefined),
    (language) => {
      if (language !== undefined && loaded !== language) {
        loaded = language;
        void loadHelp(language);
      }
    },
    { immediate: true },
  );

  watch(
    () => [anchor.value, open.value, active.value, hint.value.length > 0] as const,
    ([element, listed, index, hinted], previous) => {
      const before = previous?.[0];

      if (before !== undefined && before !== null && before !== element) {
        [ARIA_CONTROLS, ARIA_ACTIVE, ARIA_DESCRIBED, ARIA_AUTOCOMPLETE].forEach((name) => {
          before.removeAttribute(name);
        });
      }
      if (element !== null) {
        setAttribute(element, ARIA_AUTOCOMPLETE, formula.value ? 'list' : undefined);
        setAttribute(element, ARIA_CONTROLS, listed ? listId : undefined);
        setAttribute(element, ARIA_ACTIVE, listed ? optionElementId(listId, index) : undefined);
        setAttribute(element, ARIA_DESCRIBED, hinted ? hintId : undefined);
      }
    },
    { flush: 'post' },
  );

  return {
    listId,
    hintId,
    entries,
    active,
    open,
    hint,
    summary,
    typed: typedLength,
    anchor,
    syncCaret,
    onKeydown,
    choose,
    hover,
  };
};
