const { Server } = require('socket.io');

const initSocket = (server, port) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Adjust the origin as needed for security
      methods: ['GET', 'POST']
    }
  });

  console.log(`Socket.IO server running on port ${port}`);

  const emailToSocketIdMap = new Map();
  const socketIdToEmailMap = new Map();

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('registerUser', (email) => {
      emailToSocketIdMap.set(email, socket.id);
      socketIdToEmailMap.set(socket.id, email);
      console.log(`User registered: ${email}`);
    });

    socket.on('callUser', ({ userToCall, signalData, from }) => {
      const socketId = emailToSocketIdMap.get(userToCall);
      if (socketId) {
        io.to(socketId).emit('callUser', { signal: signalData, from });
        console.log(`Calling user ${userToCall} from ${from}`);
      } else {
        console.log(`User ${userToCall} not found`);
      }
    });

    socket.on('acceptCall', ({ signal, to }) => {
      const socketId = emailToSocketIdMap.get(to);
      if (socketId) {
        io.to(socketId).emit('callAccepted', signal);
        console.log(`Call accepted by ${socket.id} for ${to}`);
      }
    });

    socket.on('rejectCall', ({ to }) => {
      const socketId = emailToSocketIdMap.get(to);
      if (socketId) {
        io.to(socketId).emit('callRejected');
        console.log(`Call rejected by ${socket.id} for ${to}`);
      }
    });

    socket.on('endCall', ({ to }) => {
      const socketId = emailToSocketIdMap.get(to);
      if (socketId) {
        io.to(socketId).emit('callEnded');
        console.log(`Call ended by ${socket.id} for ${to}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      const email = socketIdToEmailMap.get(socket.id);
      emailToSocketIdMap.delete(email);
      socketIdToEmailMap.delete(socket.id);
    });
  });
};

module.exports = initSocket;
