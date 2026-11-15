import type { PatternList, TermList } from './guard.types.ts';

const EDGE = String.raw`(?![\p{L}\p{N}])`;
const START = String.raw`(?<![\p{L}\p{N}])`;

const word = (source: string): RegExp => new RegExp(`${START}(?:${source})${EDGE}`, 'iu');
const cased = (source: string): RegExp => new RegExp(`${START}(?:${source})${EDGE}`, 'u');

export const GLOSSARY: TermList = {
  ru: [
    [word('скрин-?ридер\\p{L}*|программ\\p{L}* чтения с экрана'), 'экранный диктор'],
    [word('спиннер\\p{L}*|лоадер\\p{L}*|крутилк\\p{L}*'), 'индикатор загрузки'],
    [word('чекбокс\\p{L}*'), 'флажок'],
    [word('попап\\p{L}*'), 'поповер'],
    [word('цветов\\p{L}+ схем\\p{L}*'), 'тема'],
    [word('щелч\\p{L}+|щ[её]лк\\p{L}+|тап(?:а|у|ом|ните)?'), 'клик'],
    [word('направлени\\p{L}+ письма'), 'направление текста'],
    [word('дизейбл\\p{L}*|задизейбл\\p{L}*|деактивир\\p{L}*'), 'отключает'],
  ],
  en: [
    [word('screenreaders?'), 'screen reader'],
    [word('spinners?'), 'loading indicator'],
    [word('pop-?ups?'), 'popover'],
    [word('colou?r schemes?'), 'theme'],
    [
      word(
        'colour(?:s|ed|ing|ful)?|behaviours?|neighbour(?:s|ing|hood)?|favour(?:s|ed|ite|ites)?|honours?|centred?|centres?|metres?|litres?|fibres?|theatres?|programmes?|defence|offence|practis(?:e|es|ed|ing)|towards|grey|dialogues?|catalogues?|licences?|whilst|cancell(?:ed|ing)|labell(?:ed|ing)|travell(?:ed|ing|er)|modell(?:ed|ing)|signall(?:ed|ing)|analys(?:e|es|ed|ing)|(?:custom|organ|initial|normal|optim|recogn|serial|synchron|visual|final|local)is(?:e|es|ed|ing|ation)',
      ),
      'US spelling',
    ],
  ],
};

export const META: PatternList = {
  ru: [
    word('в этом примере|этот пример|пример показывает|в этом разделе'),
    word('(?:на этой странице|эта страница) (?:собран|описан|показан|перечисл|рассказ)\\p{L}*'),
    word('ниже показан\\p{L}*|как показано'),
  ],
  en: [
    word('this example|the example shows|in this section|shown below|as shown'),
    word('this page (?:shows|describes|covers|lists|explains)'),
  ],
};

export const SPEED: PatternList = {
  ru: [
    word('\\d[\\d\\s,.]*\\s?(?:мс|fps)|\\d+\\s+кадр\\p{L}*\\s+в\\s+секунду'),
    word('в\\s+\\d+\\s+раз\\p{L}*\\s+быстрее'),
  ],
  en: [
    word('\\d[\\d\\s,.]*\\s?(?:ms|fps)|\\d+\\s+frames\\s+per\\s+second'),
    word('\\d+\\s?[x×]\\s+faster|\\d+\\s+times\\s+faster'),
  ],
};

export const SPEED_CONTEXT: PatternList = {
  ru: [/рендер|отрис|прокру|сортир|быстр|занима|кадр/iu],
  en: [/render|scroll|sort|fast|takes|paint|frame/iu],
};

export const EVALUATIVE: PatternList = {
  ru: [
    word(
      'лучш\\p{L}+|удобн\\p{L}+|современн\\p{L}+|красив\\p{L}+|прост(?:ой|ая|ое|ые|о)|легко|мощн\\p{L}+|гибк\\p{L}+|над[её]жн\\p{L}+|быстр(?:ый|ая|ое|ые)',
    ),
  ],
  en: [
    word(
      'best|blazing|modern|beautiful|easy|easily|simple|simply|powerful|flexible|robust|delightful|rich|great|fast',
    ),
  ],
};

export const INSTEAD: PatternList = {
  ru: [word('вместо')],
  en: [word('instead of|rather than')],
};

export const INVENTORY = /(?<![\p{L}\p{N}.,])\d+\s+\p{L}{3,}/u;

export const FILLERS: PatternList = {
  ru: [
    cased('(?:Перв|Втор|Трет)(?:ый|ой|ий|ая|ья|ое|ье)'),
    cased('(?:Элемент|Пункт|Строка|Вариант|Вкладка|Раздел) \\d+'),
    cased('Содержимое(?: \\p{L}+)?'),
    word('lorem ipsum'),
    cased('(?:Маленьк|Обычн|Больш|Крупн|Средн|Компактн)(?:ий|ый|ой|ая|ое)'),
  ],
  en: [
    cased('First|Second|Third'),
    cased('(?:Item|Option|Row|Tab|Section|Label) \\d+'),
    cased('Content'),
    word('lorem ipsum'),
    cased('Small|Medium|Large|Regular|Compact|Default'),
  ],
};

export const NAME: PatternList = {
  ru: [/(?<![\p{L}«])[А-ЯЁ][а-яё]+ [А-ЯЁ][а-яё]+(?![\p{L}])/gu],
  en: [/(?<![\p{L}])[A-Z][a-z]+ [A-Z][a-z]+(?![\p{L}])/gu],
};

export const NOT_NAMES: ReadonlySet<string> = new Set(['Нижний Новгород', 'New York']);
