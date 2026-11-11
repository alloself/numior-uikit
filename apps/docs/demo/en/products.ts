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
    label: 'Furniture',
    children: [
      { value: 'seating', label: 'Chairs' },
      { value: 'tables', label: 'Tables' },
      { value: 'storage', label: 'Storage' },
    ],
  },
  {
    value: 'lighting',
    label: 'Lighting',
    children: [
      { value: 'lamps', label: 'Lamps' },
      { value: 'pendants', label: 'Pendants' },
    ],
  },
  {
    value: 'textile',
    label: 'Textiles',
    children: [
      { value: 'throws', label: 'Throws' },
      { value: 'pillows', label: 'Pillows' },
    ],
  },
];

export const products: readonly Product[] = [
  { sku: 'S-101', name: 'Oslo armchair', category: 'seating', price: 249, stock: 12 },
  { sku: 'S-104', name: 'Bergen chair', category: 'seating', price: 89, stock: 34 },
  { sku: 'S-110', name: 'Loft stool', category: 'seating', price: 45, stock: 0 },
  { sku: 'T-201', name: 'Malmo desk', category: 'tables', price: 329, stock: 7 },
  { sku: 'T-207', name: 'Tromso coffee table', category: 'tables', price: 139, stock: 15 },
  { sku: 'H-301', name: 'Vik shelving unit', category: 'storage', price: 199, stock: 9 },
  { sku: 'H-305', name: 'Fjord dresser', category: 'storage', price: 299, stock: 4 },
  { sku: 'L-401', name: 'Nord table lamp', category: 'lamps', price: 69, stock: 41 },
  { sku: 'L-408', name: 'Arc floor lamp', category: 'lamps', price: 119, stock: 18 },
  { sku: 'L-412', name: 'Sphere pendant', category: 'pendants', price: 99, stock: 22 },
  { sku: 'X-501', name: 'Wool throw', category: 'throws', price: 59, stock: 56 },
  { sku: 'X-507', name: 'Linen pillow', category: 'pillows', price: 29, stock: 80 },
];
