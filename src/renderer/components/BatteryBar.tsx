import React from 'react';

interface Props {
  percent: number;
  isCharging: boolean;
}

function fillColor(percent: number, isCharging: boolean): string {
  if (isCharging) return 'var(--charging)';
  if (percent < 10) return 'var(--critical)';
  if (percent < 20) return 'var(--warn)';
  return 'var(--text)';
}

export function BatteryBar({ percent, isCharging }: Props) {
  const color = fillColor(percent, isCharging);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 80,
          height: 4,
          borderRadius: 2,
          background: 'var(--bar-track)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 2,
            background: color,
            transition: 'width 400ms ease-out, background 200ms ease-out',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'SF Mono, ui-monospace, Menlo, monospace',
          fontSize: 13,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          color,
          minWidth: 36,
          textAlign: 'right' as const,
          transition: 'color 200ms ease-out',
        }}
      >
        {percent}%
      </span>
    </div>
  );
}
