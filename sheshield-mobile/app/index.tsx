import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
  SafeAreaView, StatusBar, ActivityIndicator, Pressable,
  Linking, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring, withDelay, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import * as SMS from 'expo-sms';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import { API_URL } from '../constants/config';

const B = {
  berry: '#7C3355',
  danger: '#C62828',
  success: '#2E7D32',
  amber: '#D97706',
  gold: '#B8892A',
};

function countdownColor(s: number | null) {
  if (s === null) return B.success;
  if (s < 60) return B.danger;
  if (s < 300) return B.amber;
  return B.success;
}

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function Index() {
  const [sending, setSending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [guardianSessionId, setGuardianSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid ?? 'anonymous';
  const userEmail = currentUser?.email ?? '';
  const displayName = userEmail ? userEmail.split('@')[0] : 'User';

  // ── Animations ─────────────────────────────────────────────
  const pulse1 = useSharedValue(1);
  const pulse1Op = useSharedValue(0.4);
  const pulse2 = useSharedValue(1);
  const pulse2Op = useSharedValue(0.25);
  const breathe = useSharedValue(1);
  const press = useSharedValue(1);

  useEffect(() => {
    const ring = (scale: any, opacity: any, delay = 0) => {
      scale.value = withDelay(delay, withRepeat(withSequence(
        withTiming(1.3, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ), -1, false));
      opacity.value = withDelay(delay, withRepeat(withSequence(
        withTiming(0, { duration: 1200, easing: Easing.in(Easing.ease) }),
        withTiming(delay ? 0.25 : 0.4, { duration: 0 }),
      ), -1, false));
    };
    ring(pulse1, pulse1Op, 0);
    ring(pulse2, pulse2Op, 450);
    breathe.value = withRepeat(withSequence(
      withTiming(1.04, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.00, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
    ), -1, false);
  }, []);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: pulse1.value }], opacity: pulse1Op.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: pulse2.value }], opacity: pulse2Op.value }));
  const btnStyle   = useAnimatedStyle(() => ({ transform: [{ scale: breathe.value * press.value }] }));

  const guardianTransY = useSharedValue(20);
  const guardianAlpha  = useSharedValue(0);
  const prevGuardian   = useRef<string | null>(null);
  useEffect(() => {
    if (guardianSessionId && !prevGuardian.current) {
      guardianTransY.value = withSpring(0, { damping: 18, stiffness: 180 });
      guardianAlpha.value  = withTiming(1, { duration: 350 });
    }
    prevGuardian.current = guardianSessionId;
  }, [guardianSessionId]);
  const guardianCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: guardianTransY.value }],
    opacity: guardianAlpha.value,
  }));

  // ── Shake ──────────────────────────────────────────────────
  const sosRef = useRef<() => void>(() => {});
  useEffect(() => { sosRef.current = triggerSOS; });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let last = 0;
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (mag > 2.5 && now - last > 3000) { last = now; sosRef.current(); }
    });
    Accelerometer.setUpdateInterval(200);
    return () => sub.remove();
  }, []);

  // ── Guardian ping ──────────────────────────────────────────
  useEffect(() => {
    if (!guardianSessionId) { setRemainingSeconds(null); return; }
    const id = setInterval(async () => {
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        fetch(`${API_URL}/api/guardian/location`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: guardianSessionId, latitude: coords.latitude, longitude: coords.longitude }),
        });
        const r = await fetch(`${API_URL}/api/guardian/${guardianSessionId}`);
        const d = await r.json();
        if (d.success) setRemainingSeconds(d.session.remainingSeconds);
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, [guardianSessionId]);

  // ── Live SOS location ──────────────────────────────────────
  useEffect(() => {
    if (!activeAlertId) return;
    const id = setInterval(async () => {
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        fetch(`${API_URL}/api/alerts/location`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId: activeAlertId, latitude: coords.latitude, longitude: coords.longitude }),
        });
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, [activeAlertId]);

  // ── Notify contacts ────────────────────────────────────────
  async function notifyContacts(contacts: any[], lat: number, lng: number) {
    if (!contacts.length) return;
    const link = `https://maps.google.com/?q=${lat},${lng}`;
    const msg  = `🚨 SOS from SheShield!\nI need help. My location:\n${link}`;
    const phones = contacts.map((c: any) => c.phone).filter(Boolean);
    const ok = await SMS.isAvailableAsync();
    if (ok && phones.length) await SMS.sendSMSAsync(phones, msg);
    if (phones[0]) setTimeout(() => Linking.openURL(`tel:${phones[0]}`), 1500);
  }

  // ── SOS ────────────────────────────────────────────────────
  async function triggerSOS() {
    if (sending) return;
    setSending(true);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Location access required.'); return; }
      const { coords } = await Location.getCurrentPositionAsync({});
      setLocating(false);

      let contacts: any[] = [];
      try { const r = await fetch(`${API_URL}/api/contacts/${userId}`); if (r.ok) contacts = await r.json(); } catch {}

      fetch(`${API_URL}/api/alerts/trigger`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, trigger_type: 'button', latitude: coords.latitude, longitude: coords.longitude }),
      }).then(async r => { if (r.ok) { const d = await r.json(); setActiveAlertId(d.alertId); } }).catch(() => {});

      if (contacts.length) {
        await notifyContacts(contacts, coords.latitude, coords.longitude);
        Alert.alert('🚨 SOS Sent', `SMS → ${contacts.length} contact${contacts.length > 1 ? 's' : ''}\n📞 Calling ${contacts[0].name}…`);
      } else {
        Alert.alert('🚨 SOS Sent', 'Alert triggered. Add contacts to enable calls & SMS.');
      }
    } catch {
      setLocating(false);
      Alert.alert('SOS Failed', 'Could not send. Please call for help manually.');
    } finally { setSending(false); setLocating(false); }
  }

  // ── Guardian ───────────────────────────────────────────────
  async function startGuardianMode() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Location access required.'); return; }
    let guardianId = '', guardianPhone = '', gName = '';
    try {
      const r = await fetch(`${API_URL}/api/contacts/${userId}`);
      if (!r.ok) throw new Error();
      const c = await r.json();
      if (!c.length) { Alert.alert('No Contact', 'Add an emergency contact first.'); return; }
      guardianId = c[0].id; guardianPhone = c[0].phone; gName = c[0].name;
    } catch { Alert.alert('Error', 'Could not fetch contacts.'); return; }
    try {
      const { coords } = await Location.getCurrentPositionAsync({});
      const r = await fetch(`${API_URL}/api/guardian/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, guardianId, durationMinutes: 45, latitude: coords.latitude, longitude: coords.longitude }),
      });
      const d = await r.json();
      if (d.success) {
        setGuardianSessionId(d.sessionId);
        Alert.alert('🛡️ Guardian Active', `Sharing location with ${d.guardianName} for 45 min.`, [
          { text: 'OK' },
          { text: `📞 Call ${d.guardianName}`, onPress: () => guardianPhone && Linking.openURL(`tel:${guardianPhone}`) },
        ]);
      } else Alert.alert('Error', d.error || 'Failed to start Guardian Mode');
    } catch { Alert.alert('Error', 'Could not reach server.'); }
  }

  async function endGuardianMode() {
    if (!guardianSessionId) return;
    try {
      await fetch(`${API_URL}/api/guardian/end`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: guardianSessionId }),
      });
    } catch {}
    setGuardianSessionId(null);
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Sign out of SheShield?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        setLoggingOut(true);
        try { if (guardianSessionId) await endGuardianMode(); await signOut(auth); }
        catch { setLoggingOut(false); }
      }},
    ]);
  }

  const cdColor = countdownColor(remainingSeconds);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={B.berry} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <Text style={s.headerTitle}>SheShield</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/contacts')}>
            <Ionicons name="people-outline" size={19} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/fake-call')}>
            <Ionicons name="call-outline" size={19} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={handleLogout} disabled={loggingOut}>
            {loggingOut
              ? <ActivityIndicator size="small" color="rgba(255,255,255,0.85)" />
              : <Ionicons name="log-out-outline" size={19} color="rgba(255,255,255,0.85)" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── User strip ── */}
      <View style={s.userStrip}>
        <View style={s.avatar}><Text style={s.avatarTxt}>{displayName[0]?.toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.userName}>{displayName}</Text>
          <Text style={s.userSub}>You are protected</Text>
        </View>
        <View style={s.onlineBadge}>
          <View style={s.onlineDot} />
          <Text style={s.onlineTxt}>Online</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Status banners ── */}
        {activeAlertId && (
          <View style={s.sosBanner}>
            <Ionicons name="warning" size={15} color={B.danger} />
            <Text style={s.sosBannerTxt}>SOS Active — Broadcasting Location</Text>
            <View style={s.pulseDot} />
          </View>
        )}
        {guardianSessionId && remainingSeconds !== null && (
          <View style={[s.guardianBanner, { borderColor: cdColor + '55' }]}>
            <Ionicons name="shield-checkmark" size={15} color={cdColor} />
            <Text style={[s.guardianBannerTxt, { color: cdColor }]}>
              Guardian Active · {fmt(remainingSeconds)}
            </Text>
            <View style={[s.pulseDot, { backgroundColor: cdColor }]} />
          </View>
        )}

        {/* ── SOS Button ── */}
        <View style={s.sosArea}>
          <Animated.View style={[s.ring, ring1Style]} />
          <Animated.View style={[s.ring, s.ring2, ring2Style]} />
          <Animated.View style={btnStyle}>
            <Pressable
              style={s.sosBtn}
              onPress={triggerSOS}
              onPressIn={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); press.value = withTiming(0.92, { duration: 90 }); }}
              onPressOut={() => { press.value = withSpring(1, { damping: 14, stiffness: 280 }); }}
              onLongPress={() => router.push('/fake-call')}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel={sending ? 'Sending SOS' : 'Send SOS'}
            >
              {sending ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" size="large" />
                  {locating && <Text style={s.sosLoadTxt}>Getting location…</Text>}
                </View>
              ) : (
                <>
                  <Ionicons name="warning" size={44} color="#fff" />
                  <Text style={s.sosTxt}>SOS</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <Text style={s.hint}>Tap to send emergency alert</Text>
        <Text style={s.hintSub}>Long-press → Fake call  ·  Shake → SOS</Text>

        {/* ── Quick actions ── */}
        <View style={s.quickRow}>
          <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/contacts')} activeOpacity={0.75}>
            <View style={[s.quickIcon, { backgroundColor: B.berry + '15' }]}>
              <Ionicons name="people" size={20} color={B.berry} />
            </View>
            <Text style={s.quickTxt}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => router.push('/fake-call')} activeOpacity={0.75}>
            <View style={[s.quickIcon, { backgroundColor: '#2563EB15' }]}>
              <Ionicons name="call" size={20} color="#2563EB" />
            </View>
            <Text style={s.quickTxt}>Fake Call</Text>
          </TouchableOpacity>
          {activeAlertId && (
            <TouchableOpacity
              style={s.quickBtn}
              onPress={() => {
                fetch(`${API_URL}/api/alerts/resolve`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ alertId: activeAlertId }),
                });
                setActiveAlertId(null);
              }}
              activeOpacity={0.75}
            >
              <View style={[s.quickIcon, { backgroundColor: B.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={20} color={B.success} />
              </View>
              <Text style={s.quickTxt}>Safe Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Guardian card ── */}
        <Animated.View style={[s.guardianCard, guardianSessionId && s.guardianCardActive, guardianCardStyle]}>
          <View style={s.guardianLeft}>
            <View style={[s.guardianIcon, guardianSessionId && { backgroundColor: B.success + '18', borderColor: B.success + '40' }]}>
              <Ionicons
                name={guardianSessionId ? 'shield-checkmark' : 'people-circle-outline'}
                size={26}
                color={guardianSessionId ? cdColor : Colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.guardianTitle}>Guardian Mode</Text>
              <Text style={[s.guardianSub, guardianSessionId && { color: cdColor }]}>
                {guardianSessionId
                  ? `Active · ${remainingSeconds !== null ? fmt(remainingSeconds) + ' remaining' : '...'}`
                  : 'Share live location with a trusted contact'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.guardianBtn, guardianSessionId ? { backgroundColor: B.danger } : { backgroundColor: B.success }]}
            onPress={guardianSessionId ? endGuardianMode : startGuardianMode}
            activeOpacity={0.8}
          >
            <Ionicons name={guardianSessionId ? 'stop' : 'play'} size={14} color="#fff" />
            <Text style={s.guardianBtnTxt}>{guardianSessionId ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Tips ── */}
        <View style={s.tipsRow}>
          <View style={s.tipCard}>
            <Text style={s.tipIcon}>📳</Text>
            <Text style={s.tipTxt}>Shake phone to trigger SOS</Text>
          </View>
          <View style={s.tipCard}>
            <Text style={s.tipIcon}>📞</Text>
            <Text style={s.tipTxt}>Long-press SOS for fake call</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: B.berry,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // User strip
  userStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: B.berry,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  userName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  userSub: { fontSize: 11, color: '#9999AA', marginTop: 1 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(46,125,50,0.1)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(46,125,50,0.25)',
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: B.success },
  onlineTxt: { fontSize: 11, color: B.success, fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16, alignItems: 'center' },

  // Banners
  sosBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(198,40,40,0.08)', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(198,40,40,0.25)',
    paddingHorizontal: 16, paddingVertical: 10,
    alignSelf: 'stretch', marginBottom: 12,
  },
  sosBannerTxt: { flex: 1, color: B.danger, fontWeight: '700', fontSize: 13 },
  guardianBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(46,125,50,0.08)', borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    alignSelf: 'stretch', marginBottom: 12,
  },
  guardianBannerTxt: { flex: 1, fontWeight: '700', fontSize: 13 },
  pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: B.danger },

  // SOS
  sosArea: {
    width: 240, height: 240,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 8,
  },
  ring: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: B.danger,
  },
  ring2: { width: 224, height: 224, borderRadius: 112 },
  sosBtn: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: B.danger,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: B.danger,
    shadowOpacity: 0.5, shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  sosTxt: { color: '#fff', fontSize: 40, fontWeight: '900', letterSpacing: 4, marginTop: 2 },
  sosLoadTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },

  hint: { color: '#55556A', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  hintSub: { color: '#9999AA', fontSize: 11, textAlign: 'center', marginTop: 2, marginBottom: 8 },

  // Quick actions
  quickRow: {
    flexDirection: 'row', gap: 12, alignSelf: 'stretch',
    marginVertical: 12, justifyContent: 'center',
  },
  quickBtn: { alignItems: 'center', gap: 6, flex: 1 },
  quickIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  quickTxt: { fontSize: 11, fontWeight: '700', color: '#55556A' },

  // Guardian card
  guardianCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
    padding: 16, alignSelf: 'stretch',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  guardianCardActive: { borderColor: 'rgba(46,125,50,0.3)', backgroundColor: 'rgba(46,125,50,0.04)' },
  guardianLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  guardianIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  guardianTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  guardianSub: { fontSize: 12, color: '#9999AA', marginTop: 2 },
  guardianBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 999,
  },
  guardianBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Tips
  tipsRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 12 },
  tipCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
  },
  tipIcon: { fontSize: 18 },
  tipTxt: { flex: 1, fontSize: 11, color: '#55556A', fontWeight: '600', lineHeight: 15 },
});
