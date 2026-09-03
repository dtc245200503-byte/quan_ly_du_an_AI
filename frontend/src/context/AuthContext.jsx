import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('g9_access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user me", err);
      localStorage.removeItem('g9_access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/api/auth/login', { identifier, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('g9_access_token', access_token);
    setUser(userData);
    return userData;
  };

  const register = async (identifier, password, full_name, role = "Member") => {
    const res = await api.post('/api/auth/register', { identifier, password, full_name, role });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('g9_access_token', access_token);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('g9_access_token');
      setUser(null);
    }
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUserProfile, refreshUser: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
