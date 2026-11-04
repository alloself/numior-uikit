# useWebOtp

`useWebOtp(options)` получает код подтверждения из SMS через WebOTP и передаёт его в `onCode`.
Пользователю не нужно переписывать код вручную.

Композабл ждёт SMS, пока компонент смонтирован и `enabled` не равен `false`.

<Example name="composables/WebOtp" />

## Сигнатура

<SignatureReference :names="['useWebOtp', 'WebOtpOptions', 'WebOtpControl']" />

## Поведение

WebOTP работает в Chrome на Android: браузер спрашивает у пользователя разрешение и передаёт
код из SMS. Последняя строка сообщения должна выглядеть как `@example.com #123456`, где
`example.com` — домен вашего сайта.

В остальных браузерах и на сервере `supported` равен `false`, и композабл ничего не ждёт.
`abort()` прекращает ожидание. Снова ждать SMS композабл начнёт, когда `enabled` выключат и
включат обратно.

[OTP field](/components/otp-field) включает композабл свойством `web-otp` и ждёт код, пока поле
не заполнено.
