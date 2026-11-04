# useToast

`useToast()` показывает уведомления. `success`, `error`, `warning` и `info` выводят уведомление
нужного вида, а `show` принимает все опции.

Уведомления выводит `NuiToaster`: поставьте его в приложение один раз. Чтобы вывести
уведомления своей разметкой, возьмите их список из `useToastStore`.

<Example name="composables/Toast" />

## Сигнатура

<SignatureReference :names="['useToast', 'ToastService', 'ToastOptions', 'useToastStore', 'ToastStore']" />

## Поведение

`show` возвращает id, по которому `dismiss` закрывает уведомление. Время показа `duration` и
число уведомлений на экране `limit` по умолчанию берутся из `createNuiConfig({ toasts })`.

Уведомление не закрывается, пока на нём указатель или фокус и пока вкладка в фоне. Компонент
описан на странице [Toast](/components/toast).
