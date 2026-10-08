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
import BrandLogo from '../components/BrandLogo';
import { supabase } from '../supabase';
import { errorText, friendlyAlertMessage } from '../userFacingError';

const COLORS = {
  primary: '#3D52A0',
  background: '#FFFFFF',
  surface: '#F8F9FF',
  border: '#E2E5F1',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  white: '#FFFFFF',
};

const SENT_MESSAGE = 'If an account exists for that email, we sent a reset code. Enter the code and a new password. It may take a minute to arrive.';

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Missing-account responses must look the same as a sent email. */
function hidesAccountExistence(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  if (code === 'user_not_found' || code === 'email_not_found') return true;
  return /user not found|email not found/i.test(errorText(error));
}

const ResetPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  const sendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!looksLikeEmail(cleanEmail)) {
      Alert.alert('Check the email', 'Enter the email address on the account.');
      return;
    }
    setEmail(cleanEmail);
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error && !hidesAccountExistence(error)) {
        Alert.alert('Could not send reset email', friendlyAlertMessage(error, 'Something went wrong. Try again.'));
        return;
      }
      setCode('');
      setVerified(false);
      setCodeSent(true);
      Alert.alert('Check your email', SENT_MESSAGE);
    } catch (err: unknown) {
      Alert.alert('Could not send reset email', friendlyAlertMessage(err, 'Something went wrong. Try again.'));
    } finally {
      setSending(false);
    }
  };

  const backToLogin = async () => {
    if (verified) await supabase.auth.signOut();
    navigation.goBack();
  };

  const useDifferentEmail = async () => {
    if (verified) await supabase.auth.signOut();
    setVerified(false);
    setCode('');
    setPassword('');
    setConfirm('');
    setCodeSent(false);
  };

  const savePassword = async () => {
    const token = code.trim();
    if (!verified && !token) {
      Alert.alert('Enter the code', 'Enter the code from the reset email.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Enter the same password in both fields.');
      return;
    }
    setSaving(true);
    try {
      if (!verified) {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'recovery',
        });
        if (error) {
          Alert.alert('Could not verify code', friendlyAlertMessage(error, 'That code did not work. Request a new one and try again.'));
          return;
        }
        setVerified(true);
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        Alert.alert('Could not update password', friendlyAlertMessage(updateError, 'The password was not changed. Try again.'));
        return;
      }
      Alert.alert('Password updated', 'You are signed in with your new password.');
      navigation.replace('Main');
    } catch (err: unknown) {
      Alert.alert('Could not update password', friendlyAlertMessage(err, 'The password was not changed. Try again.'));
    } finally {
      setSaving(false);
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
            <BrandLogo width={220} />
          </View>

          <Text style={s.title}>Reset password</Text>
          <Text style={s.subtitle}>
            {codeSent
              ? SENT_MESSAGE
              : 'Enter the email on your account and we will send a reset code.'}
          </Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your email"
            placeholderTextColor={COLORS.textMuted}
            editable={!codeSent && !sending}
            returnKeyType="done"
            onSubmitEditing={codeSent ? undefined : sendCode}
          />

          {codeSent ? (
            <>
              <Text style={s.label}>Reset code</Text>
              <TextInput
                style={s.input}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Code from the email"
                placeholderTextColor={COLORS.textMuted}
                editable={!verified && !saving}
              />

              <Text style={s.label}>New password</Text>
              <View style={s.passWrap}>
                <TextInput
                  style={s.passInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.textMuted}
                  editable={!saving}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                  <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Confirm password</Text>
              <TextInput
                style={s.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPass}
                placeholder="Re-enter the new password"
                placeholderTextColor={COLORS.textMuted}
                editable={!saving}
              />

              <TouchableOpacity style={s.loginBtn} onPress={savePassword} disabled={saving || sending}>
                {saving
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={s.loginBtnText}>Set new password</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={sendCode} disabled={sending || saving}>
                <Text style={s.link}>{sending ? 'Sending...' : 'Send a new code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={useDifferentEmail} disabled={sending || saving}>
                <Text style={s.link}>Use a different email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={s.loginBtn} onPress={sendCode} disabled={sending}>
              {sending
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={s.loginBtnText}>Send reset code</Text>
              }
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={backToLogin} disabled={sending || saving}>
            <Text style={s.link}>Back to login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: COLORS.background },
  container:    { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 60 },
  logoWrap:     { alignItems: 'center', marginBottom: 28 },
  title:        { fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 4 },
  subtitle:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  label:        { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
  input:        { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  passWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  passInput:    { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 14 },
  eyeBtn:       { padding: 8 },
  eyeIcon:      { fontSize: 18 },
  loginBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  loginBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  link:         { textAlign: 'center', fontSize: 14, color: COLORS.primary, fontWeight: '600', marginBottom: 16 },
});

export default ResetPasswordScreen;
