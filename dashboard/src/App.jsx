import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  onSnapshot,
  where,
} from 'firebase/firestore';

import { db, firebaseReady } from './firebase';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import './App.css';
import AlertMap from './AlertMap';

// ============================================================
// COUNT-UP HOOK — animates displayed number when value changes
// ============================================================
function useCountUp(target, duration = 650) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const start = prevRef.current;
    if (start === target) return;
    let raf;
    const startTime = performance.now();
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      setDisplay(Math.round(start + (target - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

/** Countdown color: green → amber → red */
function countdownColorClass(s) {
  if (s < 60)  return 'countdown-red';
  if (s < 300) return 'countdown-amber';
  return 'countdown-green';
}

// ============================================================
// AUTH GATE — wraps the whole dashboard
// ============================================================
function AuthGate() {
  const { user, loading, logout } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;
  return <Dashboard user={user} logout={logout} />;
}

// ============================================================
// LOADING SCREEN
// ============================================================
function LoadingScreen() {
  return (
    <div className="auth-loading">
      <div className="auth-loading-inner">
        <span className="auth-loading-shield">🛡️</span>
        <h2>SheShield</h2>
        <div className="auth-spinner" aria-label="Loading dashboard" />
        <p>Verifying authentication…</p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
function Dashboard({ user, logout }) {
  const [alerts, setAlerts] = useState([]);
  const [guardianSessions, setGuardianSessions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeCardPulse, setActiveCardPulse] = useState(false);
  const [firestoreError, setFirestoreError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const prevActiveRef = useRef(0);

  useEffect(() => {
    // Use a simple collection snapshot without orderBy to avoid requiring a
    // Firestore composite index that may not exist. We sort on the client instead.
    const q = query(collection(db, 'alerts'));
    return onSnapshot(
      q,
      (snapshot) => {
        setFirestoreError(null);
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Sort newest-first on the client; handle both Timestamp and string values
        docs.sort((a, b) => {
          const ta = a.created_at?.toMillis?.() ?? new Date(a.created_at ?? 0).getTime();
          const tb = b.created_at?.toMillis?.() ?? new Date(b.created_at ?? 0).getTime();
          return tb - ta;
        });
        setAlerts(docs);
      },
      (err) => {
        console.error('Alerts snapshot error:', err);
        setFirestoreError('Firestore read error: ' + err.message + '. Check security rules.');
      },
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'guardian_sessions'), where('status', '==', 'active'));
    return onSnapshot(
      q,
      (snapshot) => {
        setGuardianSessions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        console.error('Guardian sessions snapshot error:', err);
      },
    );
  }, []);

  const activeAlerts    = alerts.filter((a) => a.status === 'active').length;
  const resolvedAlerts  = alerts.filter((a) => a.status === 'resolved').length;
  const totalAlerts     = alerts.length;
  const activeGuardians = guardianSessions.length;

  // Count-up display values
  const displayActive   = useCountUp(activeAlerts);
  const displayGuardian = useCountUp(activeGuardians);
  const displayTotal    = useCountUp(totalAlerts);
  const displayResolved = useCountUp(resolvedAlerts);

  // Pulse active card when a new alert arrives
  useEffect(() => {
    if (activeAlerts > prevActiveRef.current) {
      setActiveCardPulse(true);
      const t = setTimeout(() => setActiveCardPulse(false), 1600);
      return () => clearTimeout(t);
    }
    prevActiveRef.current = activeAlerts;
  }, [activeAlerts]);

  async function handleLogout() {
    if (!window.confirm('Sign out of the ICCC Dashboard?')) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  }

  async function handleResolve(alertId) {
    if (!window.confirm('Mark this alert as resolved?')) return;
    setResolvingId(alertId);
    try {
      const res = await fetch('http://localhost:5000/api/alerts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Failed to resolve: ' + (err.error || res.status));
      }
    } catch (e) {
      alert('Network error: ' + e.message);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="dashboard-root">
      {/* ─── HEADER ─── */}
      <div className="dashboard-header">
        <div>
          <div className="brand-row">
            <span className="shield-icon">🛡️</span>
            <h1>SheShield</h1>
            <span className="dashboard-label">ICCC DASHBOARD</span>
          </div>
          <p className="dashboard-subtitle">
            Integrated Command &amp; Control · Real-Time Women Safety Monitoring
          </p>
        </div>

        <div className="header-right">
          <div className="system-status">
            <span className="status-dot" />
            SYSTEM ONLINE
          </div>
          <div className="user-info">
            <span className="user-email" title={user.email}>{user.email}</span>
            <button
              id="logout-btn"
              className="logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Sign out"
            >
              {loggingOut ? <span className="btn-spinner" /> : '⏏ Sign Out'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── FIRESTORE ERROR BANNER ─── */}
      {firestoreError && (
        <div className="firestore-error-banner">
          ⚠️ <strong>Dashboard Connection Error:</strong> {firestoreError}
        </div>
      )}

      {/* ─── STATS GRID ─── */}
      <div className="stats-grid">
        <div className={`stat-card active-card${activeCardPulse ? ' pulse-new' : ''}`}>
          <div className="stat-icon">🚨</div>
          <div className="stat-info">
            <div className="stat-label">Active Now</div>
            <div className="stat-number">{displayActive}</div>
            <div className="stat-description">Emergencies</div>
          </div>
        </div>
        <div className="stat-card guardian-card">
          <div className="stat-icon">🛡️</div>
          <div className="stat-info">
            <div className="stat-label">Guardian Mode</div>
            <div className="stat-number">{displayGuardian}</div>
            <div className="stat-description">Active Sessions</div>
          </div>
        </div>
        <div className="stat-card total-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-label">Total</div>
            <div className="stat-number">{displayTotal}</div>
            <div className="stat-description">All Incidents</div>
          </div>
        </div>
        <div className="stat-card resolved-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-label">Resolved</div>
            <div className="stat-number">{displayResolved}</div>
            <div className="stat-description">Closed Cases</div>
          </div>
        </div>
      </div>

      {/* ─── GUARDIAN SESSIONS ─── */}
      <div className="section-block">
        <h2 className="section-title">🛡️ Guardian Sessions</h2>
        {guardianSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <p className="empty-title">No active Guardian sessions right now</p>
            <span className="empty-sub">When a user activates Guardian Mode, their session will appear here live.</span>
          </div>
        ) : (
          <div className="guardian-grid">
            {guardianSessions.map((session) => (
              <GuardianCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* ─── INCIDENT MONITORING ─── */}
      <div className="incident-section">
        <div className="section-heading">
          <div>
            <h2>🚨 Emergency Alerts</h2>
            <p>Live incident map and alert feed</p>
          </div>
          <span className="live-badge">Live</span>
        </div>

        <div className="incident-layout">
          {/* MAP */}
          <div className="map-panel">
            <div className="panel-header">
              <div>
                <h3>🗺️ Live Incident Map</h3>
                <span>Real-time location monitoring</span>
              </div>
              <div className="map-controls">
                <button className="focus-all-button" onClick={() => setSelectedLocation(null)}>
                  ⛶ Focus All
                </button>
                <span className="map-status">● LIVE</span>
              </div>
            </div>
            <AlertMap alerts={alerts} guardianSessions={guardianSessions} selectedLocation={selectedLocation} />
          </div>

          {/* ALERT LIST */}
          <div className="alerts-panel">
            <div className="panel-header">
              <div>
                <h3>Emergency Alerts</h3>
                <span>Latest incidents</span>
              </div>
              <span className="alert-count">{activeAlerts} ACTIVE</span>
            </div>

            <div className="alert-list">
              {alerts.length === 0 ? (
                <div className="empty-alerts">
                  <div>✅</div>
                  <p>All clear — no alerts</p>
                  <span>The system is actively monitoring for incidents.</span>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0, padding: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      layout
                      className={`alert-item ${alert.status === 'active' ? 'alert-active' : 'alert-resolved'}`}
                      onClick={() => {
                        if (alert.latitude !== undefined && alert.longitude !== undefined) {
                          setSelectedLocation({ latitude: alert.latitude, longitude: alert.longitude });
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedLocation({ latitude: alert.latitude, longitude: alert.longitude })}
                    >
                      <div className="alert-top">
                        <div className="alert-status">
                          <span className={`alert-dot ${alert.status === 'active' ? 'dot-active' : 'dot-resolved'}`} />
                          <strong>{alert.status?.toUpperCase() || 'UNKNOWN'}</strong>
                        </div>
                        <span className="trigger-type">{alert.trigger_type || 'Emergency'}</span>
                      </div>

                      <div className="alert-body">
                        <div className="alert-user">👤 {alert.user_id || 'Unknown User'}</div>
                        <div className="alert-location">
                          📍{' '}
                          {alert.latitude !== undefined && alert.longitude !== undefined
                            ? `${Number(alert.latitude).toFixed(5)}, ${Number(alert.longitude).toFixed(5)}`
                            : 'Location unavailable'}
                        </div>
                        {alert.nearest_police && (
                          <div className="resource-info">🚔 {alert.nearest_police.name}</div>
                        )}
                        {alert.nearest_hospital && (
                          <div className="resource-info">🏥 {alert.nearest_hospital.name}</div>
                        )}
                        <div className="alert-time">
                          🕐 {alert.created_at?.toDate
                            ? alert.created_at.toDate().toLocaleString()
                            : alert.created_at
                              ? new Date(alert.created_at).toLocaleString()
                              : 'Just now'}
                        </div>
                      </div>

                      <div className="alert-buttons">
                        <button
                          className="view-map-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (alert.latitude !== undefined && alert.longitude !== undefined) {
                              window.open(`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`, '_blank');
                            }
                          }}
                        >
                          📍 View on Google Maps
                        </button>
                        {alert.status === 'active' && (
                          <button
                            className="resolve-button"
                            disabled={resolvingId === alert.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(alert.id);
                            }}
                          >
                            {resolvingId === alert.id ? '⏳ Resolving…' : '✅ Mark Resolved'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GUARDIAN CARD
// ============================================================
function GuardianCard({ session }) {
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSeconds(session.expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(session.expiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [session.expiresAt]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const cdClass = countdownColorClass(remainingSeconds);

  return (
    <div className="guardian-card-item">
      <div className="guardian-card-header">
        <span className="guardian-live-badge">🟢 GUARDIAN MODE ACTIVE</span>
        <span className="guardian-live-pill">LIVE</span>
      </div>
      <div className="guardian-details">
        <p><strong>User:</strong> {session.userId}</p>
        <p><strong>Guardian:</strong> {session.guardianName}</p>
        <p><strong>Phone:</strong> {session.guardianPhone}</p>
      </div>
      <div className="guardian-location-box">
        <h4>📍 Live Location</h4>
        <p>Latitude: {Number(session.latitude).toFixed(6)}</p>
        <p>Longitude: {Number(session.longitude).toFixed(6)}</p>
        <p className="guardian-update-time">Last updated: {formatDate(session.lastLocationUpdate)}</p>
      </div>
      <div className="guardian-timer-box">
        <div className="guardian-timer-label">TIME REMAINING</div>
        <div className={`guardian-timer ${cdClass}`}>{formattedTime}</div>
      </div>
      <button
        className="guardian-map-btn"
        onClick={() => window.open(`https://www.google.com/maps?q=${session.latitude},${session.longitude}`, '_blank')}
      >
        📍 View Location on Map
      </button>
    </div>
  );
}

function getRemainingSeconds(expiresAt) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatDate(date) {
  if (!date) return 'Unknown';
  return new Date(date).toLocaleString();
}

// ============================================================
// ROOT EXPORT — wraps with AuthProvider
// ============================================================
export default function App() {
  if (!firebaseReady) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif', padding: '2rem'
      }}>
        <div style={{
          background: '#1e293b', borderRadius: '16px', padding: '2.5rem',
          maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid #334155'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h1 style={{ color: '#e11d48', marginBottom: '0.5rem' }}>SheShield Setup Required</h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            Firebase API keys are missing. Please add them to your <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '4px', color: '#f472b6' }}>.env</code> file.
          </p>
          <div style={{
            background: '#0f172a', borderRadius: '8px', padding: '1rem',
            textAlign: 'left', fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace'
          }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>dashboard/.env</div>
            <div>VITE_FIREBASE_API_KEY=<span style={{ color: '#f472b6' }}>your_api_key</span></div>
            <div>VITE_FIREBASE_APP_ID=<span style={{ color: '#f472b6' }}>your_app_id</span></div>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1rem' }}>
            Firebase Console → Project Settings → Your Apps → Web App Config
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}