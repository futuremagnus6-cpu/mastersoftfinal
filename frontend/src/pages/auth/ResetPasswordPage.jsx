import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FiKey, FiArrowLeft, FiCheckCircle, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const validatePassword = () => {
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/[@$!%*?&]/.test(password)) {
      setError('Password must contain at least one special character (@$!%*?&)');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validatePassword()) return;

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      });
      setSuccess(true);
      toast.success('Password reset successful. Please log in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    return strength;
  })();

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return { text: 'No password', color: 'bg-gray-200' };
    if (passwordStrength <= 2) return { text: 'Weak', color: 'bg-danger-500' };
    if (passwordStrength === 3) return { text: 'Fair', color: 'bg-warning-500' };
    if (passwordStrength >= 4) return { text: 'Strong', color: 'bg-success-500' };
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="card p-8">
          {!success ? (
            <>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6">
                <FiArrowLeft className="w-4 h-4" /> Back to Login
              </Link>

              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiKey className="w-7 h-7 text-primary-600 dark:text-primary-400" />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">Reset Your Password</h2>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
                Create a strong password to secure your account
              </p>

              {!token && (
                <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg flex gap-3">
                  <FiAlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-danger-900 dark:text-danger-200">Invalid reset link</p>
                    <p className="text-xs text-danger-700 dark:text-danger-300 mt-1">
                      Please request a new password reset email.
                    </p>
                    <Link to="/forgot-password" className="text-xs font-medium text-danger-600 dark:text-danger-400 hover:underline mt-2 inline-block">
                      Request new link
                    </Link>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" disabled={!token}>
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="Enter new password"
                      className="input-field pl-9 pr-9"
                      disabled={!token}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      disabled={!token}
                    >
                      {showPassword ? (
                        <FiEyeOff className="w-4 h-4" />
                      ) : (
                        <FiEye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Strength:</span>
                        <span className={`text-xs font-medium ${
                          passwordStrength <= 2 ? 'text-danger-600' :
                          passwordStrength === 3 ? 'text-warning-600' :
                          'text-success-600'
                        }`}>
                          {getStrengthLabel().text}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getStrengthLabel().color}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                        <li className={password.length >= 8 ? 'text-success-600 dark:text-success-400' : ''}>
                          ✓ At least 8 characters
                        </li>
                        <li className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-success-600 dark:text-success-400' : ''}>
                          ✓ Mix of uppercase and lowercase letters
                        </li>
                        <li className={/[0-9]/.test(password) ? 'text-success-600 dark:text-success-400' : ''}>
                          ✓ At least one number
                        </li>
                        <li className={/[@$!%*?&]/.test(password) ? 'text-success-600 dark:text-success-400' : ''}>
                          ✓ At least one special character (@$!%*?&)
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Confirm new password"
                      className="input-field pl-9 pr-9"
                      disabled={!token}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      disabled={!token}
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff className="w-4 h-4" />
                      ) : (
                        <FiEye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && password === confirmPassword && (
                    <p className="mt-1.5 text-xs text-success-600 dark:text-success-400">✓ Passwords match</p>
                  )}
                </div>

                {error && <p className="text-sm text-danger-500 bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !token || !password || !confirmPassword}
                  className="btn-primary w-full py-3"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Resetting Password...</span>
                    </div>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              <div className="mt-6 p-4 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg">
                <p className="text-xs text-info-800 dark:text-info-200">
                  <strong>Password Requirements:</strong> Your password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Successful!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Redirecting to login in 3 seconds...
              </p>
              <Link to="/login" className="btn-primary inline-flex items-center gap-2">
                <FiArrowLeft className="w-4 h-4" /> Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
