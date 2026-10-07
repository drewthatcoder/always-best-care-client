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
} from 'react-native';
import { format } from 'date-fns';
import { supabase } from '../supabase';

// ── Colours ───────────────────────────────────────────────────────────────────
const COLORS = {
  primary:    '#3D52A0',
  accent:     '#7091E6',
  background: '#FFFFFF',
  surface:    '#F5F6FA',
  border:     '#E2E5F1',
  text:       '#1A1A2E',
  textMuted:  '#6B7280',
  white:      '#FFFFFF',
  unreadDot:  '#3D52A0',
  gradient1:  '#1a237e',
};

interface Notification {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setNotifications((data || []) as Notification[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-screen')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true } as any).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ read: true } as any).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return format(date, 'h:mm aa');
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return format(date, 'EEE');
    return format(date, 'MMM d');
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={s.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={notifications.length === 0 && s.emptyContainer}
        >
          {notifications.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>🔔</Text>
              <Text style={s.emptyTitle}>No Notifications</Text>
              <Text style={s.emptyText}>You're all caught up!</Text>
            </View>
          ) : (
            notifications.map((notif, index) => (
              <TouchableOpacity
                key={notif.id}
                style={[s.notifRow, index < notifications.length - 1 && s.notifBorder]}
                onPress={() => markAsRead(notif.id)}
                activeOpacity={0.7}
              >
                {/* Left: icon */}
                <View style={s.notifIconWrap}>
                  <Text style={s.notifIcon}>📋</Text>
                </View>

                {/* Middle: content */}
                <View style={s.notifContent}>
                  <Text style={[s.notifTitle, !notif.read && s.notifTitleUnread]}>
                    {notif.title}
                  </Text>
                  {notif.body && (
                    <Text style={s.notifBody} numberOfLines={2}>{notif.body}</Text>
                  )}
                  <Text style={s.notifTime}>{formatDate(notif.created_at)}</Text>
                </View>

                {/* Right: unread dot + chevron */}
                <View style={s.notifRight}>
                  {!notif.read && <View style={s.unreadDot} />}
                  <Text style={s.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },

  // Header
  header:           { backgroundColor: COLORS.gradient1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, paddingTop: 20 },
  backBtn:          { padding: 4 },
  backText:         { fontSize: 22, color: COLORS.white },
  headerTitle:      { fontSize: 20, fontWeight: '700', color: COLORS.white, flex: 1, textAlign: 'center' },
  markAllText:      { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // Notification row
  notifRow:         { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: COLORS.white },
  notifBorder:      { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  notifIconWrap:    { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  notifIcon:        { fontSize: 18 },
  notifContent:     { flex: 1 },
  notifTitle:       { fontSize: 14, color: COLORS.text, fontWeight: '500', marginBottom: 4 },
  notifTitleUnread: { fontWeight: '700', color: COLORS.primary },
  notifBody:        { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 4 },
  notifTime:        { fontSize: 11, color: COLORS.textMuted },
  notifRight:       { alignItems: 'center', justifyContent: 'center', gap: 4, paddingLeft: 8 },
  unreadDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  chevron:          { fontSize: 18, color: COLORS.textMuted },

  // Empty state
  emptyContainer:   { flex: 1 },
  emptyWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon:        { fontSize: 48, marginBottom: 16 },
  emptyTitle:       { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText:        { fontSize: 14, color: COLORS.textMuted },
});

export default NotificationsScreen;
