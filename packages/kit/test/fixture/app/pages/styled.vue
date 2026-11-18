<template>
  <main class="page" data-testid="styled-page">
    <h1>Тема и утилиты</h1>
    <NuiButton data-testid="themed">Кнопка темы</NuiButton>
    <div class="w-80" data-testid="track">
      <NuiButton
        class="w-full rounded-none bg-surface-muted text-foreground"
        data-testid="restyled"
      >
        Кнопка с утилитами
      </NuiButton>
    </div>
    <div class="bg-surface-muted text-foreground" data-testid="swatch">Образец</div>
  </main>
</template>
