export interface Product {
  readonly sku: string;
  readonly name: string;
  readonly category: string;
  readonly price: number;
  readonly stock: number;
}

export interface Category {
  readonly value: string;
  readonly label: string;
  readonly children?: readonly Category[];
}

export const categories: readonly Category[] = [
  {
    value: 'furniture',
    label: 'Мебель',
    children: [
      { value: 'seating', label: 'Кресла и стулья' },
      { value: 'tables', label: 'Столы' },
      { value: 'storage', label: 'Хранение' },
    ],
  },
  {
    value: 'lighting',
    label: 'Свет',
    children: [
      { value: 'lamps', label: 'Лампы' },
      { value: 'pendants', label: 'Подвесы' },
    ],
  },
  {
    value: 'textile',
    label: 'Текстиль',
    children: [
      { value: 'throws', label: 'Пледы' },
      { value: 'pillows', label: 'Подушки' },
    ],
  },
];

export const products: readonly Product[] = [
  { sku: 'S-101', name: 'Кресло «Осло»', category: 'seating', price: 18900, stock: 12 },
  { sku: 'S-104', name: 'Стул «Берген»', category: 'seating', price: 6400, stock: 34 },
  { sku: 'S-110', name: 'Табурет «Лофт»', category: 'seating', price: 3200, stock: 0 },
  { sku: 'T-201', name: 'Стол «Мальмё»', category: 'tables', price: 24500, stock: 7 },
  { sku: 'T-207', name: 'Журнальный стол «Тромсё»', category: 'tables', price: 9800, stock: 15 },
  { sku: 'H-301', name: 'Стеллаж «Вик»', category: 'storage', price: 14200, stock: 9 },
  { sku: 'H-305', name: 'Комод «Фьорд»', category: 'storage', price: 21900, stock: 4 },
  { sku: 'L-401', name: 'Лампа «Нурд»', category: 'lamps', price: 4900, stock: 41 },
  { sku: 'L-408', name: 'Торшер «Арка»', category: 'lamps', price: 8700, stock: 18 },
  { sku: 'L-412', name: 'Подвес «Сфера»', category: 'pendants', price: 7300, stock: 22 },
  { sku: 'X-501', name: 'Плед «Шерсть»', category: 'throws', price: 3900, stock: 56 },
  { sku: 'X-507', name: 'Подушка «Лён»', category: 'pillows', price: 1900, stock: 80 },
];
