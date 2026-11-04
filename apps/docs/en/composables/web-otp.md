# useWebOtp

`useWebOtp(options)` gets a verification code from an SMS through WebOTP and passes it to
`onCode`. The user does not have to type the code by hand.

The composable waits for the SMS while the component is mounted and `enabled` is not `false`.

<Example name="composables/WebOtp" />

## Signature

<SignatureReference :names="['useWebOtp', 'WebOtpOptions', 'WebOtpControl']" />

## Behaviour

WebOTP works in Chrome on Android: the browser asks the user for permission and passes on the
code from the SMS. The last line of the message must look like `@example.com #123456`, where
`example.com` is your site's domain.

In other browsers and on the server `supported` is `false`, and the composable does not wait.
`abort()` stops waiting. The composable waits for an SMS again once `enabled` is turned off and
back on.

[OTP field](/en/components/otp-field) turns the composable on with the `web-otp` prop and waits
for the code until the field is filled.
