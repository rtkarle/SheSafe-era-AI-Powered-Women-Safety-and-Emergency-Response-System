import { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, ScrollView,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';

type Mode = 'login' | 'signup' | 'reset';

function getFirebaseError(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    case 'auth/invalid-credential': return 'Invalid email or password.';
    default: return 'Something went wrong. Please try again.';
  }
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function clearMessages() { setError(null); setSuccess(null); }

  async function handleLogin() {
    clearMessages();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    clearMessages();
    if (!email.trim() || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    clearMessages();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode); clearMessages(); setPassword(''); setConfirmPassword('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle='dark-content' backgroundColor={Colors.bg} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand header ── */}
          <View style={styles.header}>
            <View style={styles.shieldWrap}>
              <Ionicons name='shield-checkmark' size={42} color={Colors.berry} />
            </View>
            <Text style={styles.logoText}>SheShield</Text>
            <Text style={styles.tagline}>Women Safety & Emergency Response</Text>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>

            {mode !== 'reset' && (
              <View style={styles.tabs}>
                <TouchableOpacity
                  style={[styles.tab, mode === 'login' && styles.tabActive]}
                  onPress={() => switchMode('login')}
                  accessibilityRole='tab'
                >
                  <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, mode === 'signup' && styles.tabActive]}
                  onPress={() => switchMode('signup')}
                  accessibilityRole='tab'
                >
                  <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === 'reset' && (
              <TouchableOpacity style={styles.backRow} onPress={() => switchMode('login')}>
                <Ionicons name='arrow-back' size={18} color={Colors.textSecondary} />
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.cardTitle}>
              {mode === 'login' ? 'Welcome back 👋' : mode === 'signup' ? 'Create account' : 'Reset Password'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'login'
                ? 'Sign in to access SheShield'
                : mode === 'signup'
                  ? 'Join SheShield to stay protected'
                  : 'Enter your email to receive a reset link'}
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name='alert-circle' size={16} color={Colors.emergency} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={styles.successBox}>
                <Ionicons name='checkmark-circle' size={16} color={Colors.guardian} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputRow}>
                <Ionicons name='mail-outline' size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder='you@email.com'
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoComplete='email'
                  editable={!loading}
                  accessibilityLabel='Email address'
                />
              </View>
            </View>

            {/* Password */}
            {mode !== 'reset' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name='lock-closed-outline' size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder='At least 6 characters'
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    editable={!loading}
                    accessibilityLabel='Password'
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Confirm Password */}
            {mode === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirm password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name='lock-closed-outline' size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder='Repeat your password'
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    accessibilityLabel='Confirm password'
                  />
                </View>
              </View>
            )}

            {mode === 'login' && (
              <TouchableOpacity style={styles.forgotLink} onPress={() => switchMode('reset')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignUp : handleReset}
              disabled={loading}
              accessibilityRole='button'
            >
              {loading
                ? <ActivityIndicator color='#fff' size='small' />
                : <Text style={styles.submitText}>
                  {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
                </Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>🔒 Your data is secure and private</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xxl,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  shieldWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.berrySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(124,51,85,0.2)',
    ...Shadows.md,
  },
  logoText: {
    fontSize: 32,
    fontWeight: Typography.black,
    color: Colors.berryDark,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.lg,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.xl,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  tabActive: {
    backgroundColor: Colors.berry,
    ...Shadows.berry,
  },
  tabText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textMuted },
  tabTextActive: { color: '#fff' },

  // Back
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.base },
  backText: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: Typography.semibold },

  // Titles
  cardTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.extrabold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    fontWeight: Typography.medium,
  },

  // Banners
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.emergencyBg,
    borderWidth: 1,
    borderColor: Colors.emergencyBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorText: { flex: 1, color: Colors.emergency, fontSize: Typography.sm, fontWeight: Typography.semibold },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.guardianBg,
    borderWidth: 1,
    borderColor: Colors.guardianBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  successText: { flex: 1, color: Colors.guardian, fontSize: Typography.sm, fontWeight: Typography.semibold },

  // Fields
  fieldGroup: { marginBottom: Spacing.md },
  label: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textSecondary, marginBottom: 7 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 50, color: Colors.textPrimary, fontSize: Typography.base, fontWeight: Typography.semibold },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 8 },

  forgotLink: { alignSelf: 'flex-end', marginBottom: Spacing.lg, marginTop: 2 },
  forgotText: { color: Colors.berry, fontSize: Typography.sm, fontWeight: Typography.bold },

  submitBtn: {
    backgroundColor: Colors.berry,
    borderRadius: Radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.berry,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.extrabold, letterSpacing: 0.3 },

  footer: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: Typography.xs,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
});
