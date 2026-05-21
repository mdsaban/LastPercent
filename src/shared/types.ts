export interface PeerState {
  peerId: string;
  displayName: string;
  emoji: string;
  battery: number;
  isCharging: boolean;
  isPluggedIn: boolean;
  isVisible: boolean;
  status: 'available' | 'away' | 'dnd';
  lastSeenAt: number;
  lastUpdatedAt: number;
  appVersion: string;
  isSelf?: boolean;
}

export type AppStatus = 'discovering' | 'connected' | 'no-peers' | 'offline';

export interface AppState {
  self: PeerState | null;
  peers: PeerState[];
  networkName: string | null;
  status: AppStatus;
}

export interface UserPrefs {
  displayName: string;
  emoji: string;
  isVisible: boolean;
  launchAtLogin: boolean;
  notifications: {
    enabled: boolean;
    lowBatteryThreshold: number;
    highBatteryThreshold: number;
  };
}

export type AppAlert =
  | { type: 'low-battery'; peer: PeerState }
  | { type: 'high-battery'; peer: PeerState }
  | { type: 'self-low-battery'; battery: number }
  | { type: 'charger-request'; from: { peerId: string; displayName: string; emoji: string; battery: number } };

export type NotchPayload =
  | { type: 'low-battery'; emoji: string; name: string; battery: number }
  | { type: 'high-battery'; emoji: string; name: string; battery: number }
  | { type: 'self-low-battery'; battery: number }
  | { type: 'charger-request'; from: { emoji: string; name: string; battery: number } };

export type UpdateStatus =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready'; version: string }
  | { status: 'error'; message: string };

export interface ElectronAPI {
  getState: () => Promise<AppState>;
  getPrefs: () => Promise<UserPrefs>;
  setPrefs: (prefs: Partial<UserPrefs>) => Promise<void>;
  onStateUpdate: (callback: (state: AppState) => void) => () => void;
  onAlert: (callback: (alert: AppAlert) => void) => () => void;
  onNotchAlert: (callback: (payload: NotchPayload) => void) => () => void;
  onNotchDismiss: (callback: () => void) => () => void;
  onUpdateState: (callback: (state: UpdateStatus) => void) => () => void;
  installUpdate: () => Promise<void>;
  requestCharger: (toPeerId: string) => Promise<void>;
  openSettings: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  showDropdown: () => Promise<void>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
