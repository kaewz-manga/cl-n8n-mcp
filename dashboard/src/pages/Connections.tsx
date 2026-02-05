import { useState, useEffect } from 'react';
import { connectionsApi } from '../api/client';
import { useConnection } from '../contexts/ConnectionContext';
import {
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  RefreshCw,
  X,
} from 'lucide-react';

export default function Connections() {
  const { connections, refreshConnections, loading: contextLoading } = useConnection();
  const [showModal, setShowModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [n8nUrl, setN8nUrl] = useState('');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    const response = await connectionsApi.create(name, n8nUrl, n8nApiKey);
    if (response.success) {
      setShowModal(false);
      setName('');
      setN8nUrl('');
      setN8nApiKey('');
      setSuccess('Connection created successfully');
      await refreshConnections();
    } else {
      setError(response.error?.message || 'Failed to create connection');
    }

    setFormLoading(false);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setError('');
    setSuccess('');

    const response = await connectionsApi.test(id);
    if (response.success) {
      setSuccess('Connection test successful');
      await refreshConnections();
    } else {
      setError(response.error?.message || 'Connection test failed');
    }

    setTestingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    setDeletingId(id);
    const response = await connectionsApi.delete(id);
    if (response.success) {
      setSuccess('Connection deleted');
      await refreshConnections();
    } else {
      setError(response.error?.message || 'Failed to delete connection');
    }
    setDeletingId(null);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-n2f-text">Connections</h1>
          <p className="text-n2f-text-secondary mt-1">
            Manage your n8n instance connections
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Connection
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-message">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {contextLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
        </div>
      ) : connections.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-n2f-text-muted">No connections yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add your first connection
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {connections.map((conn) => (
            <div key={conn.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-n2f-text">{conn.name}</h3>
                  <p className="text-sm text-n2f-text-muted mt-1">{conn.n8n_url}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        conn.status === 'active'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {conn.status}
                    </span>
                    {conn.last_tested_at && (
                      <span className="text-xs text-n2f-text-muted">
                        Last tested: {new Date(conn.last_tested_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(conn.id)}
                    disabled={testingId === conn.id}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    {testingId === conn.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => handleDelete(conn.id)}
                    disabled={deletingId === conn.id}
                    className="p-2 text-n2f-text-secondary hover:text-n2f-error transition-colors"
                  >
                    {deletingId === conn.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-n2f-surface border border-n2f-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-n2f-border">
              <h2 className="text-lg font-semibold text-n2f-text">Add Connection</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-n2f-text-secondary hover:text-n2f-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My n8n Instance"
                  required
                />
              </div>
              <div>
                <label className="label">n8n URL</label>
                <input
                  type="url"
                  className="input"
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  placeholder="https://n8n.example.com"
                  required
                />
              </div>
              <div>
                <label className="label">n8n API Key</label>
                <input
                  type="password"
                  className="input"
                  value={n8nApiKey}
                  onChange={(e) => setN8nApiKey(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
