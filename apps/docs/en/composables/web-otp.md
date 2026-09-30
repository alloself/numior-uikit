# useWebOtp

`useWebOtp(options)` waits for an SMS with a code through WebOTP and hands the code to
`onCode`. The request lives while the component is mounted and `enabled` stays on.

<Example name="composables/WebOtp" />

## Signature

<SignatureReference :names="['useWebOtp', 'WebOtpOptions', 'WebOtpControl']" />

## Behaviour

WebOTP exists in Chrome on Android: the browser asks for consent and hands over the code from
the SMS. The last line of the message must look like `@example.com #123456` with the site domain.

In other browsers and on the server `supported` is `false` and no request is sent. `abort()`
cancels the wait, and a new request starts once `enabled` turns on again.

[OTP field](/en/components/otp-field) connects the composable through the `web-otp` prop and
waits for the code until the field is complete.
