import { describe, expect, it } from 'vitest';
import { AvatarUploadDriver } from './drivers/avatar-upload';
import { fileOf } from './drivers/upload';

const image = (name: string, size = 3): File => fileOf(name, size, 'image/png');

describe('NuiAvatarUpload', () => {
  it('shows initials, previews the chosen image while it uploads and keeps the result', async () => {
    const avatar = AvatarUploadDriver.mount({ props: { name: 'Ann Smith' } });

    expect(avatar.initials).toBe('AS');
    expect(avatar.triggerName).toBe('Choose an image');
    await avatar.choose(image('me.png'));
    expect(avatar.imageSrc).toBe('blob:mock-1');
    expect(avatar.item?.status).toBe('uploading');
    expect(avatar.triggerName).toBe('Change the image');
    await avatar.report(0.5);
    expect(avatar.progressValue).toBe('50');
    await avatar.resolveLast('https://cdn.example/me.png');
    expect(avatar.item?.status).toBe('done');
    expect(avatar.events).toEqual(['done:me.png']);
    expect(avatar.actionLabels).toEqual(['Remove the image']);
    await avatar.clickAction('Remove the image');
    expect(avatar.item).toBeNull();
    expect(avatar.initials).toBe('AS');
    expect(avatar.urls.revoked).toEqual(['blob:mock-1']);
    avatar.unmount();
  });

  it('keeps the current image when a replacement is rejected and reports the reason', async () => {
    const avatar = AvatarUploadDriver.mount({
      props: { maxSize: 10 },
      modelValue: {
        id: 'current',
        name: 'old.png',
        size: 4,
        type: 'image/png',
        status: 'done',
        url: 'https://cdn.example/old.png',
      },
    });

    expect(avatar.imageSrc).toBe('https://cdn.example/old.png');
    await avatar.choose(image('huge.png', 64));
    expect(avatar.item?.name).toBe('old.png');
    expect(avatar.status).toBe('Larger than 10 byte');
    expect(avatar.events).toEqual(['reject:size']);
    await avatar.choose(fileOf('notes.txt'));
    expect(avatar.events).toEqual(['reject:size', 'reject:type']);
    avatar.unmount();
  });

  it('offers a retry after an adapter failure and accepts a dropped file', async () => {
    const avatar = AvatarUploadDriver.mount();

    await avatar.dragEnter();
    expect(avatar.hasModifier('dragging')).toBe(true);
    await avatar.drop(image('drop.png'));
    expect(avatar.hasModifier('dragging')).toBe(false);
    expect(avatar.item?.status).toBe('uploading');
    await avatar.rejectLast();
    expect(avatar.item?.status).toBe('error');
    expect(avatar.status).toBe('boom');
    expect(avatar.actionLabels).toEqual(['Retry', 'Remove the image']);
    await avatar.clickAction('Retry');
    expect(avatar.calls).toHaveLength(2);
    await avatar.resolveLast('ok');
    expect(avatar.item?.status).toBe('done');
    avatar.unmount();
  });

  it('neither picks nor accepts files while disabled or readonly', async () => {
    for (const props of [{ disabled: true }, { readonly: true }]) {
      const avatar = AvatarUploadDriver.mount({ props });

      expect(avatar.trigger.element.disabled).toBe(true);
      await avatar.drop(image('drop.png'));
      expect(avatar.item).toBeNull();
      avatar.unmount();
    }
  });
});
