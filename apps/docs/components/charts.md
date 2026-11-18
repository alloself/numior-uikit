# Графики

График строится из одного объекта с категориями и сериями.

<Example name="charts/Revenue" />

Наведите на столбец или пройдите по столбцам стрелками — значение покажет подсказка.

## Установка

```ts install:packages
import { NuiChart } from '@numior/kit/charts';
```

Цвета серий берутся из токенов `--color-chart-1`…`--color-chart-8`, поэтому графики перекрашиваются вместе с темой.

## Описать график

Передайте в `spec` вид графика, категории и серии значений:

```ts
import type { ChartSpec } from '@numior/kit/charts';

const revenue: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: ['Апрель', 'Май', 'Июнь'] },
  series: [{ id: 'revenue', name: 'Выручка, ₽', values: [3_508_600, null, 3_287_600] }],
};
```

В серии по одному значению на каждую категорию. Если значения нет, передайте `null`: столбца на этом месте не будет, а линия прервётся.

## Примеры

### Сравнить серии

Передайте несколько серий.

<Example name="charts/Compare" />

### Сложить серии в стопку

Задайте `stacking`.

<Example name="charts/Stacked" />

Со значением `percent` каждый столбец занимает всю высоту, и видно, как меняются доли статусов.

### Повернуть столбцы

Возьмите `kind: 'bar'`, если подписи категорий длинные.

<Example name="charts/Bars" />

### Показать динамику

Передайте даты в категориях `{ kind: 'time' }`.

<Example name="charts/Trend" />

Даты передаются числами, как их возвращает `Date.parse`. Подписи оси подбираются по длине периода: дни, недели или месяцы.

### Не рвать линию на пустых днях

Задайте `gaps: 'connect'`.

<Example name="charts/Gaps" />

В дни без заказов суммы на один заказ нет, и в серии стоит `null`. По умолчанию линия на таком дне прерывается, а с `connect` пропуск закрывает пунктир.

### Показать доли

Возьмите `kind: 'doughnut'`.

<Example name="charts/Shares" />

Цвет сектора задаёт категория, поэтому легенда перечисляет категории. Круг `pie` рисует только первую серию, а кольцо показывает серии вложенными кольцами.

### Найти связь двух величин

Возьмите `kind: 'scatter'` и передайте числа в категориях `{ kind: 'number' }`.

<Example name="charts/Scatter" />

Подпишите оси в `categoryAxis.title` и `valueAxis.title`: эти же названия подсказка ставит рядом со значениями точки.

### Выбрать значение

Свяжите `v-model:selected`.

<Example name="charts/Selection" />

Клик или Enter выбирает столбец, повторный клик снимает выбор, и в модели оказывается `null`.

### Заменить подсказку

Опишите содержимое в слоте `tooltip`.

<Example name="charts/Tooltip" />

По индексу категории из `hit` найдите свои данные, а заголовок возьмите из `content`.

### Растянуть график по карточке

Задайте `height="fill"`.

<Example name="charts/Fill" />

Высоту задаёт контейнер, например соседняя карточка в той же строке сетки.

## Доступность

Фигура получает имя из `label`, а все значения лежат в скрытой таблице данных для экранного диктора. Когда пользователь идёт по значениям стрелками, диктор объявляет категорию и значения серий.

Включите `showTable`, чтобы показать таблицу всем. Выключите `focusable`, если график не должен попадать в порядок табуляции.

<KeyboardReference name="NuiChart" />

## API

<ApiReference name="NuiChart" />

### Типы

```ts
interface ChartSpec {
  kind: 'column' | 'bar' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter';
  categories: ChartCategories;
  series: ChartSeries[];
  stacking?: 'none' | 'stacked' | 'percent';
  gaps?: 'break' | 'connect';
  valueAxis?: ChartValueAxis;
  categoryAxis?: { title?: string };
  hole?: number;
}

type ChartCategories =
  | { kind: 'text'; labels: string[] }
  | { kind: 'time'; values: number[] }
  | { kind: 'number'; values: number[] };

interface ChartSeries {
  id: string;
  name: string;
  values: (number | null)[];
  slot?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}

interface ChartValueAxis {
  title?: string;
  min?: number;
  max?: number;
  scale?: 'linear' | 'log';
  gridlines?: boolean;
}

interface ChartHit {
  index: number;
  series: number | undefined;
}
```
