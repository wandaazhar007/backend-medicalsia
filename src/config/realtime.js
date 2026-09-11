import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const client = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (!client) {
  console.warn('SUPABASE_URL/SUPABASE_ANON_KEY not set — queue broadcasts disabled, display screens fall back to their periodic poll.');
}

const channels = {};

function getChannel(queueType) {
  if (!client) return null;
  if (!channels[queueType]) {
    const channel = client.channel(`queue:${queueType}`);
    channel.subscribe();
    channels[queueType] = channel;
  }
  return channels[queueType];
}

// Pings /display or /display-pharmacy that their queue changed, so they can
// refetch once via the existing GET /public/queue* endpoints instead of
// polling every few seconds. Payload intentionally carries no data (not even
// the queue number) — it's purely a "go refetch" signal, never a channel
// PHI could travel through.
export function broadcastQueueUpdate(queueType) {
  const channel = getChannel(queueType);
  if (!channel) return;
  channel.send({ type: 'broadcast', event: 'queue_updated', payload: {} });
}
