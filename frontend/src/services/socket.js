/**
 * Socket.IO client singleton for real-time events
 */
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const PROD_URL = 'https://storygen-backend-9uof.onrender.com/api';
    const DEV_URL = 'http://localhost:3005/api';
    const apiUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? PROD_URL : DEV_URL);
    const url = apiUrl.replace(/\/api\/?$/, ''); // Remove /api suffix for root URL
    socket = io(url, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export function joinProject(projectId) {
  const s = connectSocket();
  s.emit('join:project', projectId);
}

export function leaveProject(projectId) {
  const s = getSocket();
  s.emit('leave:project', projectId);
}

/**
 * Listen for generation progress events.
 * Returns a cleanup function to remove the listener.
 */
export function onGenerationProgress(callback) {
  const s = connectSocket();
  s.on('generation:progress', callback);
  return () => s.off('generation:progress', callback);
}

/**
 * Listen for script generation stream events.
 * Returns a cleanup function to remove the listener.
 */
export function onScriptGenerate(callback) {
  const s = connectSocket();
  s.on('script:generate', callback);
  return () => s.off('script:generate', callback);
}

/**
 * Join/leave a standalone video generation job room.
 */
export function joinVideoJob(jobId) {
  const s = connectSocket();
  s.emit('join:video', jobId);
}

export function leaveVideoJob(jobId) {
  const s = getSocket();
  s.emit('leave:video', jobId);
}

/**
 * Listen for standalone video generation progress events.
 * Returns a cleanup function to remove the listener.
 */
export function onVideoProgress(callback) {
  const s = connectSocket();
  s.on('video:standalone:progress', callback);
  return () => s.off('video:standalone:progress', callback);
}
