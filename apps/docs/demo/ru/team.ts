export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly email: string;
}

export const team: readonly [Employee, Employee, Employee, Employee, Employee] = [
  { id: 'anna', name: 'Анна Титова', role: 'Менеджер заказов', email: 'anna@example.com' },
  { id: 'igor', name: 'Игорь Белов', role: 'Кладовщик', email: 'igor@example.com' },
  { id: 'maria', name: 'Мария Ким', role: 'Поддержка', email: 'maria@example.com' },
  { id: 'oleg', name: 'Олег Смирнов', role: 'Закупки', email: 'oleg@example.com' },
  { id: 'dina', name: 'Дина Ахметова', role: 'Маркетинг', email: 'dina@example.com' },
];
