import { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  FadeInUp,
  FadeIn,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '../constants/theme';

const BRAND = {
  berry: '#6D2E46',
  danger: '#C00000',
  success: '#2E7D32',
};

export default function FakeCall() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [answered, setAnswered] = useState(false);

  // ─── Two staggered avatar rings ──────────────────────────────────────
  const r1Scale = useSharedValue(1);
  const r1Opacity = useSharedValue(0.55);
  const r2Scale = useSharedValue(1);
  const r2Opacity = useSharedValue(0.35);

  useEffect(() => {
    if (answered) {
      // Stop rings gracefully
      r1Scale.value = withTiming(1, { duration: 400 });
      r1Opacity.value = withTiming(0, { duration: 400 });
      r2Scale.value = withTiming(1, { duration: 400 });
      r2Opacity.value = withTiming(0, { duration: 400 });
      return;
    }
    // Ring 1
    r1Scale.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 850, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ), -1, false,
    );
    r1Opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 850, easing: Easing.in(Easing.ease) }),
        withTiming(0.55, { duration: 0 }),
      ), -1, false,
    );
    // Ring 2, staggered 340 ms
    r2Scale.value = withDelay(340, withRepeat(
      withSequence(
        withTiming(1.45, { duration: 850, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ), -1, false,
    ));
    r2Opacity.value = withDelay(340, withRepeat(
      withSequence(
        withTiming(0, { duration: 850, easing: Easing.in(Easing.ease) }),
        withTiming(0.35, { duration: 0 }),
      ), -1, false,
    ));
  }, [answered]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: r1Scale.value }],
    opacity: r1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: r2Scale.value }],
    opacity: r2Opacity.value,
  }));

  // ─── Button press scale ───────────────────────────────────────────────
  const acceptScale = useSharedValue(1);
  const declineScale = useSharedValue(1);

  function onAcceptPressIn() {
    acceptScale.value = withTiming(0.91, { duration: 80 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  function onAcceptPressOut() { acceptScale.value = withSpring(1, { damping: 14 }); }
  function onDeclinePressIn() {
    declineScale.value = withTiming(0.91, { duration: 80 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
  function onDeclinePressOut() { declineScale.value = withSpring(1, { damping: 14 }); }

  const acceptAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: acceptScale.value }] }));
  const declineAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: declineScale.value }] }));

  // ─── Call timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!answered) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [answered]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return m + ':' + sec;
  }

  return (
    <View style={styles.container}>

      {/* Top label */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.topBar}>
        <View style={styles.topPill}>
          <Ionicons name='shield-checkmark' size={11} color={BRAND.berry} />
          <Text style={styles.topBarLabel}>SheShield · Safety Call</Text>
        </View>
      </Animated.View>

      {/* Caller info */}
      <Animated.View entering={FadeIn.delay(80).duration(500)} style={styles.callerArea}>
        {/* Pulsing avatar with two rings */}
        <View style={styles.avatarWrap}>
          {!answered && (
            <>
              <Animated.View style={[styles.avatarRing, styles.avatarRing1, ring1Style]} />
              <Animated.View style={[styles.avatarRing, styles.avatarRing2, ring2Style]} />
            </>
          )}
          <View style={styles.avatarCircle}>
            <Ionicons name='person' size={52} color={BRAND.berry} />
          </View>
        </View>

        <Text style={styles.callerName}>Mom</Text>
        <Text style={styles.callStatus}>
          {answered ? formatTime(seconds) : 'Incoming call…'}
        </Text>
        <Text style={styles.callSubtext}>Mobile · India</Text>
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.controls}>
        {!answered ? (
          <Animated.View entering={FadeInUp.delay(150).duration(450).springify()} style={styles.buttonRow}>
            {/* Decline */}
            <View style={styles.actionGroup}>
              <Animated.View style={declineAnimStyle}>
                <Pressable
                  onPressIn={onDeclinePressIn}
                  onPressOut={onDeclinePressOut}
                  onPress={() => router.back()}
                  style={[styles.callBtn, styles.declineBtn]}
                  accessibilityLabel='Decline call'
                >
                  <Ionicons name='call' size={28} color='#fff' style={{ transform: [{ rotate: '135deg' }] }} />
                </Pressable>
              </Animated.View>
              <Text style={styles.btnLabel}>Decline</Text>
            </View>

            {/* Remind */}
            <View style={styles.actionGroup}>
              <TouchableOpacity style={styles.utilBtn} activeOpacity={0.7} accessibilityLabel='Remind me'>
                <Ionicons name='time-outline' size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Remind</Text>
            </View>

            {/* Answer */}
            <View style={styles.actionGroup}>
              <Animated.View style={acceptAnimStyle}>
                <Pressable
                  onPressIn={onAcceptPressIn}
                  onPressOut={onAcceptPressOut}
                  onPress={() => setAnswered(true)}
                  style={[styles.callBtn, styles.acceptBtn]}
                  accessibilityLabel='Answer call'
                >
                  <Ionicons name='call' size={28} color='#fff' />
                </Pressable>
              </Animated.View>
              <Text style={styles.btnLabel}>Answer</Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.duration(350).springify()} style={styles.activeCallRow}>
            <View style={styles.actionGroup}>
              <TouchableOpacity style={styles.utilBtn} activeOpacity={0.7} accessibilityLabel='Mute'>
                <Ionicons name='mic-off' size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Mute</Text>
            </View>

            <View style={styles.actionGroup}>
              <Animated.View style={declineAnimStyle}>
                <Pressable
                  onPressIn={onDeclinePressIn}
                  onPressOut={onDeclinePressOut}
                  onPress={() => router.back()}
                  style={[styles.callBtn, styles.declineBtn, styles.endBtn]}
                  accessibilityLabel='End call'
                >
                  <Ionicons name='call' size={28} color='#fff' style={{ transform: [{ rotate: '135deg' }] }} />
                </Pressable>
              </Animated.View>
              <Text style={styles.btnLabel}>End</Text>
            </View>

            <View style={styles.actionGroup}>
              <TouchableOpacity style={styles.utilBtn} activeOpacity={0.7} accessibilityLabel='Speaker'>
                <Ionicons name='volume-high' size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.btnLabel}>Speaker</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
  },

  // Top
  topBar: { alignItems: 'center', paddingTop: Spacing.sm },
  topPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    ...Shadows.sm,
  },
  topBarLabel: {
    fontSize: Typography.xs, fontWeight: Typography.semibold,
    color: Colors.textMuted, letterSpacing: 0.4,
  },

  // Caller area
  callerArea: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xxl },
  avatarWrap: {
    width: 140, height: 140,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 999,
  },
  avatarRing1: {
    width: 135, height: 135,
    borderColor: BRAND.berry,
  },
  avatarRing2: {
    width: 140, height: 140,
    borderColor: BRAND.berry,
    opacity: 0.4,
  },
  avatarCircle: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: Colors.berrySubtle,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(109,46,70,0.2)',
    ...Shadows.md,
  },
  callerName: {
    color: Colors.textPrimary, fontSize: 38,
    fontWeight: Typography.black, marginTop: Spacing.sm, letterSpacing: -0.5,
  },
  callStatus: { color: Colors.textSecondary, fontSize: Typography.lg, fontWeight: Typography.semibold },
  callSubtext: { color: Colors.textMuted, fontSize: Typography.sm },

  // Controls
  controls: { paddingBottom: Spacing.xxl, paddingHorizontal: Spacing.xl },
  buttonRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
  },
  activeCallRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end',
  },
  actionGroup: { alignItems: 'center', gap: Spacing.sm },
  callBtn: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.md,
  },
  endBtn: { width: 76, height: 76, borderRadius: 38 },
  declineBtn: { backgroundColor: BRAND.danger },
  acceptBtn: { backgroundColor: BRAND.success, ...Shadows.guardian },
  utilBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  btnLabel: { color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: Typography.semibold },
});
