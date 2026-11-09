import { createRankService } from './rank-service';

const service = createRankService(
  (answer) => {
    self.postMessage(answer, { transfer: [answer.order.buffer] });
  },
  (run) => {
    setTimeout(run, 0);
  },
);

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  service.receive(event.data);
});
