# OTP field

`NuiOtpField` takes a one-time code from an SMS, an email or an authenticator app. A single
native input lies under the slots, so the phone keyboard code suggestion, pasting and password
managers work.

<Example name="otp-field/Basic" />

## Installation

```ts
import { NuiOtpField } from '@numior/vue';
import '@numior/vue/styles/field.css';
import '@numior/vue/styles/otp-field.css';
```

## Examples

### Backup code

`charset="alphanumeric"` accepts Latin letters and digits and turns letters upper case.
`groupSize` splits the slots into groups, and the last group may be shorter.

<Example name="otp-field/Access" />

### PIN

`secret` hides characters behind dots: the digit just typed stays visible for a second, then
collapses into a dot. The browser treats such a field as a password and suggests no SMS codes.

<Example name="otp-field/Pin" />

### States

`placeholder` draws a character in empty slots. The code in a read-only field can be selected
and copied, and a disabled field skips the focus.

<Example name="otp-field/States" />

### Validation in a form

Inside `NuiFormField` the field goes through the usual rules: `required()` catches an empty code
and `min(6)` an incomplete one. The form shows a server error under the slots.

<Example name="otp-field/Form" />

### SMS confirmation

The `complete` event arrives as soon as the whole code is in and starts the check. The field is
read-only while the request runs; a wrong code is cleared and the focus stays in the field.

<Example name="otp-field/Sms" />

`web-otp` reads the code from an SMS through WebOTP in Chrome on Android. The last line of the
message must look like `@example.com #123456` with the site domain.

## Behaviour

A character lands in the active slot and the next slot becomes active. Clicking a filled slot
selects it, and a new character replaces the old one. Clicking an empty slot puts the caret after
the last character.

Pasting a complete code replaces the whole code, and spaces and dashes are dropped. A shorter
paste is written over the slots from the active one. Digits of other scripts become ASCII.

The model holds only the typed characters without separators. `complete` does not fire when the
application changes the value itself.

## Accessibility

A screen reader sees one text field with its label, description and error. The slots are hidden
from it, the placeholder is not announced, and in `secret` mode the field is announced as a
password. The slot row runs left to right even in RTL.

<KeyboardReference name="NuiOtpField" />

## API

<ApiReference name="NuiOtpField" />
