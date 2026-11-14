<template>
  <section class="panel" aria-labelledby="data-title">
    <div class="section-heading">
      <h2 id="data-title">Данные</h2>
      <span class="tag">NuiBadge · NuiChip · NuiAvatar · NuiCard · NuiList · NuiEmpty</span>
    </div>
    <div class="data-row" data-testid="data-badges">
      <NuiBadge>Черновик</NuiBadge>
      <NuiBadge tone="primary" icon="check">Готово</NuiBadge>
      <NuiBadge tone="success" variant="outline">Оплачен</NuiBadge>
      <NuiBadge tone="warning" variant="solid" size="sm">Beta</NuiBadge>
      <NuiBadge tone="info" size="sm">Новое</NuiBadge>
      <NuiBadge tone="error" :count="120" data-testid="data-badge-count" />
      <NuiBadge tone="success" dot label="В сети" data-testid="data-badge-dot" />
      <span class="floating-host">
        <NuiButton variant="outline" tone="neutral" aria-label="Уведомления">
          <NuiIcon icon="inbox" />
        </NuiButton>
        <NuiBadge tone="error" :count="3" floating data-testid="data-badge-floating" />
      </span>
    </div>
    <div class="data-row" data-testid="data-chips">
      <NuiChip>Дизайн</NuiChip>
      <NuiChip tone="primary" icon="check" removable>Фронтенд</NuiChip>
      <NuiChip tone="success" variant="solid" removable>Готово</NuiChip>
      <NuiChip size="sm">Аналитика</NuiChip>
      <NuiChip size="sm" tone="warning" variant="outline" removable>Ждёт</NuiChip>
    </div>
    <div class="data-row">
      <NuiAvatar
        :src="AVATAR_SRC"
        name="Анна Смирнова"
        status="online"
        data-testid="data-avatar-image"
      />
      <NuiAvatar src="/missing.png" name="Анна Смирнова" data-testid="data-avatar-broken" />
      <NuiAvatar shape="square" data-testid="data-avatar-icon" />
      <NuiAvatar name="Борис Ким" status="busy" size="lg">
        <template #badge><NuiBadge tone="error" :count="5" size="sm" /></template>
      </NuiAvatar>
      <NuiAvatar name="Вера Ли" status="away" status-label="Отошла" size="xl" shape="square" />
      <NuiAvatarGroup
        :items="team"
        :max="3"
        size="lg"
        label="Команда"
        data-testid="data-avatar-group"
      />
    </div>
    <div class="card-grid">
      <NuiCard href="#card" data-testid="data-card-link">
        <NuiCardMedia :src="COVER_SRC" alt="" aspect="3 / 1" />
        <NuiCardHeader>
          <NuiCardTitle>Тариф Team</NuiCardTitle>
          <NuiCardDescription>До 20 мест, SSO и аудит. Вся карточка — ссылка.</NuiCardDescription>
        </NuiCardHeader>
        <NuiCardFooter><NuiBadge tone="success">Доступен</NuiBadge></NuiCardFooter>
      </NuiCard>
      <NuiCard interactive variant="elevated" data-testid="data-card-button" @click="onCardClick">
        <NuiCardHeader>
          <NuiCardTitle>Проект Numior</NuiCardTitle>
          <NuiCardDescription>Карточка-кнопка с независимым действием в шапке.</NuiCardDescription>
          <template #actions>
            <NuiButton
              variant="ghost"
              tone="neutral"
              size="sm"
              aria-label="Ещё"
              data-testid="data-card-nested"
              @click="nestedClicks += 1"
            >
              <NuiIcon icon="ellipsis" />
            </NuiButton>
          </template>
        </NuiCardHeader>
        <NuiCardContent>Открытий: {{ cardClicks }}</NuiCardContent>
      </NuiCard>
      <NuiCard
        variant="soft"
        padding="sm"
        title="Тихая карточка"
        description="Без интерактива, с отступом sm"
        data-testid="data-card-soft"
      >
        <NuiCardContent>
          <NuiAvatarGroup :items="team.slice(0, 2)" size="sm" label="Участники" />
        </NuiCardContent>
      </NuiCard>
      <NuiCard
        padding="xs"
        title="Плотная карточка"
        description="С отступом xs"
        data-testid="data-card-dense"
      />
      <NuiCard :loading="cardLoading" href="#catalogue" data-testid="data-card-loading">
        <NuiCardMedia :src="COVER_SRC" alt="" aspect="3 / 1" />
        <NuiCardHeader>
          <NuiCardTitle>Каталог 2026</NuiCardTitle>
          <NuiCardDescription>Обновлён вчера</NuiCardDescription>
        </NuiCardHeader>
        <NuiCardContent :lines="2">Весенняя коллекция готова к публикации.</NuiCardContent>
        <NuiCardFooter>
          <NuiSwitch v-model="cardLoading" data-testid="data-card-loading-toggle">
            Загрузка
          </NuiSwitch>
        </NuiCardFooter>
      </NuiCard>
    </div>
    <div class="data-lists">
      <NuiList variant="divided" :items="linkItems" data-testid="data-list" />
      <NuiList
        v-model:values="picked"
        selectable="multiple"
        variant="outline"
        label="Языки"
        :items="languageItems"
        data-testid="data-list-select"
      />
      <NuiList
        v-model="channel"
        selectable="single"
        variant="outline"
        label="Канал"
        data-testid="data-list-single"
      >
        <NuiListItem value="email" label="Почта" description="Ежедневный дайджест" icon="inbox" />
        <NuiListItem value="push" label="Push" description="Мгновенно" />
        <NuiListItem value="none" label="Не присылать" />
      </NuiList>
      <div class="data-stack">
        <NuiButton
          variant="outline"
          tone="neutral"
          size="sm"
          data-testid="data-list-toggle"
          @click="listEmpty = !listEmpty"
        >
          {{ listEmpty ? 'Показать задачи' : 'Очистить задачи' }}
        </NuiButton>
        <NuiList
          :items="listEmpty ? [] : tasks"
          variant="outline"
          size="sm"
          empty-label="Задач нет"
          data-testid="data-list-tasks"
        />
      </div>
    </div>
    <NuiEmpty
      title="Пока пусто"
      description="Создайте первый проект, чтобы увидеть его здесь."
      data-testid="data-empty"
    >
      <template #actions>
        <NuiButton size="sm">Создать проект</NuiButton>
        <NuiButton size="sm" variant="ghost" tone="neutral">Импортировать</NuiButton>
      </template>
    </NuiEmpty>
    <pre class="output" data-testid="data-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiAvatar,
  NuiAvatarGroup,
  NuiBadge,
  NuiButton,
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardFooter,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
  NuiChip,
  NuiEmpty,
  NuiIcon,
  NuiList,
  NuiListItem,
  NuiSwitch,
  type NuiAvatarItem,
  type NuiListEntry,
  type NuiListSource,
} from '@numior/vue';

const AVATAR_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%234f46e5'/%3E%3Ccircle cx='32' cy='24' r='11' fill='%23fff'/%3E%3Cellipse cx='32' cy='54' rx='20' ry='14' fill='%23fff'/%3E%3C/svg%3E";

const COVER_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop offset='0' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='100' fill='url(%23g)'/%3E%3C/svg%3E";

const team: NuiAvatarItem[] = [
  { key: 'a', name: 'Анна Смирнова' },
  { key: 'b', name: 'Борис Ким' },
  { key: 'c', name: 'Вера Ли' },
  { key: 'd', name: 'Глеб Орлов' },
  { key: 'e', name: 'Дина Ахметова' },
];

const runs = ref(0);

const linkItems: NuiListSource<NuiListEntry<string>> = [
  {
    label: 'Ссылки',
    items: [
      { label: 'Документация', description: 'Руководства и API', href: '#docs', icon: 'file' },
      { label: 'Репозиторий', href: '#repo', icon: 'external-link' },
    ],
  },
  {
    label: 'Действия',
    items: [
      {
        label: 'Запустить проверку',
        description: 'Кнопка внутри списка',
        onClick: () => {
          runs.value += 1;
        },
      },
    ],
  },
];

const languageItems: NuiListEntry<string>[] = [
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'Ruby', value: 'ruby', disabled: true },
  { label: 'Котлин', value: 'kotlin' },
];

const tasks: NuiListEntry<string>[] = [
  { label: 'Проверить макеты', description: 'Сегодня' },
  { label: 'Ответить дизайнеру', description: 'Завтра' },
];

const picked = ref<string[]>([]);
const channel = ref<string>();
const cardClicks = ref(0);
const nestedClicks = ref(0);
const cardLoading = ref(true);
const listEmpty = ref(false);

const onCardClick = (): void => {
  cardClicks.value += 1;
};

const output = computed(() =>
  JSON.stringify(
    {
      picked: picked.value,
      channel: channel.value ?? null,
      cardClicks: cardClicks.value,
      nestedClicks: nestedClicks.value,
      runs: runs.value,
      listEmpty: listEmpty.value,
    },
    null,
    2,
  ),
);
</script>
