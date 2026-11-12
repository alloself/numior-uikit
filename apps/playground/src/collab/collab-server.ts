const DEFAULT_PORT = '4175';

const PORT_META = 'meta[name="nui-collab-port"]';

export const collabServerOf = (params: URLSearchParams): string => {
  const port = document.querySelector(PORT_META)?.getAttribute('content') ?? DEFAULT_PORT;

  return params.get('server') ?? `ws://${location.hostname}:${port}`;
};
