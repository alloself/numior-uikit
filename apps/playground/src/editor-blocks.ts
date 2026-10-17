import { extendContentSchema } from '@numior/content';
import { insertLeaf, renderTag } from '@numior/editor-core';
import { defineBlock } from '@numior/editor-vue';
import { taskStatusLabel, taskStatusOf } from './task-status';
import TaskStatusBlock from './TaskStatusBlock.vue';

export const playgroundSchema = extendContentSchema({
  task_status: {
    group: 'block',
    attrs: { status: { default: 'todo', verify: (value) => taskStatusOf(value) === value } },
    render: (node) =>
      renderTag('div', { class: `task-status task-status--${taskStatusOf(node.attrs.status)}` }, [
        `Статус задачи: ${taskStatusLabel(node.attrs.status)}`,
      ]),
    parse: [
      {
        tag: 'div',
        priority: 1,
        attrs: (element) =>
          element.hasClass('task-status')
            ? { status: taskStatusOf(element.classWith('task-status--')) }
            : false,
      },
    ],
  },
});

export const taskStatusBlock = defineBlock({
  name: 'task_status',
  view: TaskStatusBlock,
  slash: () => [
    {
      key: 'task_status',
      label: 'Статус задачи',
      icon: 'list-todo',
      keywords: ['status', 'task', 'статус'],
      kind: 'command',
      command: insertLeaf('task_status'),
    },
  ],
});
