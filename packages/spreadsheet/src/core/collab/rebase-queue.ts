import type { WorkbookStep } from '../steps/step.types';
import type { RemoteChange } from './collab.types';
import { rebaseStep } from './rebase-step';
import { changeOver } from './remote-change';

export const stepOver = (
  step: WorkbookStep,
  changes: readonly RemoteChange[],
): WorkbookStep | undefined =>
  changes.reduce<WorkbookStep | undefined>(
    (current, change) => (current === undefined ? undefined : rebaseStep(current, change)),
    step,
  );

export const changesOver = (
  changes: readonly RemoteChange[],
  local: readonly RemoteChange[],
): readonly RemoteChange[] =>
  local.reduce<readonly RemoteChange[]>(
    (moving, own) =>
      moving.reduce<RemoteChange[]>((kept, change) => {
        const moved = changeOver(change, own);

        if (moved !== undefined) {
          kept.push(moved);
        }
        return kept;
      }, []),
    changes,
  );
