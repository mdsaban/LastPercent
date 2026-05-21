import Store from 'electron-store';
import { randomUUID } from 'crypto';
import * as os from 'os';

interface Config {
  peerId: string;
  displayName: string;
  emoji: string;
  isVisible: boolean;
  launchAtLogin: boolean;
  hasCompletedOnboarding: boolean;
  notifications: {
    enabled: boolean;
    lowBatteryThreshold: number;
    highBatteryThreshold: number;
  };
  appVersion: string;
}

const EMOJI_DEFAULTS = ['⚡️', '🐙', '🦊', '🌵', '🐢', '🦋', '🌻', '🎸', '🎯', '🍀'];

export class PersistenceService {
  private store: Store<Config>;

  constructor() {
    this.store = new Store<Config>({
      name: 'config',
      defaults: {
        peerId: randomUUID(),
        displayName: [os.userInfo().username, process.env.USER].find(n => n && n !== '<redacted>') ?? 'Teammate',
        emoji: EMOJI_DEFAULTS[Math.floor(Math.random() * EMOJI_DEFAULTS.length)],
        isVisible: true,
        launchAtLogin: false,
        hasCompletedOnboarding: false,
        notifications: {
          enabled: true,
          lowBatteryThreshold: 15,
          highBatteryThreshold: 85,
        },
        appVersion: '0.1.0',
      },
    });
  }

  get<K extends keyof Config>(key: K): Config[K] {
    return this.store.get(key);
  }

  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.store.set(key, value);
  }

  getAll(): Config {
    return this.store.store;
  }
}

export const persistence = new PersistenceService();
