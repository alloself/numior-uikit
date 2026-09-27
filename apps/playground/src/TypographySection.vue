<template>
  <section class="panel" aria-labelledby="typography-title">
    <div class="section-heading">
      <h2 id="typography-title">Типографика и утилиты</h2>
      <span class="tag">nui-prose · layout · spacing</span>
    </div>
    <div class="nui-grid-auto nui-gap-4" data-testid="utility-grid">
      <article class="nui-prose nui-p-4 nui-border nui-rounded-lg" data-testid="prose">
        <h1 data-testid="prose-title">Заголовок статьи</h1>
        <p>
          Абзац с <a href="#typography-title" data-testid="prose-link">ссылкой</a>,
          <code>инлайн-кодом</code> и клавишей <kbd>Ctrl</kbd> + <kbd>K</kbd>. Проза стилизует
          только голые элементы.
        </p>
        <h2 data-testid="prose-heading">Раздел</h2>
        <ul>
          <li>Первый пункт</li>
          <li>
            Второй пункт
            <ul>
              <li>Вложенный</li>
            </ul>
          </li>
        </ul>
        <blockquote>Цитата на границе абзаца.</blockquote>
        <table>
          <thead>
            <tr>
              <th>Проп</th>
              <th>Тип</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>size</code></td>
              <td>sm · md · lg</td>
            </tr>
          </tbody>
        </table>
        <p>
          <NuiButton size="md" data-testid="prose-button">Кнопка внутри прозы</NuiButton>
        </p>
        <div class="nui-not-prose">
          <p data-testid="prose-escaped">Абзац вне прозы.</p>
        </div>
        <pre>const answer = 42;</pre>
        <hr />
        <p data-testid="prose-last">Последний абзац.</p>
      </article>
      <div class="nui-prose nui-prose--size-sm nui-p-4 nui-border nui-rounded-lg">
        <h3>Мелкая проза</h3>
        <p data-testid="prose-small">Тот же ритм на шаг меньше.</p>
        <p>
          Выделение <mark>маркером</mark> и <strong>жирный</strong> текст без собственных классов.
        </p>
      </div>
      <div class="nui-flex nui-flex-col nui-gap-2 nui-p-4 nui-border nui-rounded-lg">
        <span class="nui-text-sm nui-text-muted nui-uppercase">Отступы</span>
        <div class="nui-flex nui-items-center nui-gap-2">
          <span class="nui-bg-primary-soft nui-rounded nui-p-2">A</span>
          <span class="nui-bg-primary-soft nui-rounded nui-p-2 nui-ms-4" data-testid="spacing-start"
            >B</span
          >
        </div>
        <p
          class="nui-text-2xl nui-font-semibold nui-tracking-tight nui-truncate"
          data-testid="text-2xl"
        >
          Крупный заголовок утилитами
        </p>
        <p class="nui-max-w-prose nui-text-sm nui-text-subtle nui-mx-auto" data-testid="measure">
          Ширина абзаца ограничена мерой текста.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NuiButton } from '@numior/vue';
</script>
