import { useState, useMemo } from 'react';
import { Clock, AlertTriangle, X, ArrowLeft, MapPin, Phone, User, Calendar, Ruler, Weight, FileText, RefreshCw, Send, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Job } from './JobCard';

interface JobDetailsSheetProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (jobId: string) => void;
  onConfirm?: (jobId: string) => void;
}

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-0.5 text-white/50 shrink-0" />
      <div>
        <p className="text-white/70 text-xs">{label}</p>
        <p className="font-medium text-sm">{value}</p>
      </div>
    </div>
  );
};

/**
 * Parse a time string like "07:00", "12:00 PM", "17:00" into a 24-hour number.
 */
const parseHour = (timeStr: string): number => {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase();

  // Handle "HH:MM AM/PM"
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const period = ampmMatch[3];
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return h;
  }

  // Handle "HH:MM" (24h)
  const parts = cleaned.split(':');
  return parseInt(parts[0], 10);
};

const formatSlotHour = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${period}`;
};

const JobDetailsSheet = ({ job, open, onOpenChange, onDelete, onConfirm }: JobDetailsSheetProps) => {
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemMessage, setProblemMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

  // Generate 1-hour time slots from the booking's start/end time
  const timeSlots = useMemo(() => {
    if (!job) return [];
    const startHour = parseHour(job.startTime);
    const endHour = parseHour(job.endTime);
    const slots: { value: string; label: string }[] = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push({
        value: `${formatSlotHour(h)} – ${formatSlotHour(h + 1)}`,
        label: `${formatSlotHour(h)} – ${formatSlotHour(h + 1)}`,
      });
    }
    return slots;
  }, [job]);

  if (!job) return null;

  const fullName = [job.clientFirstName, job.clientLastName].filter(Boolean).join(' ') || job.clientName || 'Unknown';
  const fullAddress = [job.clientAddress, job.clientAddressLine2, job.clientCity, job.clientState, job.clientZipCode]
    .filter(Boolean)
    .join(', ');

  const handleConfirmShift = async () => {
    if (!job || !selectedTimeSlot) return;
    setConfirming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Parse selected slot to get the 1-hour window
      const slotParts = selectedTimeSlot.split(' – ');
      const newStartTime = slotParts[0];
      const newEndTime = slotParts[1];

      // Update booking: assign provider, set time slot, send directly to client for approval
      const { error } = await supabase
        .from('bookings')
        .update({
          provider_user_id: user.id,
          start_time: newStartTime,
          end_time: newEndTime,
          status: 'pending_client',
        } as any)
        .eq('id', job.id);
      if (error) throw error;

      // Notify client
      if (job.id) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('client_user_id')
          .eq('id', job.id)
          .single();

        if (booking?.client_user_id) {
          await supabase.from('notifications').insert({
            user_id: booking.client_user_id,
            title: '📋 A Provider Has Confirmed Your Shift',
            body: `Your ${job.service || 'care'} shift on ${job.date} has been confirmed for ${selectedTimeSlot}. Please review and approve.`,
          });
        }
      }

      toast.success('Shift sent to client for approval!');
      onConfirm?.(job.id);
      setShowTimeDialog(false);
      setSelectedTimeSlot('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to confirm shift');
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const handleSubmitProblem = async () => {
    if (!problemMessage.trim()) {
      toast.error('Please describe the problem');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.user_id,
          title: '⚠️ Provider Reported a Problem',
          body: `Job on ${job.date} for ${fullName}: ${problemMessage.trim()}`,
        }));
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }

      toast.success('Problem reported to admin team');
      setProblemMessage('');
      setShowProblemForm(false);
    } catch (err: any) {
      toast.error('Failed to send report');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', job.id)
        .single();

      if (booking) {
        const archiveRecord = {
          original_booking_id: booking.id,
          client_user_id: booking.client_user_id,
          provider_user_id: booking.provider_user_id,
          deleted_by_user_id: user.id,
          scheduled_date: booking.scheduled_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          service: booking.service,
          status: booking.status,
          client_phone: booking.client_phone,
          client_address: booking.client_address,
          client_address_line2: booking.client_address_line2,
          client_city: booking.client_city,
          client_state: booking.client_state,
          client_zip_code: booking.client_zip_code,
          client_date_of_birth: booking.client_date_of_birth,
          client_height: booking.client_height,
          client_weight: booking.client_weight,
          client_responsible_party: booking.client_responsible_party,
          client_responsible_party_name: booking.client_responsible_party_name,
          client_responsible_party_email: booking.client_responsible_party_email,
          client_additional_info: booking.client_additional_info,
          client_recurring_weekly: booking.client_recurring_weekly,
          notes: booking.notes,
        };

        await supabase.from('deleted_bookings' as any).insert(archiveRecord as any);
      }

      const { error } = await supabase.from('bookings').delete().eq('id', job.id);
      if (error) throw error;
      toast.success('Booking deleted');
      onOpenChange(false);
      onDelete?.(job.id);
    } catch (err: any) {
      toast.error('Failed to delete booking');
      console.error(err);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setShowProblemForm(false); setProblemMessage(''); } }}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl care-gradient overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between pb-4">
            <button 
              onClick={() => onOpenChange(false)}
              className="text-white/80 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <SheetTitle className="text-white text-lg font-semibold">Job Details</SheetTitle>
            <button 
              onClick={() => onOpenChange(false)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </SheetHeader>

          <div className="space-y-5 text-white pb-8">
            {/* Schedule Info */}
            <div className="bg-white/10 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Schedule</h3>
              <InfoRow icon={Calendar} label="Date" value={job.date} />
              <InfoRow icon={Clock} label="Available Hours" value={`${job.startTime} – ${job.endTime}`} />
              {job.service && <InfoRow icon={FileText} label="Service" value={job.service} />}
              {job.clientRecurringWeekly && <InfoRow icon={RefreshCw} label="Recurring" value={job.clientRecurringWeekly} />}
            </div>

            {/* Client Info */}
            <div className="bg-white/10 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Client Information</h3>
              <InfoRow icon={User} label="Patient Name" value={fullName} />
              {job.clientDateOfBirth && <InfoRow icon={Calendar} label="Date of Birth" value={job.clientDateOfBirth} />}
              {job.clientHeight && <InfoRow icon={Ruler} label="Height" value={job.clientHeight} />}
              {job.clientWeight && <InfoRow icon={Weight} label="Weight" value={job.clientWeight} />}
              {job.clientPhone && <InfoRow icon={Phone} label="Phone" value={job.clientPhone} />}
            </div>

            {/* Address */}
            {fullAddress && (
              <div className="bg-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Location</h3>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 underline decoration-white/40 hover:decoration-white transition-colors"
                >
                  <MapPin className="w-4 h-4 mt-0.5 text-white/50 shrink-0" />
                  <div>
                    <p className="text-white/70 text-xs">Address</p>
                    <p className="font-medium text-sm">{fullAddress}</p>
                  </div>
                </a>
              </div>
            )}

            {/* Responsible Party */}
            {job.clientResponsibleParty === 'someone-else' && (job.clientResponsiblePartyName || job.clientResponsiblePartyEmail) && (
              <div className="bg-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Responsible Party</h3>
                {job.clientResponsiblePartyName && <InfoRow icon={User} label="Name" value={job.clientResponsiblePartyName} />}
                {job.clientResponsiblePartyEmail && <InfoRow icon={Phone} label="Contact" value={job.clientResponsiblePartyEmail} />}
              </div>
            )}

            {/* Additional Notes */}
            {(job.clientAdditionalInfo || job.notes) && (
              <div className="bg-white/10 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Notes</h3>
                {job.clientAdditionalInfo && <InfoRow icon={FileText} label="Additional Info" value={job.clientAdditionalInfo} />}
                {job.notes && <InfoRow icon={FileText} label="Booking Notes" value={job.notes} />}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {/* Confirm Shift */}
              {job.status === 'upcoming' && (
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => {
                    setSelectedTimeSlot('');
                    setShowTimeDialog(true);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Shift
                </Button>
              )}
              {!showProblemForm ? (
                <Button 
                  className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={() => setShowProblemForm(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  I have a problem
                </Button>
              ) : (
                <div className="bg-white/10 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white/90">Describe your problem</h3>
                  <Textarea
                    placeholder="Tell us what's wrong..."
                    value={problemMessage}
                    onChange={(e) => setProblemMessage(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[100px]"
                    maxLength={500}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent border-white/30 text-white hover:bg-white/10"
                      onClick={() => { setShowProblemForm(false); setProblemMessage(''); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      onClick={handleSubmitProblem}
                      disabled={submitting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? 'Sending...' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Delete */}
              {!confirmDelete ? (
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-white/30 text-white hover:bg-white/10"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Booking
                </Button>
              ) : (
                <div className="bg-white/10 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-white/90">Are you sure you want to delete this booking?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent border-white/30 text-white hover:bg-white/10"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Time Slot Selection Dialog */}
      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Select Your Time Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              The client is available from <span className="font-medium text-foreground">{job.startTime}</span> to <span className="font-medium text-foreground">{job.endTime}</span>. Choose a 1-hour window for this shift.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Time Slots</label>
              <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowTimeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmShift}
              disabled={!selectedTimeSlot || confirming}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {confirming ? 'Confirming...' : 'Confirm Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default JobDetailsSheet;
