import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, totpApi } from '../api/client';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, CheckCircle, Loader2, Shield, ShieldCheck, ShieldOff, User, Trash2, Copy } from 'lucide-react';

export default function Settings() {
  const { user, plan, logout, refreshUser } = useAuth();
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

  // 2FA state
  const [totpStep, setTotpStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

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

  // 2FA handlers
  const handleTotpSetup = async () => {
    setError('');
    setSuccess('');
    setTotpLoading(true);

    const response = await totpApi.setup();
    if (response.success && response.data) {
      setTotpSecret(response.data.secret);
      setTotpUri(response.data.uri);
      setTotpStep('setup');
    } else {
      setError(response.error?.message || 'Failed to setup 2FA');
    }
    setTotpLoading(false);
  };

  const handleTotpEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTotpLoading(true);

    const response = await totpApi.enable(totpSecret, totpCode);
    if (response.success) {
      setSuccess('2FA enabled successfully');
      setTotpStep('idle');
      setTotpCode('');
      setTotpSecret('');
      setTotpUri('');
      await refreshUser();
    } else {
      setError(response.error?.message || 'Invalid verification code');
    }
    setTotpLoading(false);
  };

  const handleTotpDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTotpLoading(true);

    const response = await totpApi.disable(disablePassword, disableCode);
    if (response.success) {
      setSuccess('2FA disabled successfully');
      setShowDisable(false);
      setDisablePassword('');
      setDisableCode('');
      await refreshUser();
    } else {
      setError(response.error?.message || 'Failed to disable 2FA');
    }
    setTotpLoading(false);
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(totpSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
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
        <div className="flex-1 space-y-6">
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
            <>
              {/* Two-Factor Authentication */}
              <div className="card space-y-6">
                <h2 className="text-lg font-semibold text-n2f-text">Two-Factor Authentication</h2>

                {user?.totp_enabled === 1 ? (
                  /* 2FA Enabled */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <ShieldCheck className="h-5 w-5 text-green-400" />
                      <span className="text-sm text-green-400">2FA is enabled</span>
                    </div>

                    {showDisable ? (
                      <form onSubmit={handleTotpDisable} className="space-y-4">
                        <p className="text-sm text-n2f-text-secondary">
                          Enter your password and a current 2FA code to disable.
                        </p>
                        <div>
                          <label className="label">Password</label>
                          <input
                            type="password"
                            className="input"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="label">2FA Code</label>
                          <input
                            type="text"
                            className="input"
                            value={disableCode}
                            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            inputMode="numeric"
                            maxLength={6}
                            required
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={totpLoading || disableCode.length !== 6}
                            className="btn-danger flex items-center gap-2"
                          >
                            {totpLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Disable 2FA
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowDisable(false); setDisablePassword(''); setDisableCode(''); setError(''); }}
                            className="px-4 py-2 rounded-lg border border-n2f-border text-n2f-text-secondary hover:text-n2f-text transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setShowDisable(true)}
                        className="flex items-center gap-2 text-sm text-n2f-text-secondary hover:text-n2f-error transition-colors"
                      >
                        <ShieldOff className="h-4 w-4" />
                        Disable 2FA
                      </button>
                    )}
                  </div>
                ) : totpStep === 'setup' ? (
                  /* 2FA Setup */
                  <form onSubmit={handleTotpEnable} className="space-y-4">
                    <p className="text-sm text-n2f-text-secondary">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>

                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <QRCodeSVG value={totpUri} size={200} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-n2f-text-muted">Or enter this key manually:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-lg bg-n2f-elevated border border-n2f-border text-sm font-mono text-n2f-text break-all">
                          {totpSecret}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="p-2 rounded-lg border border-n2f-border hover:bg-n2f-elevated transition-colors"
                          title="Copy secret"
                        >
                          {secretCopied ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-n2f-text-secondary" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="label">Enter the 6-digit code from your app</label>
                      <input
                        type="text"
                        className="input text-center text-lg tracking-widest"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={totpLoading || totpCode.length !== 6}
                        className="btn-primary flex items-center gap-2"
                      >
                        {totpLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Verify & Enable
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTotpStep('idle'); setTotpCode(''); setTotpSecret(''); setTotpUri(''); setError(''); }}
                        className="px-4 py-2 rounded-lg border border-n2f-border text-n2f-text-secondary hover:text-n2f-text transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  /* 2FA Not Enabled */
                  <div className="space-y-4">
                    <p className="text-sm text-n2f-text-secondary">
                      Add an extra layer of security to your account using a Time-based One-Time Password (TOTP).
                    </p>
                    <button
                      onClick={handleTotpSetup}
                      disabled={totpLoading}
                      className="btn-primary flex items-center gap-2"
                    >
                      {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Enable 2FA
                    </button>
                  </div>
                )}
              </div>

              {/* Change Password */}
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
            </>
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
