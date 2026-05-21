import React, { useEffect, useState } from 'react';
import { Toggle } from '../components/Toggle';
import { EmojiPicker } from '../components/EmojiPicker';
import type { UserPrefs } from '../../shared/types';

const GITHUB_URL = 'https://github.com/mdsaban/lastpercent';

export function Settings() {
  const [prefs, setPrefsLocal] = useState<UserPrefs | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electron.getPrefs().then((p) => {
      setPrefsLocal(p);
      setNameInput(p.displayName);
    });
  }, []);

  if (!prefs) return <div style={{ padding: 24, color: 'var(--text)', fontSize: 13 }}>Loading…</div>;

  const save = (partial: Partial<UserPrefs>) => {
    const updated = { ...prefs, ...partial };
    setPrefsLocal(updated);
    window.electron.setPrefs(partial);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleNameBlur = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== prefs.displayName) save({ displayName: trimmed });
  };

  return (
    <div style={pageStyle}>
      <Section title="Identity">
        <Row label="Avatar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer', border: '1px solid var(--border)' }}
                title="Change emoji"
              >
                {prefs.emoji}
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {showEmojiPicker ? 'Pick one' : 'Click to change'}
              </span>
            </div>
            {showEmojiPicker && (
              <EmojiPicker
                selected={prefs.emoji}
                onSelect={(emoji) => { save({ emoji }); setShowEmojiPicker(false); }}
              />
            )}
          </div>
        </Row>

        <Row label="Display name">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
            maxLength={32}
            placeholder="Your name"
            style={inputStyle}
          />
        </Row>
      </Section>

      <Section title="Network">
        <Row
          label="Visible to others"
          description="When off, peers see you as 'not sharing' and you won't see them"
        >
          <Toggle checked={prefs.isVisible} onChange={(v) => save({ isVisible: v })} />
        </Row>
      </Section>

      <Section title="Notifications">
        <Row label="Enable notifications" description="Notch alerts and system banners for battery events">
          <Toggle
            checked={prefs.notifications.enabled}
            onChange={(v) => save({ notifications: { ...prefs.notifications, enabled: v } })}
          />
        </Row>
        <div style={{ opacity: prefs.notifications.enabled ? 1 : 0.35, pointerEvents: prefs.notifications.enabled ? 'auto' : 'none', transition: 'opacity 150ms ease' }}>
          <Row label="Low battery alert" description={`Alert when someone drops below ${prefs.notifications.lowBatteryThreshold}%`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min={5}
                max={25}
                step={5}
                value={prefs.notifications.lowBatteryThreshold}
                onChange={(e) => save({ notifications: { ...prefs.notifications, lowBatteryThreshold: Number(e.target.value) } })}
                style={{ width: 80, accentColor: 'var(--critical)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 28 }}>
                {prefs.notifications.lowBatteryThreshold}%
              </span>
            </div>
          </Row>
          <Row label="High battery alert" description={`Alert when someone charges above ${prefs.notifications.highBatteryThreshold}%`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min={70}
                max={95}
                step={5}
                value={prefs.notifications.highBatteryThreshold}
                onChange={(e) => save({ notifications: { ...prefs.notifications, highBatteryThreshold: Number(e.target.value) } })}
                style={{ width: 80, accentColor: 'var(--charging)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 28 }}>
                {prefs.notifications.highBatteryThreshold}%
              </span>
            </div>
          </Row>
        </div>
      </Section>

      <Section title="System">
        <Row label="Launch at login">
          <Toggle checked={prefs.launchAtLogin} onChange={(v) => save({ launchAtLogin: v })} />
        </Row>
      </Section>

      <Section title="About">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>LastPercent 0.1.0</span>
          <span>·</span>
          <span>MIT License</span>
          <span>·</span>
          <button
            onClick={() => window.electron.openExternal(GITHUB_URL)}
            style={{ color: 'var(--charging)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 12, padding: 0 }}
          >
            GitHub ↗
          </button>
        </div>
      </Section>

      {saved && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16,
          background: 'var(--charging)', color: 'white',
          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
        }}>
          Saved
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: '80px 24px 24px',
  background: 'var(--surface)',
  minHeight: '100vh',
  color: 'var(--text)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  WebkitFontSmoothing: 'antialiased',
  userSelect: 'none',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 220,
  padding: '6px 10px',
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
};
