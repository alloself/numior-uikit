# useToast

`useToast()` возвращает сервис уведомлений: `show` с полными опциями и короткие `success`,
`error`, `warning`, `info`. Уведомления рисует `NuiToaster`, размещённый один раз в
приложении; `useToastStore` даёт доступ к очереди для своей разметки.

<Example name="composables/Toast" />

## Сигнатура

<SignatureReference :names="['useToast', 'ToastService', 'ToastOptions', 'useToastStore', 'ToastStore']" />

## Поведение

`show` возвращает id для `dismiss`; `duration` и `limit` по умолчанию берутся из
`createNuiConfig({ toasts })`. Таймер уведомления останавливается при наведении и при уходе
вкладки в фон. Компонент описан на странице [Toast](/components/toast).
