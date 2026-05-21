import * as dgram from 'dgram';
import { app } from 'electron';
import type { NotchWindow } from '../windows/notch';

export const DEV_TRIGGER_PORT = 41235;

export function startDevNotchTrigger(notch: NotchWindow): (() => void) | undefined {
  if (app.isPackaged) return;

  const socket = dgram.createSocket('udp4');

  socket.on('message', (buf) => {
    try {
      const { payload, duration } = JSON.parse(buf.toString());
      notch.show(payload, typeof duration === 'number' ? duration : undefined);
    } catch (e) {
      console.error('[dev-notch] bad message:', e);
    }
  });

  socket.on('error', (err) => {
    console.error('[dev-notch] socket error:', err.message);
  });

  socket.bind(DEV_TRIGGER_PORT, '127.0.0.1', () => {
    console.log(`[dev-notch] trigger server on localhost:${DEV_TRIGGER_PORT}`);
  });

  return () => socket.close();
}
