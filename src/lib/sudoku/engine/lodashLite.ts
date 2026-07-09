// Minimal re-implementations of the handful of lodash-es helpers the ported
// super-sudoku code relies on. Kept local instead of adding lodash-es as a
// dependency since each of these is a few lines.

export function groupBy<T>(array: T[], fn: (item: T) => string | number): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of array) {
    const key = String(fn(item));
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

export function sortBy<T>(array: T[], fn: (item: T) => string | number): T[] {
  return [...array].sort((a, b) => {
    const ka = fn(a);
    const kb = fn(b);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  });
}

export function uniq<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function uniqBy<T>(array: T[], fn: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  const result: T[] = [];
  for (const item of array) {
    const key = fn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

export function flatten<T>(array: T[][]): T[] {
  return array.flat();
}

export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): (...args: Args) => void {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const invoke = () => {
    lastCall = Date.now();
    timeout = null;
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return (...args: Args) => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    lastArgs = args;
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      invoke();
    } else if (!timeout) {
      timeout = setTimeout(invoke, remaining);
    }
  };
}
