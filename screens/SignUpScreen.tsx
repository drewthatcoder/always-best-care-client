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

const COLORS = {
  primary: '#3D52A0',
  background: '#FFFFFF',
  surface: '#F8F9FF',
  border: '#E2E5F1',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  white: '#FFFFFF',
};

const extractZip = (value: string): string => {
  const match = value.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : '';
};

/**
 * Write name and zip onto the signed-in client's profiles row.
 * Update first so an existing row is reused. Insert only when none came back.
 */
async function saveClientProfile(
  userId: string,
  fields: { first_name: string; last_name: string; zip_code: string }
): Promise<string | null> {
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update(fields)
    .eq('user_id', userId)
    .select('id');
  if (updateError) return updateError.message || 'Could not save your profile.';
  if (updated && updated.length > 0) return null;

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: userId, ...fields });
  if (insertError) return insertError.message || 'Could not save your profile.';
  return null;
}

const SignUpScreen = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();
    const cleanAddress = address.trim();
    const cleanCity = city.trim();
    const cleanState = stateCode.trim();
    const cleanZip = extractZip(zip);

    if (!cleanFirst || !cleanLast) {
      Alert.alert('Name required', 'Enter your first and last name.');
      return;
    }
    if (!cleanEmail || !password) {
      Alert.alert('Account required', 'Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (!cleanPhone) {
      Alert.alert('Phone required', 'Enter a phone number.');
      return;
    }
    if (!cleanAddress || !cleanCity || !cleanState) {
      Alert.alert('Address required', 'Enter the street, city, and state where care will be provided.');
      return;
    }
    if (!cleanZip) {
      Alert.alert('Zip code required', 'Enter the 5-digit zip code for that address.');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            first_name: cleanFirst,
            last_name: cleanLast,
            phone: cleanPhone,
            address: cleanAddress,
            city: cleanCity,
            state: cleanState,
            zip_code: cleanZip,
          },
        },
      });
      if (error || !data.user) {
        Alert.alert('Could not create account', error?.message || 'Something went wrong.');
        return;
      }

      if (!data.session) {
        Alert.alert(
          'Confirm your email',
          'Your account was created. Confirm the email, then log in. Your name and zip code are saved with the account.'
        );
        navigation.navigate('Login');
        return;
      }

      const profileError = await saveClientProfile(data.user.id, {
        first_name: cleanFirst,
        last_name: cleanLast,
        zip_code: cleanZip,
      });
      if (profileError) {
        Alert.alert('Account created', `You are signed in, but the profile could not be saved. ${profileError}`);
        navigation.replace('Main');
        return;
      }

      navigation.replace('Main');
    } catch (err: any) {
      Alert.alert('Could not create account', err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
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

          <Text style={s.title}>Create Account</Text>
          <Text style={s.subtitle}>Tell us who you are and where care will be provided</Text>

          <Text style={s.label}>First name</Text>
          <TextInput
            style={s.input}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            placeholder="First name"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.label}>Last name</Text>
          <TextInput
            style={s.input}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            placeholder="Last name"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.label}>Password</Text>
          <View style={s.passWrap}>
            <TextInput
              style={s.passInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholder="At least 6 characters"
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
              <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Phone</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="(916) 555-0100"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.label}>Street address</Text>
          <TextInput
            style={s.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Street address"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.label}>City</Text>
          <TextInput
            style={s.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.label}>State</Text>
          <TextInput
            style={s.input}
            value={stateCode}
            onChangeText={setStateCode}
            autoCapitalize="characters"
            maxLength={2}
            placeholder="CA"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={s.label}>Zip code</Text>
          <TextInput
            style={s.input}
            value={zip}
            onChangeText={setZip}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="95814"
            placeholderTextColor={COLORS.textMuted}
          />

          <TouchableOpacity style={s.loginBtn} onPress={handleSignUp} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={s.loginBtnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
            <Text style={s.link}>Already have an account? Log in</Text>
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
  logoWrap:     { alignItems: 'center', marginBottom: 28 },
  title:        { fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 4 },
  subtitle:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 28 },
  label:        { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
  input:        { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  passWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  passInput:    { flex: 1, fontSize: 16, color: COLORS.text, paddingVertical: 14 },
  eyeBtn:       { padding: 8 },
  eyeIcon:      { fontSize: 18 },
  loginBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16, marginTop: 8 },
  loginBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  link:         { textAlign: 'center', fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  footer:       { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 24 },
});

export default SignUpScreen;
