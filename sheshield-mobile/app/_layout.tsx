import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Colors, Typography } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = loading
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user === undefined) return; // still loading

    const inAuthGroup = String(segments[0]) === 'auth';

    if (!user && !inAuthGroup) {
      // Not logged in — redirect to auth screen
      router.replace('/auth' as never);
    } else if (user && inAuthGroup) {
      // Logged in — redirect to home
      router.replace('/' as never);
    }
  }, [user, segments]);

  // Splash loading state while Firebase resolves auth
  if (user === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name='shield-checkmark' size={52} color={Colors.gold} />
        <Text style={styles.loadingBrand}>SheShield</Text>
        <ActivityIndicator color={Colors.gold} size='large' style={styles.spinner} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='index' />
      <Stack.Screen name='auth' />
      <Stack.Screen name='fake-call' />
      <Stack.Screen name='contacts' />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.berry,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingBrand: {
    color: '#fff',
    fontSize: Typography.xl,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 16,
  },
});
