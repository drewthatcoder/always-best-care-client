import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

const ClientNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    };

    fetchNotifications();

    const channel = supabase
      .channel('client-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="care-gradient safe-area-top">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/client-dashboard')} className="text-primary-foreground hover:text-primary-foreground/80">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-primary-foreground">Notifications</h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <p className="text-sm">Loading...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Bell className="w-12 h-12 mb-3" />
          <p className="text-base font-medium">No notifications yet</p>
          <p className="text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className={`text-sm font-semibold leading-snug ${n.read ? 'text-muted-foreground' : 'text-primary'}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-sm text-muted-foreground leading-snug">{n.body}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(n.created_at), 'MMM d')}  •  {format(new Date(n.created_at), 'h:mm a')}
                </p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ClientNotifications;
