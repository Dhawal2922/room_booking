import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { changePassword } from '../api';

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setStatus({ type: 'error', message: 'New passwords do not match' });
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await changePassword({ currentPassword, newPassword });
      setStatus({ type: 'success', message: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {status.message && (
            <div className={`p-4 rounded-xl text-sm ${status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
              {status.message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field w-full"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field w-full"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field w-full"
              placeholder="Confirm new password"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto px-8 py-2"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
