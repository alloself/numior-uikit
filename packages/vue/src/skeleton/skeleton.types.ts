export type NuiSkeletonShape = 'text' | 'rect' | 'circle';

export interface NuiSkeletonProps {
  shape?: NuiSkeletonShape | undefined;
  width?: string | undefined;
  height?: string | undefined;
  lines?: number | undefined;
  animated?: boolean | undefined;
}
