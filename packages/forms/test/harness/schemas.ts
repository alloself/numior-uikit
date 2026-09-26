import { issue, probeSchema, type ProbeSchema, type SchemaValues } from './schema';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const emailIssues = (values: SchemaValues) =>
  text(values.email).includes('@') ? [] : [issue('Enter an email', 'email')];

const passwordIssues = (values: SchemaValues) =>
  text(values.password).length >= 8 ? [] : [issue('Use at least 8 characters', 'password')];

export const signupSchema = (
  options: { readonly async?: boolean } = {},
): ProbeSchema<SchemaValues> =>
  probeSchema((values) => [...emailIssues(values), ...passwordIssues(values)], options);

const section = (values: SchemaValues, key: string): SchemaValues => {
  const value = values[key];
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? { ...value } : {};
};

export const wizardSchema = (): ProbeSchema<SchemaValues> =>
  probeSchema((values) => {
    const account = section(values, 'account');
    const profile = section(values, 'profile');

    return [
      ...(text(account.email).includes('@') ? [] : [issue('Enter an email', 'account', 'email')]),
      ...(text(account.password).length >= 8
        ? []
        : [issue('Use at least 8 characters', 'account', 'password')]),
      ...(text(profile.name) === '' ? [issue('Enter a name', 'profile', 'name')] : []),
    ];
  });

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

export const routingSchema = (
  options: { readonly async?: boolean } = {},
): ProbeSchema<SchemaValues> =>
  probeSchema((values) => {
    const address = section(values, 'address');
    const tags = list(values.tags);

    return [
      ...(text(address.city) === '' ? [issue('Enter a city', 'address', { key: 'city' })] : []),
      ...(text(address.city) === 'Nowhere' ? [issue('Cities must exist', 'address')] : []),
      ...(tags.includes('') ? [issue('Tags cannot be empty', 'tags', tags.indexOf(''))] : []),
      ...(text(values.name) === 'reject' ? [issue('The form is broken')] : []),
      issue('Server-only field', 'secret'),
    ];
  }, options);

export const companySchema = (): ProbeSchema<SchemaValues> =>
  probeSchema((values) => [
    ...(text(values.name) === '' ? [issue('Enter a name', 'name')] : []),
    ...(text(values.company) === '' ? [issue('Enter a company', 'company')] : []),
  ]);
