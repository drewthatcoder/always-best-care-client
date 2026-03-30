import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../supabase';

export default function ProfileScreen({ navigation }) {
  async function handleLogout() {
    await supabase.auth.signOut();
    navigation.replace('Login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>Client Account</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#2563eb', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 14, color: '#64748b' },
  value: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },
  logoutButton: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});