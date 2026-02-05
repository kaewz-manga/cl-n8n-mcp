import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/client';
import { AlertCircle, CheckCircle, Loader2, Shield, User, Trash2 } from 'lucide-react';

export default function Settings() {
  const { user, plan, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);
    const response = await authApi.changePassword(currentPassword, newPassword);
    if (response.success) {
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(response.error?.message || 'Failed to change password');
    }
    setPasswordLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      setError('Please type your email to confirm');
      return;
    }

    setDeleteLoading(true);
    const response = await authApi.deleteAccount();
    if (response.success) {
      logout();
    } else {
      setError(response.error?.message || 'Failed to delete account');
    }
    setDeleteLoading(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Settings</h1>
        <p className="text-n2f-text-secondary mt-1">Manage your account settings</p>
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

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tabs */}
        <div className="w-full md:w-48 flex md:flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-n2f-accent/10 text-n2f-accent'
                  : 'text-n2f-text-secondary hover:text-n2f-text hover:bg-n2f-elevated'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-n2f-text">Profile</h2>
              <div className="grid gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={user?.email || ''} disabled />
                </div>
                <div>
                  <label className="label">Plan</label>
                  <input
                    type="text"
                    className="input capitalize"
                    value={plan?.name || 'Free'}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Member since</label>
                  <input
                    type="text"
                    className="input"
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                    disabled
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card space-y-6">
              <h2 className="text-lg font-semibold text-n2f-text">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Change Password
                </button>
              </form>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="card border-red-900/50 space-y-6">
              <h2 className="text-lg font-semibold text-n2f-error">Danger Zone</h2>
              <p className="text-sm text-n2f-text-secondary">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">Type your email to confirm</label>
                  <input
                    type="email"
                    className="input"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={user?.email}
                  />
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== user?.email}
                  className="btn-danger flex items-center gap-2"
                >
                  {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
