import { reactive, readonly } from 'vue';
import { createErrorControls } from '../core/errors';
import { createFormCore } from '../core/form-core';
import { createHost } from '../core/host';
import { createReset } from '../core/reset';
import { createSubmit } from '../core/submit';
import { createValidation } from '../core/validation';
import { createActions } from './actions';
import { FORM_HOST, provideForm, type FormContext, type UseFormOptions } from './form-context';
import { createViews } from './views';

export const useForm = <V extends object, O = V>(options: UseFormOptions<V, O>): FormContext<V> => {
  const core = createFormCore(options);
  const validation = createValidation(core);
  const errors = createErrorControls(core);
  const host = createHost(core, validation);
  const views = createViews(core);
  const actions = createActions(core, validation, host, errors);
  const resetForm = createReset(core, validation);

  const submit = createSubmit({
    core,
    validation,
    host,
    errors,
    onSubmit: options.onSubmit,
    helpers: {
      setErrors: actions.setErrors,
      setFieldError: actions.setFieldError,
      setFormErrors: actions.setFormErrors,
      resetForm,
    },
    invalid: () => views.invalidPaths(),
    formErrors: () => views.formErrors.value,
  });

  const form: FormContext<V> = {
    ...actions,
    [FORM_HOST]: host,
    values: readonly(reactive(core.engine.raw)),
    errors: views.errors,
    errorBag: views.errorBag,
    formErrors: views.formErrors,
    touched: views.touched,
    meta: views.meta,
    isFieldDirty: views.isFieldDirty,
    isFieldTouched: views.isFieldTouched,
    hasErrors: views.hasErrors,
    errorsUnder: views.errorsUnder,
    firstInvalidPath: (prefix) => views.invalidPaths(prefix)[0],
    focusField: views.focusField,
    resetForm,
    submit,
    settled: core.tracker.settled,
  };

  provideForm(form);
  return form;
};
