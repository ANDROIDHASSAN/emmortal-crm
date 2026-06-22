import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

let connected = false;

export async function connectDB(uri = env.MONGODB_URI) {
  if (connected) return mongoose.connection;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: !env.isProd, // build indexes automatically in dev; manage explicitly in prod
  });
  connected = true;
  // eslint-disable-next-line no-console
  console.log(`[db] connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

export async function disconnectDB() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export default connectDB;
