import { useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
      return { token, username };
    }
    return null;
  });

  const login = (newUser: User) => {
    localStorage.setItem('token', newUser.token);
    localStorage.setItem('username', newUser.username);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
