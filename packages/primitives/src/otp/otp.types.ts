export type OtpCharset = (typeof OtpCharset)[keyof typeof OtpCharset];

export type OtpDirection = (typeof OtpDirection)[keyof typeof OtpDirection];

export const OtpCharset = { Digits: 'digits', Alphanumeric: 'alphanumeric' } as const;

export const OtpDirection = { Forward: 'forward', Backward: 'backward' } as const;
