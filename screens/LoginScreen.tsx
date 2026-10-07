import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

const COLORS = {
  primary: '#3D52A0',
  accent: '#7091E6',
  background: '#FFFFFF',
  surface: '#F8F9FF',
  border: '#E2E5F1',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  white: '#FFFFFF',
};

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Please enter your email and password');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      navigation.replace('Main');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.logoWrap}>
            <Text style={s.logoSymbol}>△</Text>
            <Text style={s.logoText}>Always Best Care®</Text>
            <Text style={s.logoSub}>senior services</Text>
          </View>

          <Text style={s.title}>Client Login</Text>
          <Text style={s.subtitle}>Sign in to access your care dashboard</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="next"
          />

          <Text style={s.label}>Password</Text>
          <View style={s.passWrap}>
            <TextInput
              style={s.passInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
              <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={s.loginBtnText}>Log In</Text>
            }
          </TouchableOpacity>

          <Text style={s.footer}>Powered by Care-On-Demand</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  container:    { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 60 },
  logoWrap:     { alignItems: 'center', marginBottom: 32 },
  logoSymbol:   { fontSize: 40, color: COLORS.primary },
  logoText:     { fontSize: 18, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  logoSub:      { fontSize: 12, color: COLORS.accent },
  title:        { fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 4 },
  subtitle:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 28 },
  label:        { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
  input:        { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  passWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
  passInput:    { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 14 },
  eyeBtn:       { padding: 8 },
  eyeIcon:      { fontSize: 18 },
  loginBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  loginBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  footer:       { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 24 },
});

export default LoginScreen;