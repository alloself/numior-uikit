<template>
  <section class="panel" aria-labelledby="upload-title">
    <div class="section-heading">
      <h2 id="upload-title">Загрузка файлов</h2>
      <span class="tag">NuiUpload</span>
    </div>
    <div class="form">
      <NuiField label="Документы" description="PDF и текст до 1 МБ, не больше трёх файлов">
        <NuiUpload
          v-model="documents"
          :upload="fakeUpload"
          accept=".pdf,.txt,text/plain,application/pdf"
          :max-size="1024 * 1024"
          :max-files="3"
          :rejected="rejectedMode"
          description="PDF или TXT, до 1 МБ"
          data-testid="upload-documents"
          @reject="onReject"
        />
      </NuiField>
      <NuiField label="Галерея" description="Изображения сеткой с миниатюрами">
        <NuiUpload
          v-model="images"
          :upload="fakeUpload"
          layout="grid"
          accept="image/*"
          :concurrency="2"
          drop-label="Перетащите изображения"
          browse-label="Выбрать изображения"
          data-testid="upload-images"
        />
      </NuiField>
      <div class="upload-controls">
        <label class="loading-toggle"
          ><input v-model="failNext" type="checkbox" data-testid="upload-fail-toggle" /> Следующая
          загрузка падает</label
        >
        <label class="loading-toggle"
          ><input v-model="dropRejected" type="checkbox" data-testid="upload-drop-toggle" /> Не
          показывать отклонённые</label
        >
      </div>
    </div>
    <pre class="output" data-testid="upload-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiField, NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const STEPS = 5;
const STEP_DELAY = 120;

const documents = ref<NuiUploadItem<string>[]>([
  {
    id: 'existing-brief',
    name: 'brief.pdf',
    size: 348_160,
    type: 'application/pdf',
    status: 'done',
    url: '#brief',
  },
]);

const images = ref<NuiUploadItem<string>[]>([]);
const failNext = ref(false);
const dropRejected = ref(false);
const rejections = ref<string[]>([]);
const rejectedMode = computed(() => (dropRejected.value ? 'drop' : 'list'));

const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      },
      { once: true },
    );
  });

const fakeUpload: NuiUploadAdapter<string> = async (file, { onProgress, signal }) => {
  const shouldFail = failNext.value || file.name.includes('fail');

  failNext.value = false;

  for (let step = 1; step <= STEPS; step += 1) {
    await wait(STEP_DELAY, signal);
    onProgress(step / STEPS);
  }

  if (shouldFail) {
    throw new Error('Сервер не принял файл');
  }

  return `https://files.example/${encodeURIComponent(file.name)}`;
};

const progressOf = (item: NuiUploadItem<string>): number => {
  if (item.status === 'uploading') {
    return item.progress;
  }
  return item.status === 'done' ? 1 : 0;
};

const resultOf = (item: NuiUploadItem<string>): string | null =>
  item.status === 'done' ? (item.result ?? null) : null;

const reasonOf = (item: NuiUploadItem<string>): string | null =>
  item.status === 'error' ? item.error.reason : null;

const onReject = (entries: readonly { file: File }[]): void => {
  rejections.value = [...rejections.value, ...entries.map((entry) => entry.file.name)];
};

const output = computed(() =>
  JSON.stringify(
    {
      documents: documents.value.map((item) => ({
        name: item.name,
        status: item.status,
        progress: progressOf(item),
        result: resultOf(item),
        error: reasonOf(item),
      })),
      images: images.value.map((item) => ({ name: item.name, status: item.status })),
      rejections: rejections.value,
    },
    null,
    2,
  ),
);
</script>
