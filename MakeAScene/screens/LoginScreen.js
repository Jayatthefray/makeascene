import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Video } from 'expo-av';
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    await signIn(email, password);
    setSubmitting(false);
  };

  return (
    <View style={styles.container}>
      <Video
        source={require('../assets/splash.mp4')}
        style={styles.backgroundVideo}
        shouldPlay
        isLooping
        isMuted
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <Text style={styles.header}>Sign In</Text>
        {error && <Text style={styles.error}>{error.message || error}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting || loading}>
          {submitting || loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundVideo: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, color: '#ffffff' },
  input: { width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  error: { color: '#ff6b6b', marginBottom: 12, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: 8, borderRadius: 4 },
}); 