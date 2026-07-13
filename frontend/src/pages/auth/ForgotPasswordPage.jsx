import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft, FiCheckCircle, FiSend } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email) { setError('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Invalid email format'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="card p-8">
          {!sent ? (
            <>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6">
                <FiArrowLeft className="w-4 h-4" /> Back to Login
              </Link>

              <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiMail className="w-7 h-7 text-primary-600 dark:text-primary-400" />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">Forgot Password?</h2>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className={`input-field ${error ? 'border-danger-500' : ''}`}
                    autoFocus
                  />
                  {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /><span>Sending...</span></>
                  ) : (
                    <><FiSend className="w-4 h-4" /><span>Send Reset Link</span></>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="w-8 h-8 text-success-600 dark:text-success-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                We've sent a password reset link to:
              </p>
              <p className="font-medium text-gray-900 dark:text-white mb-6">{email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Didn't receive the email? Check your spam folder or{' '}
                <button onClick={() => setSent(false)} className="text-primary-600 hover:text-primary-700 font-medium">try again</button>
              </p>
              <Link to="/login" className="btn-secondary inline-flex items-center gap-2">
                <FiArrowLeft className="w-4 h-4" /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
