import React, { useRef, useState, useEffect } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('http://localhost:5000'); // Ensure this matches your backend server address

const VideoCall = ({ user, selectedUser, endCall }) => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [error, setError] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    if (selectedUser) {
      console.log('Starting video call with user:', selectedUser);
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setStream(stream);
          if (myVideo.current) {
            myVideo.current.srcObject = stream;
          }

          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
          });

          peer.on('signal', (data) => {
            console.log('Emitting callUser event');
            socket.emit('callUser', {
              userToCall: selectedUser,
              signalData: data,
              from: user._id,
            });
          });

          peer.on('stream', (stream) => {
            if (userVideo.current) {
              userVideo.current.srcObject = stream;
            }
          });

          peer.on('error', (err) => {
            console.error('Peer connection error:', err);
          });

          socket.on('callAccepted', (signal) => {
            console.log('Call accepted');
            setCallAccepted(true);
            peer.signal(signal);
          });

          socket.on('callRejected', () => {
            console.log('Call rejected');
            endCall();
          });

          peer.on('close', () => {
            endCall();
          });

          connectionRef.current = peer;
        })
        .catch((err) => {
          setError('Error accessing media devices.');
          console.error('Error accessing media devices.', err);
        });
    }

    return () => {
      socket.off('callAccepted');
      socket.off('callRejected');
      if (connectionRef.current) connectionRef.current.destroy();
    };
  }, [selectedUser, user._id, endCall]);

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) connectionRef.current.destroy();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    socket.emit('endCall', { to: selectedUser });
    endCall();
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
      <div>
        <h2>Admin</h2>
        <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px' }} />
      </div>
      <div>
        {callAccepted && !callEnded && (
          <>
            <h2>Employee</h2>
            <video playsInline ref={userVideo} autoPlay style={{ width: '300px' }} />
          </>
        )}
      </div>
      {callAccepted && !callEnded && (
        <button onClick={leaveCall}>End Call</button>
      )}
      {error && <p>{error}</p>}
    </div>
  );
};

export default VideoCall;
