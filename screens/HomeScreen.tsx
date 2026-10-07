import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { format } from 'date-fns';
import BrandLogo from '../components/BrandLogo';
import { supabase } from '../supabase';

// ── Colours ───────────────────────────────────────────────────────────────────
const COLORS = {
  primary:      '#3D52A0',
  primaryLight: 'rgba(61,82,160,0.1)',
  accent:       '#7091E6',
  background:   '#FFFFFF',
  surface:      '#F5F6FA',
  border:       '#E2E5F1',
  text:         '#1A1A2E',
  textMuted:    '#6B7280',
  white:        '#FFFFFF',
  success:      '#16A34A',
  successLight: '#DCFCE7',
  warning:      '#D97706',
  warningLight: '#FEF3C7',
  gradient1:    '#1a237e',
};

interface Booking {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service: string;
  status: string;
  provider_user_id: string | null;
}

const AGENCY_PHONE_DISPLAY = '(916) 884-1983';
const AGENCY_PHONE_TEL = 'tel:9168841983';

const callAgency = () => {
  Linking.openURL(AGENCY_PHONE_TEL).catch(() => {
    Alert.alert('Agency phone', AGENCY_PHONE_DISPLAY);
  });
};

interface Profile {
  first_name: string | null;
  last_name: string | null;
  zip_code: string | null;
}

const SERVICES = [
  { emoji: '🛁', name: 'Bathing & Grooming',    desc: 'Personal hygiene assistance' },
  { emoji: '👕', name: 'Dressing Assistance',   desc: 'Help with clothing and dressing' },
  { emoji: '♿', name: 'Transferring',           desc: 'Safe mobility assistance' },
  { emoji: '🚶', name: 'Walking Assistance',     desc: 'Support for safe movement' },
  { emoji: '🍽️', name: 'Meal Prep',              desc: 'Healthy meal planning & cooking' },
  { emoji: '🧹', name: 'Light Housekeeping',     desc: 'Cleaning and home organization' },
  { emoji: '💊', name: 'Medication Assistance',  desc: 'Timely medication management' },
  { emoji: '🚗', name: 'Transportation',         desc: 'Rides to appointments & errands' },
];

const HomeScreen = ({ navigation }: any) => {
  const [profile, setProfile]             = useState<Profile | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Fetch profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('first_name, last_name, zip_code')
      .eq('user_id', user.id)
      .single();
    setProfile(prof);

    // Fetch upcoming bookings
    const { data: bks } = await supabase
      .from('bookings')
      .select('id, scheduled_date, start_time, end_time, service, status, provider_user_id')
      .eq('client_user_id', user.id)
      .in('status', ['upcoming', 'approved', 'pending_client'])
      .order('scheduled_date', { ascending: true })
      .limit(3);
    setUpcomingBookings((bks || []) as Booking[]);

    // Fetch unread notifications count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('home-screen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return { bg: COLORS.successLight, text: COLORS.success };
    if (status === 'pending_client') return { bg: COLORS.warningLight, text: COLORS.warning };
    return { bg: COLORS.primaryLight, text: COLORS.primary };
  };

  const getStatusLabel = (status: string) => {
    if (status === 'approved') return '✅ Approved';
    if (status === 'pending_client') return '⏳ Needs Approval';
    return '📅 Upcoming';
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const firstName = profile?.first_name || 'there';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={s.scroll}
      >
        <View style={s.brandBar}>
          <BrandLogo width={200} />
        </View>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hello, {firstName}! 👋</Text>
            <Text style={s.subGreeting}>Welcome to Always Best Care</Text>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={s.notifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={s.quickActions}>
          <TouchableOpacity style={s.quickBtn} onPress={() => navigation.navigate('Booking')}>
            <Text style={s.quickBtnIcon}>📅</Text>
            <Text style={s.quickBtnText}>Book Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={s.quickBtnIcon}>👤</Text>
            <Text style={s.quickBtnText}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={s.quickBtnIcon}>🔔</Text>
            <Text style={s.quickBtnText}>Alerts</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming bookings */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Upcoming Bookings</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Booking')}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyTitle}>No upcoming bookings</Text>
              <Text style={s.emptyText}>Tap Book Now to schedule a visit</Text>
              <TouchableOpacity style={s.bookNowBtn} onPress={() => navigation.navigate('Booking')}>
                <Text style={s.bookNowBtnText}>Book a Visit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            upcomingBookings.map(b => {
              const statusColors = getStatusColor(b.status);
              return (
                <View key={b.id} style={s.bookingCard}>
                  <TouchableOpacity style={s.bookingCardLeft} onPress={() => navigation.navigate('Booking')}>
                    <Text style={s.bookingDate}>
                      {format(new Date(b.scheduled_date + 'T00:00:00'), 'EEE, MMM d')}
                    </Text>
                    <Text style={s.bookingTime}>{b.start_time} – {b.end_time}</Text>
                    <Text style={s.bookingService}>{b.service}</Text>
                  </TouchableOpacity>
                  <View style={s.bookingCardRight}>
                    {b.provider_user_id ? (
                      <TouchableOpacity style={s.callBtn} onPress={callAgency} accessibilityRole="link">
                        <Text style={s.callBtnText}>📞 Call {AGENCY_PHONE_DISPLAY}</Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={[s.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[s.statusText, { color: statusColors.text }]}>
                        {getStatusLabel(b.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Available services */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Our Services</Text>
          <Text style={s.sectionSubtitle}>First 2 services: $55 each · 3rd+: $45 each</Text>
          <View style={s.servicesGrid}>
            {SERVICES.map((svc, i) => (
              <TouchableOpacity
                key={i}
                style={s.serviceCard}
                onPress={() => {
                  if (svc.name === 'Transportation') {
                    Alert.alert(
                      'Transportation',
                      `Please call the agency at ${AGENCY_PHONE_DISPLAY} to discuss how much time you need and the destination address.`,
                      [{ text: 'OK', onPress: () => navigation.navigate('Booking') }]
                    );
                    return;
                  }
                  navigation.navigate('Booking');
                }}
              >
                <Text style={s.serviceEmoji}>{svc.emoji}</Text>
                <Text style={s.serviceName}>{svc.name}</Text>
                <Text style={s.serviceDesc}>{svc.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>Powered by Care-On-Demand</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },
  scroll:           { paddingBottom: 40 },

  brandBar:         { backgroundColor: COLORS.white, alignItems: 'center', paddingTop: 12, paddingBottom: 12 },
  header:           { backgroundColor: COLORS.gradient1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  greeting:         { fontSize: 26, fontWeight: '700', color: COLORS.white },
  subGreeting:      { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  notifBtn:         { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifIcon:        { fontSize: 22 },
  notifBadge:       { position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  notifBadgeText:   { fontSize: 11, color: COLORS.white, fontWeight: '700' },

  // Quick actions
  quickActions:     { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: COLORS.surface },
  quickBtn:         { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  quickBtnIcon:     { fontSize: 26, marginBottom: 6 },
  quickBtnText:     { fontSize: 14, fontWeight: '600', color: COLORS.text },

  // Sections
  section:          { padding: 16 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:     { fontSize: 20, fontWeight: '700', color: COLORS.text },
  sectionSubtitle:  { fontSize: 14, color: COLORS.textMuted, marginBottom: 12 },
  seeAll:           { fontSize: 15, color: COLORS.primary, fontWeight: '600' },

  // Empty state
  emptyCard:        { backgroundColor: COLORS.surface, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyIcon:        { fontSize: 40, marginBottom: 10 },
  emptyTitle:       { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  emptyText:        { fontSize: 15, color: COLORS.textMuted, marginBottom: 14 },
  bookNowBtn:       { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  bookNowBtnText:   { color: COLORS.white, fontWeight: '700', fontSize: 16 },

  // Booking cards
  bookingCard:      { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bookingCardLeft:  { flex: 1 },
  bookingCardRight: { alignItems: 'flex-end', gap: 8, marginLeft: 8 },
  bookingDate:      { fontSize: 16, fontWeight: '700', color: COLORS.text },
  bookingTime:      { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  bookingService:   { fontSize: 15, color: COLORS.primary, fontWeight: '500', marginTop: 4 },
  callBtn:          { marginTop: 8, alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  callBtnText:      { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  statusBadge:      { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  statusText:       { fontSize: 13, fontWeight: '600' },

  // Services grid
  servicesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard:      { width: '47%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  serviceEmoji:     { fontSize: 30, marginBottom: 8 },
  serviceName:      { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  serviceDesc:      { fontSize: 13, color: COLORS.textMuted },

  footer:           { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, marginTop: 8, paddingBottom: 20 },
});

export default HomeScreen;
