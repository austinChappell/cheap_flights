interface RangeOptions {
  excludeUpperBoundary?: boolean;
  step?: number;
}

export const range = (start: number, stop: number, options?: RangeOptions): number[] => {
  const step = options?.step ?? 1;
  const excludeUpperBoundary = options?.excludeUpperBoundary ?? false;

  return Array(Math.ceil(((stop + (excludeUpperBoundary ? 0 : 1)) - start) / step))
    .fill(start)
    .map((x, y) => x + y * step);
};
