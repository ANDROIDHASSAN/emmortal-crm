import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

// Some local/VPN resolvers refuse SRV queries (querySrv ECONNREFUSED), breaking
// mongodb+srv:// Atlas URIs. When DNS_SERVERS is set, use public resolvers.
if (env.DNS_SERVERS && env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try { dns.setServers(env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)); } catch { /* ignore */ }
}

let connected = false;

export async function connectDB(uri = env.MONGODB_URI) {
  if (connected) return mongoose.connection;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000, autoIndex: !env.isProd });
  connected = true;
  console.log(`[db] connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export default connectDB;
