/**
 * socketService.js — Socket.IO integration for real-time events
 * Events:
 *   generation:progress — Image/video generation progress updates
 *   assistant:chunk — Streaming writing assistant responses
 */
const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5180', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join project room for targeted events
    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`Socket ${socket.id} joined project:${projectId}`);
    });

    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Join/leave standalone video job room
    socket.on('join:video', (jobId) => {
      socket.join(`video:${jobId}`);
      console.log(`Socket ${socket.id} joined video:${jobId}`);
    });

    socket.on('leave:video', (jobId) => {
      socket.leave(`video:${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

/**
 * Emit a generation progress event to a project room
 */
function emitProgress(projectId, data) {
  if (io) {
    io.to(`project:${projectId}`).emit('generation:progress', data);
  }
}

/**
 * Emit an assistant chunk event to a project room
 */
function emitAssistantChunk(projectId, data) {
  if (io) {
    io.to(`project:${projectId}`).emit('assistant:chunk', data);
  }
}

/**
 * Emit a script generation chunk event to a project room
 */
function emitScriptChunk(projectId, data) {
  if (io) {
    io.to(`project:${projectId}`).emit('script:generate', data);
  }
}

/**
 * Emit a standalone video generation progress event to a job room
 */
function emitVideoProgress(jobId, data) {
  if (io) {
    io.to(`video:${jobId}`).emit('video:standalone:progress', { jobId, ...data });
  }
}

module.exports = { initSocket, getIO, emitProgress, emitAssistantChunk, emitScriptChunk, emitVideoProgress };
