# OTP field

`NuiOtpField` is a field for a one-time code from an SMS, an email or an authenticator app. The
phone suggests the SMS code right above the keyboard, and pasting and password managers work as
in a regular input.

<Example name="otp-field/Basic" />

By default the code has six digits, and `length` changes the count. `groupSize` splits the
cells into groups: with `3` the code reads as "123 456".

## Installation

```ts
import { NuiOtpField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/otp-field.css';
```

## Examples

### Backup code

`charset="alphanumeric"` accepts Latin letters and digits, and letters turn upper case as they
are typed. When the length is not a multiple of `groupSize`, the last group is shorter.

<Example name="otp-field/Access" />

### PIN

With `secret` the characters hide behind dots, and the one just typed stays visible for a
second. The browser treats such a field as a password, so it does not suggest SMS codes.

<Example name="otp-field/Pin" />

### States

`placeholder` shows a character in empty cells, for example `○`. The code in a `readonly`
field can be selected and copied, and a `disabled` field is skipped by Tab.

<Example name="otp-field/States" />

### Validation in a form

Inside `NuiFormField` the code goes through the usual form rules: `required()` catches an empty
code and `min(6)` an incomplete one. The form shows a server error under the cells.

<Example name="otp-field/Form" />

### SMS confirmation

The `complete` event fires once the last character is typed: send the code for checking in the
handler. In the example the field turns `readonly` while the request runs, a wrong code is
cleared, and the focus stays in the field.

<Example name="otp-field/Sms" />

With `web-otp`, Chrome on Android fills in the code from the SMS by itself. The last line of
the message must look like `@example.com #123456`, where `example.com` is your site domain.

## Behaviour

A typed character goes into the current cell, and the caret moves to the next one. Clicking a
filled cell selects it, and a new character replaces the old one. Clicking an empty cell puts
the caret after the last character.

Pasting a complete code replaces the old one, with spaces and dashes removed. A shorter paste
fills the cells starting from the current one. Digits of other scripts, such as Eastern Arabic,
become plain digits.

The model holds only the typed characters, without spaces between groups. `complete` does not
fire when the app changes the value itself.

## Accessibility

A screen reader sees one text field with its label, description and error, and the cells are
hidden from it. The `placeholder` character is not announced, and a field with `secret` is
announced as a password. In right-to-left text the cells still run left to right, like the
digits of the code.

<KeyboardReference name="NuiOtpField" />

## API

<ApiReference name="NuiOtpField" />
