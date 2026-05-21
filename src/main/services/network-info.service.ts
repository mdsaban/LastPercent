import si from 'systeminformation';
import { stateStore } from './state.store';

export async function detectNetworkName(): Promise<void> {
  try {
    const [wifiList, ifaces] = await Promise.all([
      si.wifiConnections().catch(() => []),
      si.networkInterfaces().catch(() => []),
    ]);

    // prefer Wi-Fi SSID
    const connectedWifi = wifiList.find((w) => w.ssid);
    if (connectedWifi?.ssid) {
      stateStore.setNetworkName(connectedWifi.ssid);
      return;
    }

    // fall back to "Ethernet" if a wired interface has an IP
    const wired = Array.isArray(ifaces)
      ? ifaces.find((i) => i.type === 'wired' && !i.virtual && i.ip4)
      : null;
    if (wired) {
      stateStore.setNetworkName('Ethernet');
      return;
    }

    stateStore.setNetworkName(null);
  } catch {
    stateStore.setNetworkName(null);
  }
}
