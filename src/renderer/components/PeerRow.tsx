import React, { useState } from 'react';
import { BatteryBar } from './BatteryBar';
import type { PeerState } from '../../shared/types';

interface Props {
  peer: PeerState;
  isSelf: boolean;
  onRequestCharger?: () => void;
}

const PASTEL_VARS = [
  'var(--pastel-0)', 'var(--pastel-1)', 'var(--pastel-2)', 'var(--pastel-3)',
  'var(--pastel-4)', 'var(--pastel-5)', 'var(--pastel-6)', 'var(--pastel-7)',
];

function getPastel(peerId: string): string {
  return PASTEL_VARS[peerId.charCodeAt(0) % 8];
}

function formatLastSeen(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function PeerRow({ peer, isSelf, onRequestCharger }: Props) {
  const [hovered, setHovered] = useState(false);
  const isAway = peer.status === 'away';
  const isHidden = peer.isVisible === false;
  const pastel = getPastel(peer.peerId);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px 0 16px',
        height: 'var(--row-height)',
        borderRadius: 8,
        background: hovered && !isAway && !isHidden ? 'var(--hover)' : 'transparent',
        opacity: isAway ? 0.45 : isHidden ? 0.55 : 1,
        transition: 'background 120ms ease-out, opacity 200ms ease-out',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-sm)',
        background: pastel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
        outline: isSelf ? '1.5px solid var(--text)' : 'none',
        outlineOffset: 1,
      }}>
        {peer.emoji}
      </div>

      {/* Name */}
      <span style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text)',
        letterSpacing: '-0.01em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {peer.displayName}
        {isSelf && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4, fontSize: 11 }}>you</span>
        )}
      </span>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {isHidden ? (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            🔒 not sharing
          </span>
        ) : isAway ? (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            away · {formatLastSeen(peer.lastSeenAt)}
          </span>
        ) : (
          <>
            {peer.isCharging && <span style={{ fontSize: 13 }}>🔌</span>}
            {!peer.isCharging && peer.battery < 15 && <span style={{ fontSize: 13 }}>🪫</span>}
            <BatteryBar percent={peer.battery} isCharging={peer.isCharging} />
            {!isSelf && peer.isCharging && onRequestCharger && hovered && (
              <button
                onClick={onRequestCharger}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#fff',
                  background: 'var(--charging)',
                  padding: '3px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  marginLeft: 2,
                }}
              >
                Ask
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
