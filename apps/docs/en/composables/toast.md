# useToast

`useToast()` returns the toast service: `show` with full options and the short `success`,
`error`, `warning`, `info`. `NuiToaster`, placed once in the app, renders the toasts;
`useToastStore` exposes the queue for own markup.

<Example name="composables/Toast" />

## Signature

<SignatureReference :names="['useToast', 'ToastService', 'ToastOptions', 'useToastStore', 'ToastStore']" />

## Behaviour

`show` returns an id for `dismiss`; the default `duration` and `limit` come from
`createNuiConfig({ toasts })`. A toast timer pauses on hover and while the tab is in the
background. The component is described on the [Toast](/en/components/toast) page.
