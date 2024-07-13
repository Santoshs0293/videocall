import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUser(res.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/login`, { email, password });
      localStorage.setItem('token', res.data.token);
      // Fetch the latest user profile
      const userProfile = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${res.data.token}`,
        },
      });
      setUser(userProfile.data);
      if (userProfile.data.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/employee-dashboard');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/auth/register`, { name, email, password });
      localStorage.setItem('token', res.data.token);
      // Fetch the latest user profile
      const userProfile = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${res.data.token}`,
        },
      });
      setUser(userProfile.data);
      if (userProfile.data.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/employee-dashboard');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
