import React, { useEffect, useState } from 'react';
import type { NotchPayload } from '../../shared/types';

type Phase = 'idle' | 'expanding' | 'visible' | 'collapsing';

const NOTCH_W = 140;
const NOTCH_H = 30;
const PILL_W  = 320;
const PILL_H  = 54;

type AlertPayload = NotchPayload & { hasNotch?: boolean; notchHeight?: number };

// Map each alert type to its accent colour so the pill has a colour identity
const ACCENT: Record<string, string> = {
  'low-battery':      '#ef4444',
  'high-battery':     '#10b981',
  'self-low-battery': '#f59e0b',
  'charger-request':  '#6366f1',
};

export function NotchAlert() {
  const [payload, setPayload] = useState<AlertPayload | null>(null);
  const [phase,   setPhase]   = useState<Phase>('idle');

  useEffect(() => {
    const unsubAlert = window.electron.onNotchAlert((raw) => {
      const p = raw as AlertPayload;
      setPayload(p);
      setPhase('idle');
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPhase('expanding');
          setTimeout(() => setPhase('visible'), 420);
        })
      );
    });

    const unsubDismiss = window.electron.onNotchDismiss(() => {
      setPhase('collapsing');
    });

    return () => { unsubAlert(); unsubDismiss(); };
  }, []);

  if (!payload) return null;

  const hasNotch    = payload.hasNotch !== false;
  const notchHeight = payload.notchHeight ?? (hasNotch ? 37 : 0);
  const expanded    = phase === 'expanding' || phase === 'visible';
  const accent      = ACCENT[payload.type] ?? '#6366f1';

  const w = expanded ? PILL_W  : NOTCH_W;
  const h = expanded ? (PILL_H + notchHeight) : NOTCH_H;

  const borderRadius = hasNotch
    ? `0 0 ${expanded ? 24 : 12}px ${expanded ? 24 : 12}px`
    : `${expanded ? 20 : 12}px`;

  const wrapClass = 'notch-melt';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    }}>
      {/* Melt wrapper lives OUTSIDE overflow:hidden so shoulders are visible */}
      <div className={wrapClass} style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          background: '#000',
          borderRadius,
          width:  w,
          height: h,
          overflow: 'hidden',
          transition: [
            'width 420ms cubic-bezier(0.16,1,0.3,1)',
            'height 420ms cubic-bezier(0.16,1,0.3,1)',
            'border-radius 420ms cubic-bezier(0.16,1,0.3,1)',
          ].join(', '),
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: expanded ? 10 : 0,
          paddingLeft:   expanded ? 12 : 0,
          paddingRight:  expanded ? 12 : 0,
          paddingTop:    expanded ? notchHeight : 0,
          boxSizing: 'border-box',
          // Coloured glow below the pill matches the alert type
          boxShadow: expanded
            ? `0 6px 28px rgba(0,0,0,0.55), 0 0 0 0.5px ${accent}33`
            : 'none',
          position: 'relative',
        }}>
          {/* Thin accent bar at the very bottom edge */}
          {expanded && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: '15%',
              right: '15%',
              height: 2,
              borderRadius: '0 0 2px 2px',
              background: `linear-gradient(90deg, transparent, ${accent}aa, transparent)`,
              pointerEvents: 'none',
            }} />
          )}

          {/* Content fades in after pill finishes expanding */}
          <div style={{
            opacity:   phase === 'visible' ? 1 : 0,
            transform: phase === 'visible' ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 180ms ease, transform 180ms ease',
            width: '100%',
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 1,
          }}>
            <Content payload={payload} accent={accent} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Content({ payload, accent }: { payload: NotchPayload; accent: string }) {
  if (payload.type === 'low-battery') {
    return (
      <Row
        emoji={payload.emoji}
        accent={accent}
        title={payload.name}
        subtitle={`${payload.battery}% · critically low`}
        icon="🪫"
      />
    );
  }
  if (payload.type === 'high-battery') {
    return (
      <Row
        emoji={payload.emoji}
        accent={accent}
        title={payload.name}
        subtitle={`${payload.battery}% · fully charged`}
        icon="🔌"
      />
    );
  }
  if (payload.type === 'self-low-battery') {
    return (
      <Row
        emoji="🪫"
        accent={accent}
        title="Your battery is low"
        subtitle={`${payload.battery}% remaining`}
      />
    );
  }
  if (payload.type === 'charger-request') {
    return (
      <Row
        emoji={payload.from.emoji}
        accent={accent}
        title={payload.from.name}
        subtitle={`Needs the charger · ${payload.from.battery}%`}
        icon="🔋"
      />
    );
  }
  return null;
}

function Row({ emoji, accent, title, subtitle, icon }: {
  emoji: string;
  accent: string;
  title: string;
  subtitle: string;
  icon?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%' }}>
      {/* Avatar with coloured glow */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: `${accent}22`,
        border: `1.5px solid ${accent}55`,
        boxShadow: `0 0 10px ${accent}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        flexShrink: 0,
      }}>
        {emoji}
      </div>

      {/* Text */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.62)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginTop: 2,
          lineHeight: 1.3,
        }}>
          {icon && <span style={{ marginRight: 3 }}>{icon}</span>}
          {subtitle}
        </div>
      </div>
    </div>
  );
}
