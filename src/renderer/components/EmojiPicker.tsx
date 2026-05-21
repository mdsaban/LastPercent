import React from 'react';

const EMOJI_OPTIONS = [
  '⚡️', '🐙', '🦊', '🌵', '🐢', '🦋', '🌻', '🎸',
  '🎯', '🍀', '🦁', '🐻', '🦅', '🌊', '🔥', '💎',
  '🚀', '🎨', '🌈', '🦄', '🐬', '🌮', '🎲', '🧲',
];

interface Props {
  selected: string;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ selected, onSelect }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 4,
        padding: '10px',
        background: 'var(--surface)',
        borderRadius: 10,
        border: '1px solid var(--border)',
      }}
    >
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          style={{
            width: 36,
            height: 36,
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            background: selected === emoji ? 'var(--hover)' : 'transparent',
            outline: selected === emoji ? '2px solid var(--charging)' : 'none',
            outlineOffset: -1,
            transition: 'background 120ms ease-out',
            cursor: 'pointer',
          }}
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
