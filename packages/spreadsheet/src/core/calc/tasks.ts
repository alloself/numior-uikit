export const nextTask = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof MessageChannel === 'undefined') {
      setTimeout(resolve, 0);
      return;
    }
    const channel = new MessageChannel();

    channel.port1.addEventListener(
      'message',
      () => {
        channel.port1.close();
        resolve();
      },
      { once: true },
    );

    channel.port1.start();
    channel.port2.postMessage(null);
  });
