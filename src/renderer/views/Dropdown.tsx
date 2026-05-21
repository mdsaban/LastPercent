import React, { useEffect, useState } from 'react';
import { PeerRow } from '../components/PeerRow';
import { usePeers } from '../hooks/usePeers';
import type { AppState, UpdateStatus } from '../../shared/types';

export function Dropdown() {
  const state = usePeers();
  const [showMulticastHint, setShowMulticastHint] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    const unsub = window.electron.onUpdateState((s) => setUpdateState(s));
    return unsub;
  }, []);

  // show multicast hint if no peers appear within 60s
  useEffect(() => {
    if ((state?.peers.length ?? 0) > 0) {
      setShowMulticastHint(false);
      return;
    }
    const timer = setTimeout(() => setShowMulticastHint(true), 60_000);
    return () => clearTimeout(timer);
  }, [state?.peers.length]);

  if (!state) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading…
        </div>
      </div>
    );
  }

  if (state.self?.isVisible === false) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            LastPercent
          </span>
          <button
            onClick={() => window.electron.openSettings()}
            style={{ fontSize: 19, color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}
            title="Settings"
          >
            ⚙
          </button>
        </div>
        <Divider />
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--hover)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 18, margin: '0 auto 10px',
          }}>
            🔒
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            You're hidden
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
            Others see you as "not sharing".<br />Go visible to share your battery and see your team.
          </div>
          <button
            onClick={() => window.electron.setPrefs({ isVisible: true })}
            style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--bg)', background: 'var(--text)',
              padding: '6px 18px', borderRadius: 8,
              cursor: 'pointer', border: 'none',
            }}
          >
            Go visible
          </button>
        </div>
        <Divider />
        <div style={footerStyle}>
          <span style={{ color: 'var(--text-muted)' }}>not sharing · tap to rejoin</span>
        </div>
      </div>
    );
  }

  const rows = [
    ...(state.self ? [state.self] : []),
    ...state.peers.sort((a, b) => {
      if (a.status === 'away' && b.status !== 'away') return 1;
      if (a.status !== 'away' && b.status === 'away') return -1;
      return a.displayName.localeCompare(b.displayName);
    }),
  ];

  return (
    <div style={containerStyle}>
      {updateState?.status === 'ready' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--charging)',
          borderRadius: '12px 12px 0 0',
          gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>
            Update ready — v{updateState.version}
          </span>
          <button
            onClick={() => window.electron.installUpdate()}
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--charging)',
              background: '#fff', padding: '3px 10px',
              borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Restart & Install
          </button>
        </div>
      )}
      {updateState?.status === 'downloading' && (
        <div style={{
          padding: '6px 12px',
          background: 'var(--hover)',
          borderRadius: '12px 12px 0 0',
          fontSize: 12, color: 'var(--text-muted)',
        }}>
          Downloading update… {updateState.percent}%
        </div>
      )}
      <div style={headerStyle}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          LastPercent
        </span>
        <button
          onClick={() => window.electron.openSettings()}
          style={{ fontSize: 19, color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      <Divider />

      <div style={{ padding: '6px 4px' }}>
        {rows.length === 0 ? (
          <EmptyState status={state.status} showHint={showMulticastHint} />
        ) : (
          rows.map(peer => (
            <PeerRow
              key={peer.peerId}
              peer={peer}
              isSelf={!!peer.isSelf}
              onRequestCharger={
                !peer.isSelf && peer.isCharging
                  ? () => window.electron.requestCharger(peer.peerId)
                  : undefined
              }
            />
          ))
        )}
      </div>

      <Divider />

      <div style={footerStyle}>
        <span>
          {state.peers.length > 0
            ? `${state.peers.length} nearby${state.networkName ? ` · ${state.networkName}` : ''}`
            : (state.networkName ?? 'no one nearby')}
        </span>
        {state.status === 'discovering' && (
          <span style={{ color: 'var(--text-muted)' }}>looking…</span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ status, showHint }: { status: AppState['status']; showHint: boolean }) {
  return (
    <div style={{ padding: '20px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.35 }}>⌖</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {status === 'discovering' ? 'Looking for nearby Macs…' : 'No one else nearby.'}
        {status === 'no-peers' && (
          <div style={{ marginTop: 4, fontSize: 11 }}>Make sure teammates are on the same Wi-Fi.</div>
        )}
      </div>
      {showHint && (
        <div style={{
          marginTop: 12,
          padding: '8px 10px',
          background: 'var(--hover)',
          borderRadius: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          textAlign: 'left',
        }}>
          <strong style={{ color: 'var(--text)' }}>Tip:</strong> Some Wi-Fi networks block multicast.
          Try a hotspot or check with your IT team if teammates aren't showing up.
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />;
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100%',
  background: 'var(--bg)',
  borderRadius: 'var(--radius-lg)',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '0.5px solid var(--border)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px 0 16px',
  height: 40,
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  height: 32,
  fontSize: 11,
  color: 'var(--text-muted)',
};
