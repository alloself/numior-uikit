# OTP field

A field for a one-time code from an SMS, an email or an authenticator app.

<Example name="otp-field/Basic" />

Set the number of characters in `length` and the size of the groups in `groupSize`.

## Installation

```ts
import { NuiOtpField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/otp-field.css';
```

## Usage

Change the length of the code, the characters it takes and the states of the field.

<Configurator name="NuiOtpField" />

## Examples

### Confirm a sign-in by SMS

Send the code for checking in the `complete` handler.

<Example name="otp-field/Sms" />

On a phone the code from the SMS appears above the keyboard, and one tap fills the field.

Add `web-otp`, and Chrome on Android fills in the code by itself once the user allows it. The
last line of the SMS must look like `@example.com #123456`, where `example.com` is your domain.

### Accept a backup code

Allow letters with `charset`.

<Example name="otp-field/Access" />

The field takes Latin letters and turns them upper case.

### Hide a PIN

Add `secret`.

<Example name="otp-field/Pin" />

The character just typed stays visible for a second. Browsers treat the field as a password and
do not suggest SMS codes for it.

### Check the code in a form

Wrap the field in `NuiFormField`.

<Example name="otp-field/Form" />

The `required()` rule catches an empty code, and `min(6)` an incomplete one.

## Behavior

- A typed character goes into the current cell, and the caret moves to the next one. A click on
  a filled cell selects it, so the next character replaces it.
- A pasted code of full length replaces the old one, without spaces and dashes. A shorter paste
  fills the cells from the current one.
- Deleting a character shifts the ones after it to the left, so the code never has gaps.
- The model holds the code without separators, with digits of any script turned into 0–9.
  `complete` does not fire when the app sets the value itself.

## Accessibility

A screen reader sees one text field with its label, hint and error, and the cells are hidden from
it. A field with `secret` is announced as a password. In right-to-left text the cells still run
left to right, like the digits of the code.

<KeyboardReference name="NuiOtpField" />

## API

<ApiReference name="NuiOtpField" />
