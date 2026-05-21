import { exec } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import { stateStore } from './state.store';

const execAsync = promisify(exec);

async function getSsidViaNetworkSetup(ifaceName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`networksetup -getairportnetwork ${ifaceName}`);
    const match = stdout.match(/Current Wi-Fi Network:\s*(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export async function detectNetworkName(): Promise<void> {
  try {
    const [wifiList, ifaces] = await Promise.all([
      si.wifiConnections().catch(() => []),
      si.networkInterfaces().catch(() => []),
    ]);

    const ifaceArray = Array.isArray(ifaces) ? ifaces : [];

    // prefer Wi-Fi SSID from systeminformation
    const connectedWifi = wifiList.find((w) => w.ssid && w.ssid !== '<redacted>');
    if (connectedWifi?.ssid) {
      console.log('[Network] SSID from si.wifiConnections:', connectedWifi.ssid);
      stateStore.setNetworkName(connectedWifi.ssid);
      return;
    }
    console.log('[Network] wifiList:', JSON.stringify(wifiList.map(w => w.ssid)));

    // macOS 15 removed the airport binary so systeminformation falls back to CoreWLAN,
    // which either returns '<redacted>' or an empty list without Location Services.
    // Use networksetup instead — it reads from System Configuration and needs no permissions.
    const wifiIface = ifaceArray.find((i) => i.type === 'wireless' && !i.virtual && i.ip4);
    const hasRedacted = wifiList.some((w) => w.ssid === '<redacted>');
    if (wifiIface && (hasRedacted || wifiList.length === 0)) {
      const ssid = await getSsidViaNetworkSetup(wifiIface.iface);
      stateStore.setNetworkName(ssid, !ssid);
      return;
    }

    // fall back to "Ethernet" if a wired interface has an IP
    const wired = ifaceArray.find((i) => i.type === 'wired' && !i.virtual && i.ip4);
    if (wired) {
      stateStore.setNetworkName('Ethernet');
      return;
    }

    stateStore.setNetworkName(null);
  } catch {
    stateStore.setNetworkName(null);
  }
}
