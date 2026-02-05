import { useState, useEffect } from 'react';
import { apiKeysApi } from '../api/client';
import { useConnection } from '../contexts/ConnectionContext';
import type { ApiKey } from '../types';
import {
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  Copy,
  X,
  Key,
} from 'lucide-react';

export default function ApiKeys() {
  const { connections } = useConnection();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    const response = await apiKeysApi.list();
    if (response.success && response.data) {
      setKeys(response.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    const response = await apiKeysApi.create(name, connectionId || undefined);
    if (response.success && response.data) {
      setNewKey(response.data.full_key);
      setName('');
      setConnectionId('');
      await fetchKeys();
    } else {
      setError(response.error?.message || 'Failed to create API key');
    }

    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;

    setDeletingId(id);
    const response = await apiKeysApi.revoke(id);
    if (response.success) {
      setSuccess('API key revoked');
      await fetchKeys();
    } else {
      setError(response.error?.message || 'Failed to revoke API key');
    }
    setDeletingId(null);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard');
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
          <h1 className="text-2xl font-bold text-n2f-text">API Keys</h1>
          <p className="text-n2f-text-secondary mt-1">
            Manage your API keys for MCP access
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Key
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

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
        </div>
      ) : keys.length === 0 ? (
        <div className="card text-center py-12">
          <Key className="h-12 w-12 text-n2f-text-muted mx-auto mb-4" />
          <p className="text-n2f-text-muted">No API keys yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create your first key
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {keys.map((key) => (
            <div key={key.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-n2f-text">{key.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="px-2 py-1 bg-n2f-elevated rounded text-sm text-n2f-text-secondary">
                      {key.key_prefix}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.key_prefix)}
                      className="p-1 text-n2f-text-muted hover:text-n2f-accent"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-n2f-text-muted">
                    <span
                      className={`px-2 py-1 rounded ${
                        key.status === 'active'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {key.status}
                    </span>
                    {key.last_used_at && (
                      <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                    )}
                    <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  disabled={deletingId === key.id}
                  className="p-2 text-n2f-text-secondary hover:text-n2f-error transition-colors"
                >
                  {deletingId === key.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
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
              <h2 className="text-lg font-semibold text-n2f-text">
                {newKey ? 'API Key Created' : 'Create API Key'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewKey(null);
                }}
                className="p-1 text-n2f-text-secondary hover:text-n2f-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {newKey ? (
              <div className="p-6 space-y-4">
                <div className="bg-n2f-elevated border border-n2f-border rounded-lg p-4">
                  <p className="text-sm text-n2f-text-secondary mb-2">Your new API key:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-n2f-accent break-all">{newKey}</code>
                    <button
                      onClick={() => copyToClipboard(newKey)}
                      className="p-2 text-n2f-text-secondary hover:text-n2f-accent"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <p className="text-sm text-yellow-300">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setNewKey(null);
                  }}
                  className="btn-primary w-full"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    type="text"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My API Key"
                    required
                  />
                </div>
                <div>
                  <label className="label">Connection (optional)</label>
                  <select
                    className="input"
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
                  >
                    <option value="">No connection (use headers)</option>
                    {connections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-n2f-text-muted mt-1">
                    Bind this key to a connection to avoid passing n8n credentials in headers
                  </p>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
