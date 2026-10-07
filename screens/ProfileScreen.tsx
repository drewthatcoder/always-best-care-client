import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Linking,
} from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../supabase';
import { approveBookingStatus } from '../approveBooking';
import { CardSetupCanceled, getPaymentMethod, saveDefaultCard, type SavedCard } from '../payments';
import { friendlyAlertMessage } from '../userFacingError';

const COLORS = {
  primary:      '#3D52A0',
  primaryLight: 'rgba(61,82,160,0.1)',
  accent:       '#7091E6',
  gradient1:    '#1a237e',
  gradient2:    '#3949ab',
  background:   '#FFFFFF',
  surface:      '#F5F6FA',
  border:       '#E2E5F1',
  text:         '#1A1A2E',
  textMuted:    '#6B7280',
  white:        '#FFFFFF',
  error:        '#DC2626',
  success:      '#16A34A',
  tagBg:        '#EEF2FF',
};

const ALL_SERVICES = [
  { id: 'bathing',      label: 'Bathing & Grooming Assistance', emoji: '🛁' },
  { id: 'dressing',     label: 'Dressing Assistance',           emoji: '👕' },
  { id: 'transferring', label: 'Transferring Assistance',       emoji: '♿' },
  { id: 'toileting',    label: 'Toileting Assistance',          emoji: '🚽' },
  { id: 'walking',      label: 'Walking Assistance',            emoji: '🚶' },
  { id: 'meal_prep',    label: 'Meal Prep/Feeding Assistance',  emoji: '🍽️' },
  { id: 'housekeeping', label: 'Light Housekeeping Assistance', emoji: '🧹' },
  { id: 'medication',   label: 'Medication Assistance',         emoji: '💊' },
  { id: 'transport',    label: 'Transportation',                emoji: '🚗' },
];

const HOURS_OPTIONS = [
  { id: 'morning',   label: 'Mornings: 7 am – 12 pm',  start: '7:00 AM',  end: '12:00 PM' },
  { id: 'afternoon', label: 'Afternoons: 12 pm – 5 pm', start: '12:00 PM', end: '5:00 PM'  },
  { id: 'evening',   label: 'Evenings: 5 pm – 10 pm',  start: '5:00 PM',  end: '10:00 PM' },
];

const FREQUENCIES = ['One-time', 'Weekly', 'Bi-weekly', 'Monthly'];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const calcTotal = (count: number) => count <= 2 ? count * 55 : 2 * 55 + (count - 2) * 45;

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={s.infoRow}>
    <Text style={s.infoIcon}>{icon}</Text>
    <View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

const formatCardBrand = (brand: string) => {
  const known: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };
  return known[brand.toLowerCase()] || brand;
};

const formatCardExpiry = (month: number, year: number) => `${String(month).padStart(2, '0')}/${year}`;

const EditBtn = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <TouchableOpacity style={s.editBtn} onPress={onPress}>
    <Text style={s.editBtnText}>✏️  {label}</Text>
  </TouchableOpacity>
);

const SectionCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <View style={s.sectionCard}>
    <View style={s.sectionHeader}>
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const Tag = ({ label }: { label: string }) => (
  <View style={s.tag}><Text style={s.tagText}>{label}</Text></View>
);

interface PendingShift {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service: string;
  status: string;
  provider_user_id: string | null;
  client_phone: string | null;
}

const ProfileScreen = ({ navigation }: any) => {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating]     = useState<string | null>(null);
  const [requestingCallId, setRequestingCallId] = useState<string | null>(null);
  const [userEmail, setUserEmail]   = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [accountMeta, setAccountMeta] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [pendingShifts, setPendingShifts] = useState<PendingShift[]>([]);
  const [editModal, setEditModal] = useState<string | null>(null);
  const [editPhone, setEditPhone]     = useState('');
  const [editDob, setEditDob]         = useState('');
  const [editHeight, setEditHeight]   = useState('');
  const [editWeight, setEditWeight]   = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAddress2, setEditAddress2] = useState('');
  const [editCity, setEditCity]       = useState('');
  const [editState, setEditState]     = useState('');
  const [editZip, setEditZip]         = useState('');
  const [editCareFor, setEditCareFor] = useState('');
  const [editRespEmail, setEditRespEmail] = useState('');
  const [editRespName, setEditRespName]   = useState('');
  const [editServices, setEditServices]   = useState<string[]>([]);
  const [editHour, setEditHour]           = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [editAdditionalInfo, setEditAdditionalInfo] = useState('');
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [freqPickerVisible, setFreqPickerVisible]   = useState(false);
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [cardError, setCardError] = useState('');
  const [cardBusy, setCardBusy] = useState(false);
  const cardLoadSeq = useRef(0);
  const cardFlowRef = useRef(false);

  const loadSavedCard = useCallback(async () => {
    const seq = ++cardLoadSeq.current;
    setCardLoading(true);
    try {
      const card = await getPaymentMethod();
      if (seq !== cardLoadSeq.current) return;
      setSavedCard(card);
      setCardError('');
    } catch (err: any) {
      if (seq !== cardLoadSeq.current) return;
      setCardError(err?.message || 'Could not load the card on file.');
    } finally {
      if (seq === cardLoadSeq.current) setCardLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email || '');
    setAccountMeta(user.user_metadata || null);
    setMemberSince(format(new Date(user.created_at), 'MMMM yyyy'));
    const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    setProfile(prof);
    const { data: bks } = await supabase.from('bookings').select('*').eq('client_user_id', user.id).order('scheduled_date', { ascending: true });
    setBookings(bks || []);
    const pending = (bks || []).filter((b: any) => b.status === 'pending_client');
    setPendingShifts(pending);
    setLoading(false);
    setRefreshing(false);
    await loadSavedCard();
  }, [loadSavedCard]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('profile-bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const openBookings = bookings.filter((b: any) =>
    (b.status === 'upcoming' || b.status === 'pending_client') && b.scheduled_date >= todayIso
  );
  const profileBooking = [...openBookings].sort((a: any, b: any) =>
    b.scheduled_date.localeCompare(a.scheduled_date)
  )[0] || null;
  const serviceTokenToId = (value: string) => {
    const trimmed = value.trim();
    const match = ALL_SERVICES.find(svc => svc.id === trimmed || svc.label === trimmed);
    return match ? match.id : trimmed;
  };
  const serviceTokenToLabel = (value: string) => {
    const trimmed = value.trim();
    const match = ALL_SERVICES.find(svc => svc.id === trimmed || svc.label === trimmed);
    return match ? match.label : trimmed;
  };
  const metaPhone = typeof accountMeta?.phone === 'string' ? accountMeta.phone : '';
  const metaAddress = typeof accountMeta?.address === 'string' ? accountMeta.address : '';
  const metaCity = typeof accountMeta?.city === 'string' ? accountMeta.city : '';
  const metaState = typeof accountMeta?.state === 'string' ? accountMeta.state : '';
  const metaZip = typeof accountMeta?.zip_code === 'string' ? accountMeta.zip_code : '';
  const clientPhone   = profileBooking?.client_phone || metaPhone;
  const clientDob     = profileBooking?.client_date_of_birth || '';
  const clientHeight  = profileBooking?.client_height || '';
  const clientWeight  = profileBooking?.client_weight || '';
  const clientAddress = profileBooking?.client_address || metaAddress;
  const clientAddress2= profileBooking?.client_address_line2 || '';
  const clientCity    = profileBooking?.client_city || metaCity;
  const clientState   = profileBooking?.client_state || metaState;
  const clientZip     = profileBooking?.client_zip_code || profile?.zip_code || metaZip;
  const careFor       = profileBooking?.client_responsible_party || 'myself';
  const respEmail     = profileBooking?.client_responsible_party_email || userEmail;
  const respName      = profileBooking?.client_responsible_party_name || '';
  const servicesRaw   = profileBooking?.service || '';
  const hourStart     = profileBooking?.start_time || '';
  const hourEnd       = profileBooking?.end_time || '';
  const frequency     = profileBooking?.client_recurring_weekly || 'Not set';
  const additionalInfo= profileBooking?.client_additional_info || 'None provided';
  const serviceList = servicesRaw
    ? servicesRaw.split(',').map(serviceTokenToLabel).filter(Boolean)
    : [];
  const hourLabel = hourStart && hourEnd ? `${hourStart} – ${hourEnd}` : '';
  const scheduledDates = bookings.map((b: any) => b.scheduled_date);

  const saveBookingField = async (fields: Record<string, any>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Not signed in', 'Log in again before saving.');
      return false;
    }
    const ids = openBookings.map((b: any) => b.id);
    if (ids.length === 0) {
      Alert.alert(
        'Not saved on past bookings',
        'This change only applies to upcoming and pending bookings from today forward. Cancelled, approved, and past visits were left unchanged.'
      );
      return false;
    }
    const { data, error } = await supabase
      .from('bookings')
      .update(fields as any)
      .in('id', ids)
      .eq('client_user_id', user.id)
      .select('id');
    if (error || !data || data.length !== ids.length) {
      Alert.alert('Could not save', friendlyAlertMessage(error, 'The save did not update your upcoming bookings.'));
      return false;
    }
    await fetchData();
    return true;
  };

  const handleSaveCard = async () => {
    if (cardFlowRef.current || cardBusy) return;
    cardFlowRef.current = true;
    cardLoadSeq.current += 1;
    setCardLoading(false);
    setCardBusy(true);
    try {
      const card = await saveDefaultCard();
      setSavedCard(card);
      setCardError('');
      setCardLoading(false);
    } catch (err: any) {
      if (!(err instanceof CardSetupCanceled)) {
        Alert.alert('Could not save card', err?.message || 'Something went wrong.');
      }
    } finally {
      cardFlowRef.current = false;
      setCardBusy(false);
    }
  };

  const handleApprove = async (shift: PendingShift) => {
    if (updating) return;
    setUpdating(shift.id);
    try {
      await approveBookingStatus(shift.id);
      Alert.alert('Booking approved');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not approve shift');
    } finally {
      setUpdating(null);
      fetchData();
    }
  };

  const showRequestCallError = (message: string) => {
    Alert.alert(
      'Could not notify your provider',
      `${message}\n\nCall the agency at (916) 884-1983.`,
      [
        {
          text: 'Call agency',
          onPress: () => Linking.openURL('tel:9168841983').catch(() => Alert.alert('Agency phone', '(916) 884-1983')),
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleDecline = async (shift: PendingShift) => {
    if (requestingCallId) return;
    setRequestingCallId(shift.id);
    try {
      const { data, error } = await supabase.rpc('client_request_call', { p_booking_id: shift.id });
      if (error) {
        showRequestCallError(friendlyAlertMessage(error, 'Something went wrong.'));
        return;
      }
      const created = Number(data);
      if (created > 0) {
        Alert.alert("Provider notified. They'll call you soon.");
      } else if (created === 0) {
        Alert.alert("We already let your provider know. They'll call you soon.");
      } else {
        showRequestCallError('Something went wrong.');
        return;
      }
      fetchData();
    } catch (err: any) {
      showRequestCallError(friendlyAlertMessage(err, 'Something went wrong.'));
    } finally {
      setRequestingCallId(null);
    }
  };

  const openEdit = (section: string) => {
    if (section === 'profile') { setEditPhone(clientPhone); setEditDob(clientDob); setEditHeight(clientHeight); setEditWeight(clientWeight); }
    else if (section === 'address') { setEditAddress(clientAddress); setEditAddress2(clientAddress2); setEditCity(clientCity); setEditState(clientState); setEditZip(clientZip); }
    else if (section === 'responsible') { setEditCareFor(careFor); setEditRespEmail(respEmail); setEditRespName(respName); }
    else if (section === 'services') {
      setEditServices(
        servicesRaw.split(',').map(serviceTokenToId).filter((id: string) => ALL_SERVICES.some(svc => svc.id === id))
      );
    }
    else if (section === 'hours') {
      const match = HOURS_OPTIONS.find(o => o.id === hourLabel || `${o.start} – ${o.end}` === hourLabel || o.label === hourLabel);
      setEditHour(match?.id || '');
    }
    else if (section === 'schedule') { setEditFrequency(frequency === 'Not set' ? '' : frequency); }
    else if (section === 'info') { setEditAdditionalInfo(additionalInfo === 'None provided' ? '' : additionalInfo); }
    setEditModal(section);
  };

  const saveProfile = async () => {
    const ok = await saveBookingField({ client_phone: editPhone, client_date_of_birth: editDob, client_height: editHeight, client_weight: editWeight });
    if (ok) setEditModal(null);
  };
  const normalizeZip = (value?: string | null) => {
    const match = (value || '').match(/\b(\d{5})(?:-\d{4})?\b/);
    return match ? match[1] : (value || '').trim();
  };

  const saveAddress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Not signed in', 'Log in again before saving.');
      return;
    }
    const nextZip = normalizeZip(editZip);
    if (!/^\d{5}$/.test(nextZip)) {
      Alert.alert('Zip code required', 'Enter the 5-digit zip code for the address where care will be provided.');
      return;
    }

    const profileZip = normalizeZip(profile?.zip_code);
    const profileZipChanged = nextZip !== profileZip;
    const bookingsToUpdate = openBookings.filter((booking: any) => {
      const addressChanged =
        (booking.client_address || '') !== editAddress ||
        (booking.client_address_line2 || '') !== editAddress2 ||
        (booking.client_city || '') !== editCity ||
        (booking.client_state || '') !== editState;
      const zipChanged = normalizeZip(booking.client_zip_code) !== nextZip;
      return addressChanged || zipChanged;
    });
    const zipChanges = bookingsToUpdate.filter((booking: any) => normalizeZip(booking.client_zip_code) !== nextZip);

    if (!profileZipChanged && bookingsToUpdate.length === 0) {
      setEditModal(null);
      return;
    }

    const applyAddress = async () => {
      if (profileZipChanged) {
        const { error: profileError } = await supabase.from('profiles').update({ zip_code: nextZip } as any).eq('user_id', user.id);
        if (profileError) {
          Alert.alert('Could not save zip code', friendlyAlertMessage(profileError, 'The zip code was not saved.'));
          return;
        }
      }

      for (const booking of bookingsToUpdate) {
        const fields: Record<string, string> = {
          client_address: editAddress,
          client_address_line2: editAddress2,
          client_city: editCity,
          client_state: editState,
        };
        if (normalizeZip(booking.client_zip_code) !== nextZip) fields.client_zip_code = nextZip;
        const { data, error } = await supabase
          .from('bookings')
          .update(fields as any)
          .eq('id', booking.id)
          .eq('client_user_id', user.id)
          .select('id');
        if (error || !data || data.length !== 1) {
          Alert.alert('Could not save', friendlyAlertMessage(error, 'The save did not update your upcoming bookings.'));
          await fetchData();
          return;
        }
      }

      setEditModal(null);
      await fetchData();
      if (openBookings.length === 0) {
        Alert.alert('Zip code saved', 'Your profile zip code was updated. Street, city, and state are stored on upcoming and pending bookings, and you do not have any of those. Cancelled, approved, and past bookings were not changed.');
      }
    };

    if (bookingsToUpdate.length === 0) {
      await applyAddress();
      return;
    }

    const count = bookingsToUpdate.length;
    const visitWord = count === 1 ? 'booking' : 'bookings';
    const zipNote = zipChanges.length > 0
      ? ` The zip code will change on ${zipChanges.length} of them. If no provider covers ${nextZip}, each of those bookings notifies the agency.`
      : ' Their zip codes will stay the same.';
    Alert.alert(
      'Update open bookings?',
      `This updates the address on ${count} upcoming or pending ${visitWord}.${zipNote} Cancelled, approved, and past bookings will not change.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update bookings', onPress: () => { applyAddress(); } },
      ]
    );
  };
  const saveResponsible = async () => {
    const ok = await saveBookingField({ client_responsible_party: editCareFor, client_responsible_party_email: editRespEmail, client_responsible_party_name: editRespName });
    if (ok) setEditModal(null);
  };
  const saveServices = async () => {
    const ids = editServices.map(serviceTokenToId).filter((id, index, all) => id && all.indexOf(id) === index);
    const ok = await saveBookingField({ service: ids.join(', ') });
    if (ok) setEditModal(null);
  };
  const saveHours = async () => {
    const h = HOURS_OPTIONS.find(o => o.id === editHour);
    if (!h) {
      Alert.alert('Choose hours', 'Select a time block before saving.');
      return;
    }
    const ok = await saveBookingField({ start_time: h.start, end_time: h.end });
    if (ok) setEditModal(null);
  };
  const saveSchedule = async () => {
    const ok = await saveBookingField({ client_recurring_weekly: editFrequency });
    if (ok) setEditModal(null);
  };
  const saveInfo = async () => {
    const ok = await saveBookingField({ client_additional_info: editAdditionalInfo });
    if (ok) setEditModal(null);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); navigation.replace('Login'); }},
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Confirm Delete',
              'This will permanently delete all your data. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from('bookings').delete().eq('client_user_id', user.id);
                      await supabase.from('profiles').delete().eq('user_id', user.id);
                      await supabase.auth.signOut();
                      navigation.replace('Login');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const serviceCount = serviceList.length;
  const totalPerVisit = calcTotal(serviceCount);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={s.scroll}
      >
        <View style={s.gradientHeader}>
          <Text style={s.headerTitle}>Client Profile</Text>
          {pendingShifts.length > 0 && (
            <Text style={s.headerPendingLabel}>⏳ Shifts Awaiting Your Approval</Text>
          )}
        </View>

        {pendingShifts.map(shift => (
          <View key={shift.id} style={s.shiftCard}>
            <View style={s.shiftTop}>
              <Text style={s.shiftDate}>📅 {format(new Date(shift.scheduled_date + 'T00:00:00'), 'EEE MMM dd, yyyy')}</Text>
              <View style={s.needsBadge}><Text style={s.needsBadgeText}>Needs Approval</Text></View>
            </View>
            <View style={s.shiftMeta}>
              <Text style={s.shiftMetaText}>🕐 {shift.start_time} – {shift.end_time}</Text>
              <Text style={s.shiftMetaText}>📋 {shift.service}</Text>
            </View>
            {shift.provider_user_id ? (
              <TouchableOpacity
                style={s.callBtn}
                onPress={() => Linking.openURL('tel:9168841983').catch(() => Alert.alert('Agency phone', '(916) 884-1983'))}
                accessibilityRole="link"
              >
                <Text style={s.callBtnText}>📞 Call (916) 884-1983</Text>
              </TouchableOpacity>
            ) : null}
            <View style={s.shiftActions}>
              <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(shift)} disabled={updating === shift.id}>
                <Text style={s.approveBtnText}>{updating === shift.id ? 'Approving...' : '✅ Approve'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.declineBtn} onPress={() => handleDecline(shift)} disabled={updating === shift.id || requestingCallId === shift.id}>
                <Text style={s.declineBtnText}>{requestingCallId === shift.id ? 'Notifying...' : '📞 Decline, Please Call me'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={s.content}>
          <Text style={s.roleLabel}>Client</Text>
          <InfoRow icon="✉️" label="Email" value={userEmail} />
          <InfoRow icon="📞" label="Phone" value={clientPhone} />
          <InfoRow icon="📅" label="Date of Birth" value={clientDob} />
          <InfoRow icon="📏" label="Height" value={clientHeight} />
          <InfoRow icon="⚖️" label="Weight" value={clientWeight} />
          <InfoRow icon="📍" label="Zip Code" value={clientZip} />
          <InfoRow icon="🕐" label="Member Since" value={memberSince} />
          <EditBtn label="Edit Profile" onPress={() => openEdit('profile')} />

          <SectionCard title="(Address) Patients Location where services are provided Address" icon="🏠">
            <InfoRow icon="📍" label="Street Address" value={clientAddress} />
            <InfoRow icon="📍" label="City" value={clientCity} />
            <InfoRow icon="📍" label="State" value={clientState} />
            <InfoRow icon="📍" label="Zip Code" value={clientZip} />
            <EditBtn label="Edit Address" onPress={() => openEdit('address')} />
          </SectionCard>

          <SectionCard title="Responsible Party" icon="👥">
            <InfoRow icon="👤" label="Requesting Care For" value={careFor === 'myself' ? 'Myself' : 'Someone Else'} />
            <InfoRow icon="✉️" label="Responsible Party Email" value={respEmail} />
            {respName ? <InfoRow icon="👤" label="Responsible Party Name" value={respName} /> : null}
            <EditBtn label="Edit Responsible Party" onPress={() => openEdit('responsible')} />
          </SectionCard>

          <SectionCard title="Services" icon="❤️">
            <View style={s.tagsRow}>
              {serviceList.map((svc: string, i: number) => <Tag key={i} label={svc} />)}
            </View>
            {serviceCount > 0 && (
              <View style={s.pricingSummary}>
                <Text style={s.pricingSummaryTitle}>
                  {serviceCount} service{serviceCount > 1 ? 's' : ''} selected — <Text style={{ color: COLORS.primary }}>${totalPerVisit}/visit</Text>
                </Text>
                <Text style={s.pricingSummaryHint}>First 2 services: $55 each · 3rd service and beyond: $45 each</Text>
              </View>
            )}
            <EditBtn label="Edit Services" onPress={() => openEdit('services')} />
          </SectionCard>

          <SectionCard title="Available Hours" icon="🕐">
            {hourLabel ? <Tag label={hourLabel} /> : <Text style={s.emptyText}>Not set</Text>}
            <EditBtn label="Edit Available Hours" onPress={() => openEdit('hours')} />
          </SectionCard>

          <SectionCard title="Scheduled Dates" icon="📅">
            {scheduledDates.length > 0 ? scheduledDates.map((d: string, i: number) => (
              <InfoRow key={i} icon="📅" label="" value={format(new Date(d + 'T00:00:00'), 'MMMM d, yyyy')} />
            )) : <Text style={s.emptyText}>No dates scheduled</Text>}
            <EditBtn label="Edit Dates" onPress={() => navigation.navigate('Booking')} />
          </SectionCard>

          <SectionCard title="Recurring Schedule" icon="🔄">
            <InfoRow icon="📅" label="Frequency" value={frequency} />
            <EditBtn label="Edit Schedule" onPress={() => openEdit('schedule')} />
          </SectionCard>

          <SectionCard title="Payment Information" icon="💳">
            {cardLoading && !savedCard ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 8 }} />
            ) : savedCard ? (
              <>
                <Text style={s.infoValue}>{formatCardBrand(savedCard.brand)} •••• {savedCard.last4}</Text>
                <Text style={s.emptyText}>Expires {formatCardExpiry(savedCard.expMonth, savedCard.expYear)}</Text>
              </>
            ) : cardError ? (
              <Text style={s.emptyText}>{cardError}</Text>
            ) : (
              <Text style={s.emptyText}>No card on file</Text>
            )}
            {savedCard && cardError ? <Text style={s.emptyText}>{cardError}</Text> : null}
            <TouchableOpacity
              style={[s.editBtn, (cardBusy || cardLoading) && s.editBtnDisabled]}
              onPress={handleSaveCard}
              disabled={cardBusy || cardLoading}
            >
              <Text style={s.editBtnText}>
                {cardBusy ? 'Opening card form...' : savedCard ? '✏️  Update card' : '✏️  Add card'}
              </Text>
            </TouchableOpacity>
          </SectionCard>

          <SectionCard title="Additional Information" icon="📄">
            <Text style={s.emptyText}>{additionalInfo}</Text>
            <EditBtn label="Edit Info" onPress={() => openEdit('info')} />
          </SectionCard>

          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
            <Text style={s.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={editModal === 'profile'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <Text style={s.modalLabel}>Phone</Text>
            <TextInput style={s.modalInput} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            <Text style={s.modalLabel}>Date of Birth (mm/dd/yyyy)</Text>
            <TextInput style={s.modalInput} value={editDob} onChangeText={setEditDob} placeholder="mm/dd/yyyy" placeholderTextColor={COLORS.textMuted} />
            <Text style={s.modalLabel}>Height</Text>
            <TextInput style={s.modalInput} value={editHeight} onChangeText={setEditHeight} />
            <Text style={s.modalLabel}>Weight</Text>
            <TextInput style={s.modalInput} value={editWeight} onChangeText={setEditWeight} />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditModal(null)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveProfile}><Text style={s.modalSaveText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal === 'address'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit Address</Text>
            <Text style={s.modalLabel}>Street Address</Text>
            <TextInput style={s.modalInput} value={editAddress} onChangeText={setEditAddress} />
            <Text style={s.modalLabel}>Address Line 2</Text>
            <TextInput style={s.modalInput} value={editAddress2} onChangeText={setEditAddress2} />
            <Text style={s.modalLabel}>City</Text>
            <TextInput style={s.modalInput} value={editCity} onChangeText={setEditCity} />
            <Text style={s.modalLabel}>State</Text>
            <TouchableOpacity style={s.modalInput} onPress={() => setStatePickerVisible(true)}>
              <Text style={{ color: editState ? COLORS.text : COLORS.textMuted }}>{editState || 'Select state'}</Text>
            </TouchableOpacity>
            <Text style={s.modalLabel}>Zip Code</Text>
            <TextInput style={s.modalInput} value={editZip} onChangeText={setEditZip} keyboardType="number-pad" maxLength={5} />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditModal(null)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveAddress}><Text style={s.modalSaveText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal === 'responsible'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit Responsible Party</Text>
            <Text style={s.modalLabel}>Requesting Care For</Text>
            <View style={s.radioGroup}>
              {['myself', 'someone_else'].map(opt => (
                <TouchableOpacity key={opt} style={s.radioRow} onPress={() => setEditCareFor(opt)}>
                  <View style={[s.radioOuter, editCareFor === opt && s.radioOuterSel]}>
                    {editCareFor === opt && <View style={s.radioInner} />}
                  </View>
                  <Text style={s.radioLabel}>{opt === 'myself' ? 'Myself' : 'Someone Else'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {editCareFor === 'someone_else' && (
              <>
                <Text style={s.modalLabel}>Responsible Party Name</Text>
                <TextInput style={s.modalInput} value={editRespName} onChangeText={setEditRespName} />
              </>
            )}
            <Text style={s.modalLabel}>Responsible Party Email</Text>
            <TextInput style={s.modalInput} value={editRespEmail} onChangeText={setEditRespEmail} keyboardType="email-address" autoCapitalize="none" />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditModal(null)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveResponsible}><Text style={s.modalSaveText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal === 'services'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <ScrollView>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Services</Text>
              {ALL_SERVICES.map(svc => {
                const sel = editServices.includes(svc.id);
                return (
                  <TouchableOpacity key={svc.id} style={[s.serviceRow, sel && s.serviceRowSel]} onPress={() => {
                    if (!sel && svc.id === 'transport') {
                      Alert.alert(
                        'Transportation',
                        'Please call the agency at (916) 884-1983 to discuss how much time you need and the destination address.'
                      );
                    }
                    setEditServices(prev => sel ? prev.filter(x => x !== svc.id) : [...prev, svc.id]);
                  }}>
                    <Text style={s.serviceRowEmoji}>{svc.emoji}</Text>
                    <Text style={[s.serviceRowLabel, sel && { color: COLORS.primary, fontWeight: '600' }]}>{svc.label}</Text>
                    {sel && <Text style={{ color: COLORS.primary }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              <View style={s.modalButtons}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setEditModal(null)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={s.modalSave} onPress={saveServices}><Text style={s.modalSaveText}>Save</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={editModal === 'hours'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit Available Hours</Text>
            {HOURS_OPTIONS.map(h => (
              <TouchableOpacity key={h.id} style={[s.serviceRow, editHour === h.id && s.serviceRowSel]} onPress={() => setEditHour(h.id)}>
                <Text style={[s.serviceRowLabel, editHour === h.id && { color: COLORS.primary, fontWeight: '600' }]}>{h.label}</Text>
                {editHour === h.id && <Text style={{ color: COLORS.primary }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditModal(null)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveHours}><Text style={s.modalSaveText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal === 'schedule'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit Recurring Schedule</Text>
            {FREQUENCIES.map(f => (
              <TouchableOpacity key={f} style={[s.serviceRow, editFrequency === f && s.serviceRowSel]} onPress={() => setEditFrequency(f)}>
                <Text style={[s.serviceRowLabel, editFrequency === f && { color: COLORS.primary, fontWeight: '600' }]}>{f}</Text>
                {editFrequency === f && <Text style={{ color: COLORS.primary }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditModal(null)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveSchedule}><Text style={s.modalSaveText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModal === 'info'} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Additional Information</Text>
            <TextInput style={[s.modalInput, { minHeight: 100, textAlignVertical: 'top' }]} value={editAdditionalInfo} onChangeText={setEditAdditionalInfo} multiline placeholder="Tell us anything else..." placeholderTextColor={COLORS.textMuted} />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditModal(null)}><Text style={s.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveInfo}><Text style={s.modalSaveText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={statePickerVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Select State</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {US_STATES.map(st => (
                <TouchableOpacity key={st} style={[s.serviceRow, editState === st && s.serviceRowSel]} onPress={() => { setEditState(st); setStatePickerVisible(false); }}>
                  <Text style={[s.serviceRowLabel, editState === st && { color: COLORS.primary }]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.modalCancel} onPress={() => setStatePickerVisible(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.background },
  scroll:             { paddingBottom: 40 },
  gradientHeader:     { backgroundColor: COLORS.gradient1, paddingTop: 24, paddingBottom: 60, paddingHorizontal: 20, alignItems: 'center' },
  headerTitle:        { fontSize: 22, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  headerPendingLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  shiftCard:          { marginHorizontal: 16, marginTop: -30, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  shiftTop:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shiftDate:          { fontSize: 14, fontWeight: '600', color: COLORS.text },
  needsBadge:         { backgroundColor: COLORS.tagBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  needsBadgeText:     { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  shiftMeta:          { flexDirection: 'row', gap: 16, marginBottom: 12 },
  shiftMetaText:      { fontSize: 13, color: COLORS.textMuted },
  shiftActions:       { flexDirection: 'row', gap: 8 },
  callBtn:            { alignSelf: 'flex-start', backgroundColor: COLORS.tagBg, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12 },
  callBtnText:        { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  approveBtn:         { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  approveBtnText:     { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  declineBtn:         { flex: 1, backgroundColor: COLORS.error, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  declineBtnText:     { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  content:            { padding: 16 },
  roleLabel:          { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 12 },
  infoRow:            { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  infoIcon:           { fontSize: 18, marginRight: 12, width: 28 },
  infoLabel:          { fontSize: 12, color: COLORS.textMuted },
  infoValue:          { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  editBtn:            { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  editBtnDisabled:    { opacity: 0.6 },
  editBtnText:        { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  sectionCard:        { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon:        { fontSize: 18, marginRight: 8 },
  sectionTitle:       { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  tagsRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag:                { backgroundColor: COLORS.tagBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText:            { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  pricingSummary:     { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 8 },
  pricingSummaryTitle:{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  pricingSummaryHint: { fontSize: 12, color: COLORS.textMuted },
  emptyText:          { fontSize: 14, color: COLORS.textMuted, marginBottom: 8 },
  signOutBtn:         { borderWidth: 1, borderColor: COLORS.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutText:        { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  deleteBtn:          { borderWidth: 1, borderColor: COLORS.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(220,38,38,0.05)' },
  deleteBtnText:      { color: COLORS.error, fontWeight: '700', fontSize: 15 },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16, textAlign: 'center' },
  modalLabel:         { fontSize: 13, color: COLORS.textMuted, marginBottom: 4, marginTop: 8 },
  modalInput:         { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4, justifyContent: 'center' },
  modalButtons:       { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel:        { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCancelText:    { fontSize: 15, fontWeight: '600', color: COLORS.text },
  modalSave:          { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSaveText:      { fontSize: 15, fontWeight: '700', color: COLORS.white },
  serviceRow:         { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: COLORS.surface },
  serviceRowSel:      { backgroundColor: COLORS.tagBg, borderWidth: 1, borderColor: COLORS.primary },
  serviceRowEmoji:    { fontSize: 20, marginRight: 10 },
  serviceRowLabel:    { flex: 1, fontSize: 14, color: COLORS.text },
  radioGroup:         { marginBottom: 8 },
  radioRow:           { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radioOuter:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  radioOuterSel:      { borderColor: COLORS.primary },
  radioInner:         { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  radioLabel:         { fontSize: 15, color: COLORS.text },
});

export default ProfileScreen;