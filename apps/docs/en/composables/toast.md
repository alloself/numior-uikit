# useToast

`useToast()` shows toasts. `success`, `error`, `warning` and `info` show a toast of that kind,
and `show` takes all the options.

`NuiToaster` renders the toasts: put it in the app once. To render toasts with your own markup,
take their list from `useToastStore`.

<Example name="composables/Toast" />

## Signature

<SignatureReference :names="['useToast', 'ToastService', 'ToastOptions', 'useToastStore', 'ToastStore']" />

## Behaviour

`show` returns an id that `dismiss` uses to close the toast. The display time `duration` and the
number of toasts on screen `limit` default to the values from `createNuiConfig({ toasts })`.

A toast does not close while the pointer or focus is on it and while the tab is in the
background. The component is described on the [Toast](/en/components/toast) page.
