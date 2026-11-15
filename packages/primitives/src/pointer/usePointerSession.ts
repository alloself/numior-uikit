import { defaultWindow, tryOnMounted, tryOnScopeDispose } from '@vueuse/core';
import type {
  PointerHandler,
  PointerSession,
  PointerSessionHandlers,
  PointerSessionOptions,
} from './pointer.types';

interface Route {
  handlers: PointerSessionHandlers;
}

type Pick = (handlers: PointerSessionHandlers) => PointerHandler | undefined;

const IDLE: PointerSessionHandlers = Object.freeze({});

const bubbling = new Set<Route>();

const capturing = new Set<Route>();

const hosts = new WeakSet<Window>();

const downOf: Pick = (handlers) => handlers.down;

const moveOf: Pick = (handlers) => handlers.move;

const upOf: Pick = (handlers) => handlers.up;

const cancelOf: Pick = (handlers) => handlers.cancel;

const relay =
  (routes: ReadonlySet<Route>, pick: Pick): PointerHandler =>
  (event) => {
    if (routes.size === 0) {
      return;
    }

    for (const route of Array.from(routes)) {
      if (!routes.has(route)) {
        continue;
      }

      pick(route.handlers)?.(event);
    }
  };

const install = (): boolean => {
  const host = defaultWindow;

  if (host === undefined) {
    return false;
  }
  if (hosts.has(host)) {
    return true;
  }

  hosts.add(host);
  host.addEventListener('pointerdown', relay(capturing, downOf), true);
  host.addEventListener('pointermove', relay(capturing, moveOf), true);
  host.addEventListener('pointerup', relay(capturing, upOf), true);
  host.addEventListener('pointercancel', relay(capturing, cancelOf), true);
  host.addEventListener('pointerdown', relay(bubbling, downOf));
  host.addEventListener('pointermove', relay(bubbling, moveOf));
  host.addEventListener('pointerup', relay(bubbling, upOf));
  host.addEventListener('pointercancel', relay(bubbling, cancelOf));
  return true;
};

export const usePointerSession = (options: PointerSessionOptions = {}): PointerSession => {
  const routes = options.capture === true ? capturing : bubbling;
  const route: Route = { handlers: IDLE };

  const end = (): void => {
    routes.delete(route);
    route.handlers = IDLE;
  };

  const begin = (handlers: PointerSessionHandlers): void => {
    if (!install()) {
      return;
    }

    route.handlers = handlers;
    routes.add(route);
  };

  tryOnMounted(install);
  tryOnScopeDispose(end);

  return { begin, end };
};
