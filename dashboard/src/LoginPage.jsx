/**
 * SheShield Dashboard — Login Page
 * Email + Password auth with Sign Up, Login, and Forgot Password modes.
 */
import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebase';

function getFirebaseError(code) {
  switch (code) {
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/user-not-found': return 'No account found with this email address.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential': return 'Invalid email or password.';
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your internet connection.';
    default: return 'Something went wrong. Please try again.';
  }
}

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  function clearMessages() { setError(null); setSuccess(null); }

  function switchMode(newMode) {
    setMode(newMode);
    clearMessages();
    setPassword('');
    setConfirmPassword('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    clearMessages();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignUp : handleReset;

  return (
    <div className="login-page">
      <div className="login-bg-overlay" />

      <div className="login-container">
        {/* Brand */}
        <div className="login-brand">
          <span className="login-shield-icon">🛡️</span>
          <h1 className="login-title">SheShield</h1>
          <span className="login-iccc-badge">ICCC DASHBOARD</span>
        </div>
        <p className="login-tagline">Integrated Command &amp; Control · Women Safety Monitoring</p>

        {/* Card */}
        <div className="login-card">
          {/* Mode tabs */}
          {mode !== 'reset' && (
            <div className="login-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'login'}
                className={`login-tab ${mode === 'login' ? 'login-tab-active' : ''}`}
                onClick={() => switchMode('login')}
                type="button"
              >
                Sign In
              </button>
              <button
                role="tab"
                aria-selected={mode === 'signup'}
                className={`login-tab ${mode === 'signup' ? 'login-tab-active' : ''}`}
                onClick={() => switchMode('signup')}
                type="button"
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <button className="login-back-btn" onClick={() => switchMode('login')} type="button">
              ← Back to Sign In
            </button>
          )}

          <h2 className="login-card-title">
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset Password'}
          </h2>
          <p className="login-card-sub">
            {mode === 'login'
              ? 'Sign in to access the SheShield ICCC dashboard'
              : mode === 'signup'
              ? 'Create an account to access the monitoring dashboard'
              : 'Enter your email to receive a password reset link'}
          </p>

          {/* Messages */}
          {error && (
            <div className="login-alert login-alert-error" role="alert">
              <span className="login-alert-icon">⚠</span>
              {error}
            </div>
          )}
          {success && (
            <div className="login-alert login-alert-success" role="status">
              <span className="login-alert-icon">✓</span>
              {success}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            {/* Email */}
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                className="login-input"
                type="email"
                placeholder="operator@sheshield.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            {/* Password */}
            {mode !== 'reset' && (
              <div className="login-field">
                <label className="login-label" htmlFor="login-password">Password</label>
                <div className="login-input-group">
                  <input
                    id="login-password"
                    className="login-input login-input-with-btn"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            {mode === 'signup' && (
              <div className="login-field">
                <label className="login-label" htmlFor="login-confirm">Confirm Password</label>
                <input
                  id="login-confirm"
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
              </div>
            )}

            {/* Forgot password */}
            {mode === 'login' && (
              <div className="login-forgot-row">
                <button type="button" className="login-forgot-btn" onClick={() => switchMode('reset')}>
                  Forgot password?
                </button>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              className={`login-submit ${loading ? 'login-submit-loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner" aria-label="Loading" />
              ) : (
                mode === 'login' ? 'Sign In to Dashboard' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'
              )}
            </button>
          </form>
        </div>

        <p className="login-footer">
          🔒 Secured by Firebase Authentication · SheShield ICCC v1.0
        </p>
      </div>
    </div>
  );
}
