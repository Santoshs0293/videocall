import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('http://localhost:5000'); // Ensure this matches your backend server address

const AdminDashboard = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'employee', password: '' });
  const adminVideo = useRef();
  const employeeVideo = useRef();
  const connectionRef = useRef();
  const streamRef = useRef();

  const endCall = useCallback(() => {
    if (connectionRef.current) connectionRef.current.destroy();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    socket.emit('endCall', { to: selectedUser });
    setSelectedUser(null);
  }, [selectedUser]);

  useEffect(() => {
    if (!loading && user) {
      console.log(`Registering admin ${user._id}`);
      socket.emit('registerUser', user._id); // Register the admin with the server

      socket.on('callAccepted', (signal) => {
        console.log('Call accepted by employee');
        connectionRef.current.signal(signal);
      });

      socket.on('callEnded', () => {
        console.log('Call ended by peer');
        endCall();
      });

      return () => {
        socket.off('callAccepted');
        socket.off('callEnded');
      };
    }
  }, [user, loading, endCall]);

  const initiateCall = (userId) => {
    setSelectedUser(userId);
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (adminVideo.current) {
          adminVideo.current.srcObject = stream;
        }

        const peer = new Peer({ initiator: true, trickle: false, stream: stream });
        peer.on('signal', (data) => {
          console.log('Sending signal data:', data);
          socket.emit('callUser', { userToCall: userId, signalData: data, from: user._id });
        });

        peer.on('stream', (stream) => {
          console.log('Receiving stream from employee');
          if (employeeVideo.current) {
            employeeVideo.current.srcObject = stream;
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

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers(users.filter((user) => user._id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const editUser = (user) => {
    setEditingUser(user);
  };

  const saveUser = async () => {
    try {
      const res = await axios.put(`http://localhost:5000/api/users/${editingUser._id}`, editingUser, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers(users.map((user) => (user._id === editingUser._id ? res.data : user)));
      setEditingUser(null);
    } catch (error) {
      console.error(error);
    }
  };

  const createUser = async () => {
    try {
      const res = await axios.post(`http://localhost:5000/api/users`, newUser, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUsers([...users, res.data]);
      setNewUser({ name: '', email: '', role: 'employee', password: '' });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in.</div>;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <button onClick={logout}>Logout</button>
      <h2>Create New User</h2>
      <input
        type="text"
        placeholder="Name"
        value={newUser.name}
        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={newUser.email}
        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        value={newUser.password}
        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
      />
      <select
        value={newUser.role}
        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
      >
        <option value="admin">Admin</option>
        <option value="employee">Employee</option>
      </select>
      <button onClick={createUser}>Create User</button>
      <ul>
        {users.map((user) => (
          <li key={user._id}>
            {user.name} - {user.email} - {user.role}
            {user.role === 'employee' && (
              <button onClick={() => initiateCall(user._id)}>Call</button>
            )}
            <button onClick={() => deleteUser(user._id)}>Delete</button>
            <button onClick={() => editUser(user)}>Edit</button>
          </li>
        ))}
      </ul>
      {editingUser && (
        <div>
          <h2>Edit User</h2>
          <input
            type="text"
            value={editingUser.name}
            onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
          />
          <input
            type="email"
            value={editingUser.email}
            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
          />
          <select
            value={editingUser.role}
            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
          </select>
          <button onClick={saveUser}>Save</button>
          <button onClick={() => setEditingUser(null)}>Cancel</button>
        </div>
      )}
      {selectedUser && (
        <div>
          <video ref={adminVideo} playsInline muted autoPlay style={{ width: '300px' }} />
          <video ref={employeeVideo} playsInline autoPlay style={{ width: '300px' }} />
          <button onClick={endCall}>End Call</button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
