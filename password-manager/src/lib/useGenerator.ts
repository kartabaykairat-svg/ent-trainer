import { useCallback, useState } from 'react';
import { DEFAULT_GENERATOR, type GeneratorOptions } from './generator';

const KEY = 'pm-generator';

function load(): GeneratorOptions {
  try {
    return { ...DEFAULT_GENERATOR, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULT_GENERATOR;
  }
}

export function loadGeneratorOptions() {
  return load();
}

/** Настройки генератора (не секретные) запоминаются между сессиями. */
export function useGeneratorOptions() {
  const [opts, setOpts] = useState<GeneratorOptions>(load);
  const update = useCallback((patch: Partial<GeneratorOptions>) => {
    setOpts((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return [opts, update] as const;
}
