import { z } from 'zod';

export const HeartbeatSchema = z.object({
  type: z.literal('heartbeat'),
  v: z.number(),
  peerId: z.string().uuid(),
  displayName: z.string().min(1).max(32),
  emoji: z.string().min(1).max(8),
  battery: z.number().int().min(0).max(100),
  isCharging: z.boolean(),
  isPluggedIn: z.boolean(),
  isVisible: z.boolean().optional().default(true),
  status: z.enum(['available', 'away', 'dnd']),
  lastUpdatedAt: z.number(),
  appVersion: z.string(),
});

export const ChargerRequestSchema = z.object({
  type: z.literal('charger_request'),
  v: z.number(),
  toPeerId: z.string(),
  from: z.object({
    peerId: z.string(),
    displayName: z.string(),
    emoji: z.string(),
    battery: z.number(),
  }),
});

export const GoodbyeSchema = z.object({
  type: z.literal('goodbye'),
  v: z.number(),
  peerId: z.string(),
});

const MessageSchema = z.discriminatedUnion('type', [
  HeartbeatSchema,
  ChargerRequestSchema,
  GoodbyeSchema,
]);

export type Heartbeat = z.infer<typeof HeartbeatSchema>;
export type ChargerRequest = z.infer<typeof ChargerRequestSchema>;
export type Goodbye = z.infer<typeof GoodbyeSchema>;
export type Message = z.infer<typeof MessageSchema>;

export function parseMessage(raw: string): Message | null {
  try {
    const result = MessageSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
