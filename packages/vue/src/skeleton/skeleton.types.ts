export type NuiSkeletonShape = (typeof NuiSkeletonShape)[keyof typeof NuiSkeletonShape];

export interface NuiSkeletonProps {
  shape?: NuiSkeletonShape | undefined;
  width?: string | undefined;
  height?: string | undefined;
  lines?: number | undefined;
  animated?: boolean | undefined;
}

export const NuiSkeletonShape = { Text: 'text', Rect: 'rect', Circle: 'circle' } as const;
