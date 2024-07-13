import React, { useEffect, useState, useContext, useRef } from 'react';
import AuthContext from '../context/AuthContext';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('http://localhost:5000'); // Ensure this matches your backend server address

const EmployeeDashboard = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const [call, setCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const userVideo = useRef();
  const connectionRef = useRef();
  const streamRef = useRef(); // Add a ref to store the stream

  useEffect(() => {
    if (!loading && user) {
      console.log(`Registering user ${user._id}`);
      socket.emit('registerUser', user._id); // Register the user with the server

      socket.on('callUser', ({ from, signal }) => {
        console.log(`Incoming call from: ${from}`);
        setCall(true);
        setCaller({ from, signal });
      });

      socket.on('callEnded', () => {
        console.log('Call ended by peer');
        endCall();
      });

      return () => {
        socket.off('callUser');
        socket.off('callEnded');
      };
    }
  }, [user, loading]);

  const acceptCall = () => {
    console.log('Call accepted');
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setCallAccepted(true);
        streamRef.current = stream; // Store the stream in the ref
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }

        const peer = new Peer({ initiator: false, trickle: false, stream: stream });
        peer.signal(caller.signal);

        peer.on('signal', (data) => {
          console.log('Emitting acceptCall event');
          socket.emit('acceptCall', { signal: data, to: caller.from });
        });

        peer.on('stream', (stream) => {
          console.log('Receiving stream');
          if (userVideo.current) {
            userVideo.current.srcObject = stream;
          }
        });

        peer.on('error', (err) => {
          console.error('Peer connection error:', err);
        });

        peer.on('close', () => {
          console.log('Peer connection closed');
          endCall();
        });

        connectionRef.current = peer;
      })
      .catch((err) => {
        console.error('Error accessing media devices.', err);
      });
  };

  const rejectCall = () => {
    socket.emit('rejectCall', { to: caller.from });
    setCall(false);
    setCaller(null);
  };

  const endCall = () => {
    setCallEnded(true);
    if (connectionRef.current) connectionRef.current.destroy();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCall(false);
    setCallAccepted(false);
    setCaller(null);
    socket.emit('endCall', { to: caller.from });
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in.</div>;

  return (
    <div>
      <h1>Employee Dashboard</h1>
      <button onClick={logout}>Logout</button>
      {call && !callAccepted && (
        <div>
          <h2>Incoming Call...</h2>
          <button onClick={acceptCall}>Accept</button>
          <button onClick={rejectCall}>Reject</button>
        </div>
      )}
      {callAccepted && !callEnded && (
        <div>
          <video id="userVideo" ref={userVideo} playsInline autoPlay style={{ width: '300px' }} />
          <button onClick={endCall}>End Call</button>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
