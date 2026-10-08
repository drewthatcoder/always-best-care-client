import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
  TextInput,
} from 'react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { supabase } from '../supabase';
import { CONFIRM_FAILURE_MESSAGE, friendlyAlertMessage, isDuplicateKey, isNetworkFailure } from '../userFacingError';

const COLORS = {
  primary:      'hsl(231, 41%, 48%)',
  primaryLight: 'rgba(74,91,166,0.12)',
  danger:       '#DC2626',
  dangerLight:  '#FEE2E2',
  success:      '#16A34A',
  successLight: '#DCFCE7',
  background:   '#FFFFFF',
  surface:      '#F5F5F5',
  border:       '#E0E0E0',
  text:         '#1A1A2E',
  textMuted:    '#6B7280',
  todayBg:      '#FEFCE8',
  white:        '#FFFFFF',
};

const SERVICES = [
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

const HOURS = [
  { id: 'morning',   label: 'Mornings: 7 am – 12 pm',  start: '7:00 AM',  end: '12:00 PM' },
  { id: 'afternoon', label: 'Afternoons: 12 pm – 5 pm', start: '12:00 PM', end: '5:00 PM'  },
  { id: 'evening',   label: 'Evenings: 5 pm – 10 pm',  start: '5:00 PM',  end: '10:00 PM' },
];

const calcTotal = (count: number) => count <= 2 ? count * 55 : 2 * 55 + (count - 2) * 45;

const AGENCY_PHONE_DISPLAY = '(916) 884-1983';
const AGENCY_PHONE_TEL = 'tel:9168841983';

const callAgency = () => {
  Linking.openURL(AGENCY_PHONE_TEL).catch(() => {
    Alert.alert('Agency phone', AGENCY_PHONE_DISPLAY);
  });
};

const showTransportationNotice = () => {
  Alert.alert(
    'Transportation',
    `Please call the agency at ${AGENCY_PHONE_DISPLAY} to discuss how much time you need and the destination address.`
  );
};

const CONFIRM_TIMEOUT_MS = 15000;

const extractZip = (value?: string | null): string => {
  const match = (value || '').match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : '';
};

const newBookingId = (): string => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const abortError = () => {
  const error = new Error('The request timed out.');
  error.name = 'AbortError';
  return error;
};

const startConfirmTimeout = () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIRM_TIMEOUT_MS);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
};

const withSignal = <T,>(work: PromiseLike<T>, signal: AbortSignal): Promise<T> => {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort);
    work.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
};

const confirmFailureMessage = (error: unknown) => (
  isNetworkFailure(error) ? CONFIRM_FAILURE_MESSAGE : friendlyAlertMessage(error, 'The booking was not saved. Please try again.')
);

const resolveClientZip = async (userId: string, signal: AbortSignal): Promise<string> => {
  const { data: profiles, error } = await withSignal(
    supabase
      .from('profiles')
      .select('zip_code, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .abortSignal(signal),
    signal
  );

  if (error) throw error;

  for (const row of profiles || []) {
    const zip = extractZip(row.zip_code);
    if (zip) return zip;
  }

  const { data: prior, error: priorError } = await withSignal(
    supabase
      .from('bookings')
      .select('client_zip_code, client_address')
      .eq('client_user_id', userId)
      .order('scheduled_date', { ascending: false })
      .abortSignal(signal),
    signal
  );

  if (priorError) throw priorError;

  for (const row of prior || []) {
    const zip = extractZip(row.client_zip_code) || extractZip(row.client_address);
    if (zip) return zip;
  }
  return '';
};

const canClientCancel = (status: string) => status === 'upcoming' || status === 'pending_client';

const AgencyCallButton = () => (
  <TouchableOpacity style={s.callBtn} onPress={callAgency} accessibilityRole="link">
    <Text style={s.callBtnText}>📞 Call {AGENCY_PHONE_DISPLAY}</Text>
  </TouchableOpacity>
);

interface Booking {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service: string;
  status: string;
  provider_user_id: string | null;
  client_phone: string | null;
}

type ViewMode = 'week' | 'month';

const HOUR_BLOCKS = [
  { label: 'Mornings',   start: 6,  end: 12 },
  { label: 'Afternoons', start: 12, end: 18 },
  { label: 'Evenings',   start: 18, end: 22 },
];

const parseHour = (t: string): number => {
  if (!t) return 0;
  const c = t.trim().toUpperCase();
  const m = c.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (m[3] === 'AM' && h === 12) h = 0;
    if (m[3] === 'PM' && h !== 12) h += 12;
    return h;
  }
  return parseInt(c.split(':')[0], 10);
};

const formatSlotHour = (h: number): string => {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${period}`;
};

const getAltTimeSlots = (shift: Booking): string[] => {
  const providerHour = parseHour(shift.start_time);
  const block = HOUR_BLOCKS.find(b => providerHour >= b.start && providerHour < b.end) || HOUR_BLOCKS[0];
  const slots: string[] = [];
  for (let h = block.start; h < block.end; h++) {
    const label = `${formatSlotHour(h)} – ${formatSlotHour(h + 1)}`;
    if (label !== `${shift.start_time} – ${shift.end_time}`) slots.push(label);
  }
  return slots;
};

const BookingScreen = () => {
  const [currentDate, setCurrentDate]         = useState(new Date());
  const [selectedDate, setSelectedDate]       = useState<Date | null>(null);
  const [viewMode, setViewMode]               = useState<ViewMode>('month');
  const [bookings, setBookings]               = useState<Booking[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [updating, setUpdating]               = useState<string | null>(null);
  const [requestingCallId, setRequestingCallId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible]     = useState(false);
  const [pickerMonth, setPickerMonth]         = useState(new Date());
  const [providerNames, setProviderNames]     = useState<Record<string, string>>({});
  const [decliningId, setDecliningId]         = useState<string | null>(null);
  const [altTime, setAltTime]                 = useState('');
  const [altPickerVisible, setAltPickerVisible] = useState(false);
  const [altSlots, setAltSlots]               = useState<string[]>([]);
  const [newBookingDate, setNewBookingDate]       = useState<Date | null>(null);
  const [selectedServices, setSelectedServices]   = useState<string[]>([]);
  const [selectedHour, setSelectedHour]           = useState('');
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [zipModalVisible, setZipModalVisible] = useState(false);
  const [zipDraft, setZipDraft] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);
  const savingRef = useRef(false);
  const confirmAttemptRef = useRef<{ id: string; key: string } | null>(null);

  const today = new Date();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('bookings')
      .select('id, scheduled_date, start_time, end_time, service, status, provider_user_id, client_phone')
      .eq('client_user_id', user.id)
      .order('scheduled_date', { ascending: true });

    const results = (data || []) as Booking[];
    setBookings(results);

    const ids = [...new Set(results.map(b => b.provider_user_id).filter(Boolean) as string[])];
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => {
        map[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Provider';
      });
      setProviderNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();
    const channel = supabase
      .channel('client-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  const handleAddBooking = async (date: Date) => {
    const sameAttempt = newBookingDate && isSameDay(newBookingDate, date);
    if (!sameAttempt) confirmAttemptRef.current = null;
    setNewBookingDate(date);
    setSelectedServices([]);
    setSelectedHour('');
    setServicePickerVisible(true);
    setPickerVisible(false);
  };

  const finishConfirmedBooking = () => {
    confirmAttemptRef.current = null;
    setZipModalVisible(false);
    setZipDraft('');
    setServicePickerVisible(false);
    if (newBookingDate) setSelectedDate(newBookingDate);
    setNewBookingDate(null);
    setSelectedServices([]);
    setSelectedHour('');
    fetchBookings();
  };

  const createBooking = async (userId: string, zip: string, signal: AbortSignal) => {
    if (!newBookingDate) {
      Alert.alert('Could not confirm booking', 'Choose a date and try again.');
      return;
    }
    const hourBlock = HOURS.find(h => h.id === selectedHour);
    const cleanZip = extractZip(zip);
    if (!hourBlock || !cleanZip) {
      setZipDraft(zip || '');
      setZipModalVisible(true);
      Alert.alert('Zip code required', 'Enter the 5-digit zip code for the address where care will be provided before booking.');
      return;
    }

    const attemptKey = `${format(newBookingDate, 'yyyy-MM-dd')}|${selectedHour}|${[...selectedServices].sort().join(',')}`;
    if (!confirmAttemptRef.current || confirmAttemptRef.current.key !== attemptKey) {
      confirmAttemptRef.current = { id: newBookingId(), key: attemptKey };
    }

    const { error } = await withSignal(
      supabase.from('bookings').insert({
        id: confirmAttemptRef.current.id,
        client_user_id: userId,
        scheduled_date: format(newBookingDate, 'yyyy-MM-dd'),
        start_time: hourBlock.start,
        end_time: hourBlock.end,
        service: selectedServices.join(', '),
        status: 'upcoming',
        client_zip_code: cleanZip,
      } as any).abortSignal(signal),
      signal
    );

    if (error) {
      if (isDuplicateKey(error)) {
        finishConfirmedBooking();
        return;
      }
      throw error;
    }

    finishConfirmedBooking();
  };

  const handleConfirmBooking = async () => {
    if (!newBookingDate) return;
    if (selectedServices.length === 0) { Alert.alert('Please select at least one service'); return; }
    if (!selectedHour) { Alert.alert('Please select your preferred hours'); return; }
    if (savingRef.current) return;

    const timeout = startConfirmTimeout();
    savingRef.current = true;
    setSavingBooking(true);
    try {
      const { data, error } = await withSignal(supabase.auth.getSession(), timeout.signal);
      if (error || !data.session?.user) {
        if (isNetworkFailure(error)) throw error ?? abortError();
        Alert.alert('Could not confirm booking', 'You are not signed in. Log in and try again.');
        return;
      }

      const zip = await resolveClientZip(data.session.user.id, timeout.signal);
      if (!zip) {
        setZipDraft('');
        setServicePickerVisible(false);
        setZipModalVisible(true);
        return;
      }
      await createBooking(data.session.user.id, zip, timeout.signal);
    } catch (err: unknown) {
      Alert.alert(confirmFailureMessage(err));
    } finally {
      timeout.cancel();
      savingRef.current = false;
      setSavingBooking(false);
    }
  };

  const handleSubmitZip = async () => {
    const zip = extractZip(zipDraft);
    if (!zip) {
      Alert.alert('Zip code required', 'Enter the 5-digit zip code for the address where care will be provided.');
      return;
    }
    if (savingRef.current) return;

    const timeout = startConfirmTimeout();
    savingRef.current = true;
    setSavingBooking(true);
    try {
      const { data, error } = await withSignal(supabase.auth.getSession(), timeout.signal);
      if (error || !data.session?.user) {
        if (isNetworkFailure(error)) throw error ?? abortError();
        Alert.alert('Could not confirm booking', 'You are not signed in. Log in and try again.');
        return;
      }
      const { error: profileError } = await withSignal(
        supabase
          .from('profiles')
          .update({ zip_code: zip } as any)
          .eq('user_id', data.session.user.id)
          .abortSignal(timeout.signal),
        timeout.signal
      );
      if (profileError) throw profileError;
      await createBooking(data.session.user.id, zip, timeout.signal);
    } catch (err: unknown) {
      Alert.alert(confirmFailureMessage(err));
    } finally {
      timeout.cancel();
      savingRef.current = false;
      setSavingBooking(false);
    }
  };

  const handleApprove = async (shift: Booking) => {
    setUpdating(shift.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      console.log('Profile:', profile);
      console.log('Stripe customer ID:', profile?.stripe_customer_id);

      if (profile?.stripe_customer_id) {
        const services = shift.service.split(',').length;
        const amount = services <= 2 ? services * 5500 : 2 * 5500 + (services - 2) * 4500;
        console.log('Calling charge-client with:', { customerId: profile.stripe_customer_id, amount });
        const chargeRes = await fetch(
          'https://uwgfitnpesgdkiwtekcb.supabase.co/functions/v1/charge-client',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2ZpdG5wZXNnZGtpd3Rla2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNDkxMTYsImV4cCI6MjA4OTYyNTExNn0.LDxFhHfaYGmFwsGqOfQoXrmFpKGb3J6ITOnMEh_1H3o',
            },
            body: JSON.stringify({
              customerId: profile.stripe_customer_id,
              amount: amount,
              description: `Always Best Care - ${shift.service} on ${shift.scheduled_date}`,
              bookingId: shift.id,
              providerUserId: shift.provider_user_id || undefined,
            }),
          }
        );
        console.log('Charge response status:', chargeRes.status);
        const chargeData = await chargeRes.json();
        console.log('Charge response data:', chargeData);
        if (chargeData.error) {
          Alert.alert('Payment failed', chargeData.error);
          setUpdating(null);
          return;
        }
      }

      const { error } = await supabase
        .from('bookings').update({ status: 'approved' } as any).eq('id', shift.id);

      if (error) Alert.alert('Error', 'Could not approve shift');
    } catch (err: unknown) {
      Alert.alert('Error', friendlyAlertMessage(err, 'Something went wrong'));
    }
    setUpdating(null);
    fetchBookings();
  };

  const showRequestCallError = (message: string) => {
    Alert.alert(
      'Could not notify your provider',
      `${message}\n\nCall the agency at ${AGENCY_PHONE_DISPLAY}.`,
      [
        { text: 'Call agency', onPress: callAgency },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleDecline = async (shift: Booking) => {
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
      setDecliningId(shift.id);
      setAltSlots(getAltTimeSlots(shift));
      setAltTime('');
    } catch (err: any) {
      showRequestCallError(friendlyAlertMessage(err, 'Something went wrong.'));
    } finally {
      setRequestingCallId(null);
    }
  };

  const handleSendAltTime = async (shift: Booking) => {
    if (!altTime) { Alert.alert('Please select an alternative time'); return; }
    setUpdating(shift.id);
    const [newStart, newEnd] = altTime.split(' – ');
    const { error } = await supabase
      .from('bookings')
      .update({ start_time: newStart, end_time: newEnd, status: 'upcoming', provider_user_id: null, provider_viewed: false } as any)
      .eq('id', shift.id);
    if (error) Alert.alert('Error', 'Could not send alternative time');
    setUpdating(null); setDecliningId(null); setAltTime('');
    fetchBookings();
  };

  const generateMonthDays = (base: Date): Date[] => {
    const s = startOfWeek(startOfMonth(base));
    const e = endOfWeek(endOfMonth(base));
    const days: Date[] = [];
    let d = s;
    while (d <= e) { days.push(d); d = addDays(d, 1); }
    return days;
  };

  const generateWeekDays = (base: Date): Date[] =>
    Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(base), i));

  const days = viewMode === 'month' ? generateMonthDays(currentDate) : generateWeekDays(currentDate);
  const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getBookingsForDate = (date: Date) =>
    bookings.filter(b => isSameDay(new Date(b.scheduled_date + 'T00:00:00'), date));

  const pendingShifts = bookings.filter(b => b.status === 'pending_client');

  const handleCancelBooking = (booking: Booking) => {
    if (!canClientCancel(booking.status)) return;
    Alert.alert(
      'Cancel booking',
      'This will cancel your booking. The agency will be notified.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            setUpdating(booking.id);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setUpdating(null); return; }
            const { data, error } = await supabase
              .from('bookings')
              .update({ status: 'cancelled' } as any)
              .eq('id', booking.id)
              .eq('client_user_id', user.id)
              .in('status', ['upcoming', 'pending_client'])
              .select('id');
            setUpdating(null);
            if (error || !data || data.length !== 1) {
              console.warn('Cancel booking did not update a row', { id: booking.id, error, updated: data?.length ?? 0 });
              Alert.alert('Error', 'Could not cancel booking');
            } else {
              fetchBookings();
            }
          },
        },
      ]
    );
  };

  const toggleService = (id: string) => {
    const adding = !selectedServices.includes(id);
    if (adding && id === 'transport') showTransportationNotice();
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const bookingStatusLabel = (status: string) => {
    if (status === 'approved') return '✅ Approved';
    if (status === 'pending_client') return '⏳ Needs Approval';
    if (status === 'cancelled') return 'Cancelled';
    return status;
  };

  const renderBookingSummary = (b: Booking, showFullDate = false) => (
    <View key={b.id} style={[s.bookingCard, b.status === 'cancelled' && s.bookingCardCancelled]}>
      <Text style={[s.bookingService, b.status === 'cancelled' && s.bookingCancelledText]}>{b.service}</Text>
      <Text style={s.bookingTime}>
        {showFullDate ? `${format(new Date(b.scheduled_date + 'T00:00:00'), 'MMM d, yyyy')} · ` : ''}
        {b.start_time} – {b.end_time}
      </Text>
      <Text style={[s.bookingStatus, b.status === 'approved' && { color: COLORS.success }, b.status === 'pending_client' && { color: COLORS.danger }, b.status === 'cancelled' && s.cancelledMark]}>
        {bookingStatusLabel(b.status)}
      </Text>
      {b.provider_user_id && b.status !== 'cancelled' ? <AgencyCallButton /> : null}
      {canClientCancel(b.status) ? (
        <TouchableOpacity
          style={s.cancelBookingBtn}
          onPress={() => handleCancelBooking(b)}
          disabled={updating === b.id}
        >
          <Text style={s.cancelBookingText}>{updating === b.id ? 'Cancelling...' : 'Cancel booking'}</Text>
        </TouchableOpacity>
      ) : null}
      {b.status === 'approved' ? (
        <TouchableOpacity onPress={callAgency} accessibilityRole="link">
          <Text style={s.approvedCancelText}>To cancel an approved booking, call the agency at {AGENCY_PHONE_DISPLAY}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const serviceCount = selectedServices.length;
  const totalPrice = calcTotal(serviceCount);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Always Best Care</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>Book a Home Care Appointment</Text>

        {pendingShifts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>⏳ Shifts Awaiting Your Approval</Text>
            {pendingShifts.map(shift => {
              const dateObj = new Date(shift.scheduled_date + 'T00:00:00');
              const isDeclining = decliningId === shift.id;
              return (
                <View key={shift.id} style={s.shiftCard}>
                  <View style={s.shiftRow}>
                    <Text style={s.shiftDate}>{format(dateObj, 'EEE MMM dd, yyyy')}</Text>
                    <View style={s.badge}><Text style={s.badgeText}>Needs Approval</Text></View>
                  </View>
                  <Text style={s.shiftDetail}>🕐 {shift.start_time} – {shift.end_time}</Text>
                  <Text style={s.shiftDetail}>📋 {shift.service}</Text>
                  {shift.provider_user_id && providerNames[shift.provider_user_id] && (
                    <Text style={s.shiftDetail}>👤 {providerNames[shift.provider_user_id]}</Text>
                  )}
                  {shift.provider_user_id ? <AgencyCallButton /> : null}
                  {!isDeclining ? (
                    <View style={s.shiftActions}>
                      <TouchableOpacity style={[s.actionBtn, s.approveBtn]} onPress={() => handleApprove(shift)} disabled={updating === shift.id}>
                        <Text style={s.actionBtnText}>{updating === shift.id ? 'Approving...' : '✅ Approve'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, s.declineBtn]} onPress={() => handleDecline(shift)} disabled={updating === shift.id || requestingCallId === shift.id}>
                        <Text style={s.actionBtnText}>{requestingCallId === shift.id ? 'Notifying...' : '📞 Decline, Call Me'}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.altTimeSection}>
                      <Text style={s.altTimeHint}>Select a preferred alternative time:</Text>
                      <TouchableOpacity style={s.altTimePicker} onPress={() => setAltPickerVisible(true)}>
                        <Text style={{ color: altTime ? COLORS.text : COLORS.textMuted }}>{altTime || 'Choose an alternative time'}</Text>
                      </TouchableOpacity>
                      <View style={s.shiftActions}>
                        <TouchableOpacity style={[s.actionBtn, s.cancelBtn]} onPress={() => { setDecliningId(null); setAltTime(''); }}>
                          <Text style={{ color: COLORS.text, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, s.approveBtn, !altTime && { opacity: 0.4 }]} onPress={() => handleSendAltTime(shift)} disabled={!altTime || updating === shift.id}>
                          <Text style={s.actionBtnText}>{updating === shift.id ? 'Sending...' : '✅ Confirm'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {canClientCancel(shift.status) ? (
                    <TouchableOpacity
                      style={s.cancelBookingBtn}
                      onPress={() => handleCancelBooking(shift)}
                      disabled={updating === shift.id}
                    >
                      <Text style={s.cancelBookingText}>{updating === shift.id ? 'Cancelling...' : 'Cancel booking'}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <View style={s.toggleRow}>
          {(['week', 'month'] as ViewMode[]).map(mode => (
            <TouchableOpacity key={mode} style={[s.toggleBtn, viewMode === mode && s.toggleBtnActive]} onPress={() => setViewMode(mode)}>
              <Text style={[s.toggleText, viewMode === mode && s.toggleTextActive]}>{mode === 'week' ? 'Week View' : 'Month View'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.navRow}>
          <View style={s.navButtons}>
            <TouchableOpacity style={s.navBtn} onPress={() => setCurrentDate(subMonths(currentDate, 12))}><Text style={s.navIcon}>«</Text></TouchableOpacity>
            <TouchableOpacity style={[s.navBtn, s.navBorderL]} onPress={() => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1))}><Text style={s.navIcon}>‹</Text></TouchableOpacity>
            <Text style={s.navLabel}>{format(currentDate, 'MMM yyyy')}</Text>
            <TouchableOpacity style={[s.navBtn, s.navBorderL]} onPress={() => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1))}><Text style={s.navIcon}>›</Text></TouchableOpacity>
            <TouchableOpacity style={[s.navBtn, s.navBorderL]} onPress={() => setCurrentDate(addMonths(currentDate, 12))}><Text style={s.navIcon}>»</Text></TouchableOpacity>
          </View>
        </View>

        <View style={s.calContainer}>
          <View style={s.weekHeaderRow}>
            {WEEK_LABELS.map(d => <View key={d} style={s.weekHeaderCell}><Text style={s.weekHeaderText}>{d}</Text></View>)}
          </View>
          <View style={s.daysGrid}>
            {days.map((day, i) => {
              const inMonth  = isSameMonth(day, currentDate);
              const isToday  = isSameDay(day, today);
              const isSel    = selectedDate && isSameDay(day, selectedDate);
              const dayBooks = getBookingsForDate(day);
              return (
                <TouchableOpacity key={i} style={[s.dayCell, { minHeight: viewMode === 'week' ? 100 : 72 }, !inMonth && viewMode === 'month' && s.dayCellOut, isToday && s.dayCellToday, isSel && s.dayCellSelected]} onPress={() => setSelectedDate(day)} activeOpacity={0.7}>
                  <Text style={[s.dayNum, isToday && s.dayNumToday, !inMonth && viewMode === 'month' && s.dayNumOut]}>{format(day, 'd')}</Text>
                  {dayBooks.length > 0 && (
                    <View>
                      {dayBooks.slice(0, 2).map(b => (
                        <View key={b.id} style={[s.dayBadge, b.status === 'pending_client' && s.dayBadgePending, b.status === 'approved' && s.dayBadgeApproved, b.status === 'cancelled' && s.dayBadgeCancelled]}>
                          <Text style={[s.dayBadgeText, b.status === 'cancelled' && s.dayBadgeCancelledText]} numberOfLines={1}>
                            {b.status === 'cancelled' ? 'Cancelled' : b.service.split(',')[0]}
                          </Text>
                        </View>
                      ))}
                      {dayBooks.length > 2 && <Text style={s.moreText}>+{dayBooks.length - 2}</Text>}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.sidebar}>
          <Text style={s.sidebarTitle}>Bookings</Text>
          <Text style={s.sidebarHint}>Tap a date to select it, then add a booking.</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => { setPickerMonth(selectedDate || new Date()); setPickerVisible(true); }}>
            <Text style={s.addBtnText}>📅  Add a Booking</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />}

          {selectedDate && (
            <View style={s.selectedSection}>
              <Text style={s.selectedLabel}>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</Text>
              {getBookingsForDate(selectedDate).length > 0 ? (
                getBookingsForDate(selectedDate).map(b => renderBookingSummary(b))
              ) : (
                <Text style={s.noBookings}>No bookings for this date.</Text>
              )}
            </View>
          )}

          {bookings.length > 0 && (
            <View style={s.upcomingSection}>
              <Text style={s.upcomingTitle}>All Bookings</Text>
              {[...bookings].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).map(b => renderBookingSummary(b, true))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}><Text style={s.pickerNav}>‹</Text></TouchableOpacity>
              <Text style={s.pickerTitle}>{format(pickerMonth, 'MMMM yyyy')}</Text>
              <TouchableOpacity onPress={() => setPickerMonth(addMonths(pickerMonth, 1))}><Text style={s.pickerNav}>›</Text></TouchableOpacity>
            </View>
            <View style={s.pickerWeekRow}>
              {WEEK_LABELS.map(d => <Text key={d} style={s.pickerWeekLabel}>{d}</Text>)}
            </View>
            <View style={s.pickerGrid}>
              {generateMonthDays(pickerMonth).map((day, i) => {
                const inM  = isSameMonth(day, pickerMonth);
                const isT  = isSameDay(day, today);
                const isSel = selectedDate && isSameDay(day, selectedDate);
                return (
                  <TouchableOpacity key={i} style={[s.pickerDay, isSel && s.pickerDaySel, isT && !isSel && s.pickerDayToday]} onPress={() => handleAddBooking(day)}>
                    <Text style={[s.pickerDayText, !inM && s.pickerDayOut, isSel && { color: COLORS.white, fontWeight: '700' }, isT && !isSel && { color: COLORS.primary, fontWeight: '700' }]}>{format(day, 'd')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={s.pickerClose} onPress={() => setPickerVisible(false)}>
              <Text style={s.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={servicePickerVisible} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.servicePickerCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.servicePickerTitle}>
                📅 {newBookingDate ? format(newBookingDate, 'EEEE, MMMM d, yyyy') : ''}
              </Text>
              <Text style={s.servicePickerSubtitle}>Select services and preferred hours</Text>
              <Text style={s.servicePickerSection}>Available Services*</Text>
              <Text style={s.pricingHint}>1–2 services: $55 each · 3rd+: $45 each</Text>
              <View style={s.servicesGrid}>
                {SERVICES.map(svc => {
                  const sel = selectedServices.includes(svc.id);
                  return (
                    <TouchableOpacity key={svc.id} style={[s.serviceCard, sel && s.serviceCardSel]} onPress={() => toggleService(svc.id)}>
                      <Text style={s.serviceEmoji}>{svc.emoji}</Text>
                      <Text style={[s.serviceLabel, sel && s.serviceLabelSel]}>{svc.label}</Text>
                      <View style={[s.serviceCheck, sel && s.serviceCheckSel]}>
                        {sel && <Text style={{ color: COLORS.white, fontSize: 10 }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {serviceCount > 0 && (
                <View style={s.pricingBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.pricingText}>{serviceCount} service{serviceCount > 1 ? 's' : ''} selected</Text>
                    <Text style={s.pricingTotal}>${totalPrice}/visit</Text>
                  </View>
                </View>
              )}
              <Text style={[s.servicePickerSection, { marginTop: 20 }]}>Available Hours*</Text>
              {HOURS.map(h => (
                <TouchableOpacity key={h.id} style={[s.hourRow, selectedHour === h.id && s.hourRowSel]} onPress={() => setSelectedHour(h.id)}>
                  <View style={[s.radioOuter, selectedHour === h.id && s.radioOuterSel]}>
                    {selectedHour === h.id && <View style={s.radioInner} />}
                  </View>
                  <Text style={[s.hourLabel, selectedHour === h.id && { color: COLORS.primary, fontWeight: '600' }]}>{h.label}</Text>
                </TouchableOpacity>
              ))}
              <View style={s.servicePickerActions}>
                <TouchableOpacity style={s.cancelServiceBtn} onPress={() => setServicePickerVisible(false)}>
                  <Text style={s.cancelServiceBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.confirmServiceBtn, (serviceCount === 0 || !selectedHour || savingBooking) && { opacity: 0.4 }]} onPress={handleConfirmBooking} disabled={serviceCount === 0 || !selectedHour || savingBooking}>
                  <Text style={s.confirmServiceBtnText}>{savingBooking ? 'Saving...' : 'Confirm Booking'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={zipModalVisible} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.pickerCard}>
            <Text style={s.pickerTitle}>Zip code required</Text>
            <Text style={s.altTimeHint}>
              Enter the zip code for the address where care will be provided. Providers only see bookings in their zip codes.
            </Text>
            <TextInput
              style={s.zipInput}
              value={zipDraft}
              onChangeText={setZipDraft}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="95814"
              placeholderTextColor={COLORS.textMuted}
            />
            <View style={s.shiftActions}>
              <TouchableOpacity style={[s.actionBtn, s.cancelBtn]} onPress={() => { setZipModalVisible(false); setServicePickerVisible(true); }} disabled={savingBooking}>
                <Text style={{ color: COLORS.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.approveBtn]} onPress={handleSubmitZip} disabled={savingBooking}>
                <Text style={s.actionBtnText}>{savingBooking ? 'Saving...' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={altPickerVisible} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setAltPickerVisible(false)}>
          <View style={s.pickerCard}>
            <Text style={s.pickerTitle}>Choose Alternative Time</Text>
            <ScrollView style={{ maxHeight: 300, marginTop: 12 }}>
              {altSlots.map(slot => (
                <TouchableOpacity key={slot} style={[s.altSlotItem, altTime === slot && s.altSlotSelected]} onPress={() => { setAltTime(slot); setAltPickerVisible(false); }}>
                  <Text style={[s.altSlotText, altTime === slot && { color: COLORS.white }]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.pickerClose} onPress={() => setAltPickerVisible(false)}>
              <Text style={s.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },
  header:           { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  headerTitle:      { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  scroll:           { padding: 16, paddingBottom: 40 },
  pageTitle:        { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginBottom: 16 },
  section:          { marginBottom: 20 },
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  shiftCard:        { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  shiftRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  shiftDate:        { fontSize: 14, fontWeight: '600', color: COLORS.text },
  badge:            { backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:        { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  shiftDetail:      { fontSize: 13, color: COLORS.textMuted, marginBottom: 3 },
  shiftActions:     { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn:        { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtn:       { backgroundColor: COLORS.primary },
  declineBtn:       { backgroundColor: COLORS.danger },
  cancelBtn:        { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  actionBtnText:    { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  altTimeSection:   { marginTop: 10 },
  altTimeHint:      { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  altTimePicker:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 10 },
  toggleRow:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn:        { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.background },
  toggleBtnActive:  { backgroundColor: COLORS.primary },
  toggleText:       { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  toggleTextActive: { color: COLORS.white },
  navRow:           { flexDirection: 'row', marginBottom: 10 },
  navButtons:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' },
  navBtn:           { paddingHorizontal: 10, paddingVertical: 8 },
  navBorderL:       { borderLeftWidth: 1, borderLeftColor: COLORS.border },
  navIcon:          { fontSize: 18, color: COLORS.text },
  navLabel:         { paddingHorizontal: 12, fontSize: 14, fontWeight: '600', color: COLORS.text, minWidth: 90, textAlign: 'center' },
  calContainer:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  weekHeaderRow:    { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  weekHeaderCell:   { flex: 1, alignItems: 'center', paddingVertical: 8 },
  weekHeaderText:   { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  daysGrid:         { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell:          { width: '14.28%', padding: 4, borderBottomWidth: 1, borderRightWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  dayCellOut:       { backgroundColor: '#FAFAFA' },
  dayCellToday:     { backgroundColor: COLORS.todayBg },
  dayCellSelected:  { borderWidth: 2, borderColor: COLORS.primary },
  dayNum:           { fontSize: 12, fontWeight: '500', color: COLORS.text },
  dayNumToday:      { color: COLORS.primary, fontWeight: '700' },
  dayNumOut:        { color: COLORS.textMuted },
  dayBadge:         { backgroundColor: COLORS.primaryLight, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1, marginBottom: 2 },
  dayBadgePending:  { backgroundColor: COLORS.dangerLight },
  dayBadgeApproved: { backgroundColor: COLORS.successLight },
  dayBadgeCancelled:{ backgroundColor: '#F3F4F6' },
  dayBadgeText:     { fontSize: 9, color: COLORS.primary, fontWeight: '600' },
  dayBadgeCancelledText: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  moreText:         { fontSize: 9, color: COLORS.textMuted },
  sidebar:          { paddingTop: 4 },
  sidebarTitle:     { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sidebarHint:      { fontSize: 13, color: COLORS.textMuted, marginBottom: 14 },
  addBtn:           { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 20 },
  addBtnText:       { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  selectedSection:  { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 14, marginBottom: 14 },
  selectedLabel:    { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  noBookings:       { fontSize: 13, color: COLORS.textMuted },
  bookingCard:      { backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  bookingCardCancelled: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  bookingService:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  bookingCancelledText: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  bookingTime:      { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  bookingStatus:    { fontSize: 12, fontWeight: '600', marginTop: 4, color: COLORS.textMuted },
  cancelledMark:    { color: COLORS.danger, fontWeight: '700' },
  approvedCancelText: { marginTop: 8, color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  callBtn:          { marginTop: 8, alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  callBtnText:      { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  cancelBookingBtn: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4 },
  cancelBookingText:{ color: COLORS.danger, fontWeight: '700', fontSize: 13 },
  zipInput:         { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginTop: 8, marginBottom: 4, fontSize: 16, color: COLORS.text },
  upcomingSection:  { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 14, marginTop: 4 },
  upcomingTitle:    { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  pickerCard:       { width: 320, backgroundColor: COLORS.background, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  pickerHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pickerTitle:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  pickerNav:        { fontSize: 22, color: COLORS.primary, paddingHorizontal: 8 },
  pickerWeekRow:    { flexDirection: 'row', marginBottom: 6 },
  pickerWeekLabel:  { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  pickerGrid:       { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  pickerDay:        { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  pickerDaySel:     { backgroundColor: COLORS.primary },
  pickerDayToday:   { borderWidth: 1.5, borderColor: COLORS.primary },
  pickerDayText:    { fontSize: 13, color: COLORS.text },
  pickerDayOut:     { color: COLORS.textMuted, opacity: 0.5 },
  pickerClose:      { alignItems: 'center', paddingVertical: 8 },
  pickerCloseText:  { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  altSlotItem:      { padding: 14, borderRadius: 8, marginBottom: 4, backgroundColor: COLORS.surface },
  altSlotSelected:  { backgroundColor: COLORS.primary },
  altSlotText:      { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  servicePickerCard:    { backgroundColor: COLORS.background, borderRadius: 20, padding: 20, width: '95%', maxHeight: '90%' },
  servicePickerTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  servicePickerSubtitle:{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  servicePickerSection: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  pricingHint:          { fontSize: 12, color: COLORS.textMuted, marginBottom: 10, fontStyle: 'italic' },
  servicesGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  serviceCard:          { width: '47%', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: COLORS.surface, position: 'relative' },
  serviceCardSel:       { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  serviceEmoji:         { fontSize: 26, marginBottom: 6 },
  serviceLabel:         { fontSize: 11, color: COLORS.text, textAlign: 'center', fontWeight: '500' },
  serviceLabelSel:      { color: COLORS.primary, fontWeight: '600' },
  serviceCheck:         { position: 'absolute', bottom: 6, right: 6, width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  serviceCheckSel:      { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pricingBox:           { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12, marginBottom: 8 },
  pricingText:          { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  pricingTotal:         { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  hourRow:              { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 6, backgroundColor: COLORS.surface },
  hourRowSel:           { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: COLORS.primary },
  hourLabel:            { fontSize: 14, color: COLORS.text, marginLeft: 10 },
  radioOuter:           { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterSel:        { borderColor: COLORS.primary },
  radioInner:           { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  servicePickerActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelServiceBtn:     { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelServiceBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  confirmServiceBtn:    { flex: 2, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  confirmServiceBtnText:{ fontSize: 14, fontWeight: '700', color: COLORS.white },
});

export default BookingScreen;
