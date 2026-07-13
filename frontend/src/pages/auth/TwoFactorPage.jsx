import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { verify2FA } from '../../store/slices/authSlice';
import { FiShield, FiArrowLeft, FiArrowRight, FiRefreshCw } from 'react-icons/fi';

export default function TwoFactorPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { requiresTwoFactor, tempToken, loading, error } = useSelector((state) => state.auth);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Redirect if no temp token
  useEffect(() => {
    if (!requiresTwoFactor || !tempToken) {
      navigate('/login', { replace: true });
    }
  }, [requiresTwoFactor, tempToken, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((digit, i) => { newOtp[i] = digit; });
    setOtp(newOtp);
    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return;
    dispatch(verify2FA({ tempToken, otp: otpString }));
  };

  const handleResend = () => {
    setCanResend(false);
    setTimeLeft(300);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    // TODO: Call resend OTP API
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!requiresTwoFactor || !tempToken) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md mx-4 animate-slide-up">
        <div className="card p-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Login
          </button>

          {/* Icon */}
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiShield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">
            Enter the verification code sent to your registered email or phone
          </p>

          {/* OTP Input */}
          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white
                  transition-all duration-200"
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg mb-4">
              <p className="text-sm text-danger-600 dark:text-danger-400 text-center">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || otp.join('').length !== 6}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 mb-4"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify & Sign In</span>
                <FiArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                <FiRefreshCw className="w-4 h-4" />
                Resend Code
              </button>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Resend code in <span className="font-medium text-gray-700 dark:text-gray-300">{formatTime(timeLeft)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
