export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly email: string;
}

export const team: readonly [Employee, Employee, Employee, Employee, Employee] = [
  { id: 'anna', name: 'Anna Turner', role: 'Order manager', email: 'anna@example.com' },
  { id: 'igor', name: 'Ian Bell', role: 'Warehouse', email: 'igor@example.com' },
  { id: 'maria', name: 'Maria Kim', role: 'Support', email: 'maria@example.com' },
  { id: 'oleg', name: 'Owen Smith', role: 'Purchasing', email: 'oleg@example.com' },
  { id: 'dina', name: 'Dina Ahmed', role: 'Marketing', email: 'dina@example.com' },
];
