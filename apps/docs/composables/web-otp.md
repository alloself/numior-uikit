# useWebOtp

`useWebOtp(options)` ждёт SMS с кодом через WebOTP и передаёт код в `onCode`. Запрос живёт,
пока компонент смонтирован и `enabled` не выключен.

<Example name="composables/WebOtp" />

## Сигнатура

<SignatureReference :names="['useWebOtp', 'WebOtpOptions', 'WebOtpControl']" />

## Поведение

WebOTP есть в Chrome на Android: браузер спрашивает согласие и отдаёт код из SMS. Последняя
строка сообщения должна быть вида `@example.com #123456` с доменом сайта.

В остальных браузерах и на сервере `supported` равен `false`, и запрос не отправляется.
`abort()` отменяет ожидание, а новый запрос начнётся, когда `enabled` снова включится.

[OTP field](/components/otp-field) подключает композабл пропом `web-otp` и ждёт код, пока поле
не заполнено.
