import type { NodeId } from '../model/node.types';
import { createMetaKey, definePlugin } from '../state/plugin';
import type { Command, EditorState, Plugin } from '../state/state.types';
import type { BlockSpot, BlockSpotState, PeerSpot } from './spots.types';

const spotUpdate = createMetaKey<BlockSpotState>('blockSpot');

const registry = new WeakMap<object, Plugin<BlockSpotState>>();

const AWAY: BlockSpotState = { spot: undefined };

const NO_SPOTS: readonly PeerSpot[] = [];

const sameSpot = (left: BlockSpot | undefined, right: BlockSpot | undefined): boolean =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    left.block === right.block &&
    left.part.length === right.part.length &&
    left.part.every((piece, index) => piece === right.part[index]));

const spotPlugin = (state: EditorState): Plugin<BlockSpotState> | undefined =>
  state.plugins.reduce<Plugin<BlockSpotState> | undefined>(
    (found, plugin) => found ?? registry.get(plugin),
    undefined,
  );

export const blockSpots = (): Plugin<BlockSpotState> => {
  const plugin = definePlugin<BlockSpotState>({
    name: 'blockSpots',
    state: {
      init: () => AWAY,
      apply: (tr, value) => spotUpdate.read(tr) ?? value,
    },
  });

  registry.set(plugin, plugin);
  return plugin;
};

export const blockSpotOf = (state: EditorState): BlockSpot | undefined =>
  spotPlugin(state)?.getState(state)?.spot;

export const setBlockSpot =
  (spot: BlockSpot): Command =>
  (state, dispatch) => {
    if (spotPlugin(state) === undefined || sameSpot(blockSpotOf(state), spot)) {
      return false;
    }

    dispatch?.(state.tr.setMeta(spotUpdate, { spot }));
    return true;
  };

export const leaveBlockSpot =
  (block: NodeId): Command =>
  (state, dispatch) => {
    if (blockSpotOf(state)?.block !== block) {
      return false;
    }

    dispatch?.(state.tr.setMeta(spotUpdate, AWAY));
    return true;
  };

export const peerSpotsOf = (state: EditorState): readonly PeerSpot[] =>
  state.plugins.reduce<readonly PeerSpot[]>((found, plugin) => {
    const spots = plugin.props.spots?.(state);

    if (spots === undefined || spots.length === 0) {
      return found;
    }
    return found.length === 0 ? spots : found.concat(spots);
  }, NO_SPOTS);
