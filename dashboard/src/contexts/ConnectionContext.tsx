import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { connectionsApi } from '../api/client';
import { useAuth } from './AuthContext';
import type { Connection } from '../types';

interface ConnectionContextType {
  connections: Connection[];
  activeConnection: Connection | null;
  loading: boolean;
  setActiveConnectionId: (id: string | null) => void;
  refreshConnections: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionIdState] = useState<string | null>(() => {
    return localStorage.getItem('n2f_active_connection');
  });
  const [loading, setLoading] = useState(false);

  const refreshConnections = useCallback(async () => {
    if (!user) {
      setConnections([]);
      return;
    }

    setLoading(true);
    const response = await connectionsApi.list();
    if (response.success && response.data) {
      setConnections(response.data);

      // Auto-select first connection if none selected
      if (!activeConnectionId && response.data.length > 0) {
        setActiveConnectionIdState(response.data[0].id);
        localStorage.setItem('n2f_active_connection', response.data[0].id);
      }
    }
    setLoading(false);
  }, [user, activeConnectionId]);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  const setActiveConnectionId = (id: string | null) => {
    setActiveConnectionIdState(id);
    if (id) {
      localStorage.setItem('n2f_active_connection', id);
    } else {
      localStorage.removeItem('n2f_active_connection');
    }
  };

  const activeConnection = connections.find((c) => c.id === activeConnectionId) || null;

  return (
    <ConnectionContext.Provider
      value={{
        connections,
        activeConnection,
        loading,
        setActiveConnectionId,
        refreshConnections,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}
