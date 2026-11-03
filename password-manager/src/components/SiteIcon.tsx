import { useState } from 'react';
import { hostOf } from '../lib/format';
import { useSettings } from '../state/settings';
import { cx } from './ui';

const PALETTE = ['#0e7490', '#1d4ed8', '#7c3aed', '#be185d', '#b45309', '#047857', '#4338ca', '#0f766e'];

function colorFor(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Значок сайта (через DuckDuckGo, без передачи логинов) или буква-заглушка. */
export function SiteIcon({ service, url, size = 40 }: { service: string; url: string; size?: number }) {
  const { favicons } = useSettings();
  const host = hostOf(url);
  const [failed, setFailed] = useState<string | null>(null);
  const letter = (service.trim()[0] ?? '?').toUpperCase();
  const showImg = favicons && host && failed !== host;
  return (
    <span
      className={cx('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-semibold text-white')}
      style={{ width: size, height: size, background: showImg ? 'var(--raised)' : colorFor(service), fontSize: size * 0.42 }}
      aria-hidden
    >
      {showImg ? (
        <img
          src={`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          width={size * 0.6}
          height={size * 0.6}
          onError={() => setFailed(host)}
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      ) : (
        letter
      )}
    </span>
  );
}
