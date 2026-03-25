import { useEffect, useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Calendar, Clock, FileText, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PendingShift {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  service: string;
  provider_user_id: string | null;
  client_phone: string | null;
}

const HOUR_BLOCKS = [
  { label: 'Mornings', start: 6, end: 12 },
  { label: 'Afternoons', start: 12, end: 18 },
  { label: 'Evenings', start: 18, end: 22 },
];

const parseHour = (timeStr: string): number => {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase();
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const period = ampmMatch[3];
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return h;
  }
  return parseInt(cleaned.split(':')[0], 10);
};

const formatSlotHour = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${period}`;
};

const getBlockForHour = (hour: number) => {
  return HOUR_BLOCKS.find((b) => hour >= b.start && hour < b.end) || HOUR_BLOCKS[0];
};

const ClientPendingShifts = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<PendingShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [decliningShiftId, setDecliningShiftId] = useState<string | null>(null);
  const [selectedAltTime, setSelectedAltTime] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const fetchShifts = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, scheduled_date, start_time, end_time, service, provider_user_id, client_phone')
        .eq('client_user_id', user.id)
        .eq('status', 'pending_client')
        .order('scheduled_date', { ascending: true });

      const results = (data || []) as PendingShift[];
      setShifts(results);

      const providerIds = [...new Set(results.map(s => s.provider_user_id).filter(Boolean) as string[])];
      if (providerIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', providerIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Provider';
        });
        setProviderNames(map);
      }

      setLoading(false);
    };

    fetchShifts();

    const channel = supabase
      .channel('client-pending-shifts')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          const updated = payload.new as any;
          if (updated.client_user_id === user.id && updated.status === 'pending_client') {
            setShifts((prev) => {
              const exists = prev.find(s => s.id === updated.id);
              if (exists) return prev;
              return [...prev, updated];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleApprove = async (shift: PendingShift) => {
    setUpdating(shift.id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'approved' } as any)
        .eq('id', shift.id);
      if (error) throw error;

      // Notify provider that client approved
      if (shift.provider_user_id) {
        await supabase.from('notifications').insert({
          user_id: shift.provider_user_id,
          title: '✅ Client Approved Your Shift',
          body: `The ${shift.service} shift on ${format(new Date(shift.scheduled_date + 'T00:00:00'), 'MMM dd, yyyy')} (${shift.start_time} – ${shift.end_time}) has been approved. The session is now booked!`,
        });
      }

      toast.success('Shift approved! Session is now booked.');
      setShifts((prev) => prev.filter(s => s.id !== shift.id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve shift');
    } finally {
      setUpdating(null);
    }
  };

  const handleSendAltTime = async (shift: PendingShift) => {
    if (!selectedAltTime) {
      toast.error('Please select an alternative time');
      return;
    }
    setUpdating(shift.id);
    try {
      const slotParts = selectedAltTime.split(' – ');
      const newStart = slotParts[0];
      const newEnd = slotParts[1];

      // Update booking with new client-requested time, send back to provider
      const { error } = await supabase
        .from('bookings')
        .update({
          start_time: newStart,
          end_time: newEnd,
          status: 'upcoming',
          provider_user_id: null,
          provider_viewed: false,
        } as any)
        .eq('id', shift.id);
      if (error) throw error;

      // Notify the provider about the client's preferred time
      if (shift.provider_user_id) {
        await supabase.from('notifications').insert({
          user_id: shift.provider_user_id,
          title: '🔄 Client Requested a Different Time',
          body: `The client wasn't available for the ${shift.service} shift on ${format(new Date(shift.scheduled_date + 'T00:00:00'), 'MMM dd, yyyy')}. They prefer ${selectedAltTime}. The shift is back in your available jobs.`,
        });
      }

      toast.success('Alternative time sent to provider');
      setShifts((prev) => prev.filter(s => s.id !== shift.id));
      setDecliningShiftId(null);
      setSelectedAltTime('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send alternative time');
    } finally {
      setUpdating(null);
    }
  };

  // Generate alternative time slots for a shift based on the hour block
  const getAltTimeSlots = (shift: PendingShift) => {
    const providerHour = parseHour(shift.start_time);
    const block = getBlockForHour(providerHour);
    const slots: { value: string; label: string }[] = [];
    for (let h = block.start; h < block.end; h++) {
      const slotLabel = `${formatSlotHour(h)} – ${formatSlotHour(h + 1)}`;
      // Exclude the time the provider already selected
      const currentSlot = `${shift.start_time} – ${shift.end_time}`;
      if (slotLabel !== currentSlot) {
        slots.push({ value: slotLabel, label: slotLabel });
      }
    }
    return slots;
  };

  if (loading) return null;
  if (shifts.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        Shifts Awaiting Your Approval
      </h3>
      {shifts.map((shift) => {
        const dateObj = new Date(shift.scheduled_date + 'T00:00:00');
        const isDeclining = decliningShiftId === shift.id;
        const altSlots = getAltTimeSlots(shift);

        return (
          <div key={shift.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-sm text-foreground">
                  {format(dateObj, 'EEE MMM dd, yyyy')}
                </span>
              </div>
              <Badge variant="secondary">Needs Approval</Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{shift.start_time} – {shift.end_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground capitalize">{shift.service}</span>
              </div>
              {shift.provider_user_id && providerNames[shift.provider_user_id] && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground">Provider: {providerNames[shift.provider_user_id]}</span>
                </div>
              )}
            </div>

            {!isDeclining ? (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  size="sm"
                  onClick={() => handleApprove(shift)}
                  disabled={updating === shift.id}
                  className="flex-1"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {updating === shift.id ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    setDecliningShiftId(shift.id);
                    setSelectedAltTime('');
                    // Send notification to provider to call the client
                    if (shift.provider_user_id) {
                      const phoneDisplay = shift.client_phone || 'phone number on file';
                      await supabase.from('notifications').insert({
                        user_id: shift.provider_user_id,
                        title: '📞 Client Requests a Call',
                        body: `The client has declined the ${shift.service} shift on ${format(new Date(shift.scheduled_date + 'T00:00:00'), 'MMM dd, yyyy')} (${shift.start_time} – ${shift.end_time}). Please call them at ${phoneDisplay} to discuss scheduling.`,
                      });
                      toast.success('Provider has been notified to call you.');
                    }
                  }}
                  disabled={updating === shift.id}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Decline, Please Call me
                </Button>
              </div>
            ) : (
              <div className="pt-2 border-t border-border space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select a preferred time and we'll notify the provider:
                </p>
                <Select value={selectedAltTime} onValueChange={setSelectedAltTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an alternative time" />
                  </SelectTrigger>
                  <SelectContent>
                    {altSlots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDecliningShiftId(null);
                      setSelectedAltTime('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={!selectedAltTime || updating === shift.id}
                    onClick={() => handleSendAltTime(shift)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {updating === shift.id ? 'Sending...' : 'Confirm'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ClientPendingShifts;
