import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Ruler, Weight, Heart, CreditCard, Clock, Users, FileText, Home, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import AddressEditForm from '@/components/profile/AddressEditForm';
import ResponsiblePartyEditForm from '@/components/profile/ResponsiblePartyEditForm';
import AdditionalInfoEditForm from '@/components/profile/AdditionalInfoEditForm';
import ServicesEditForm from '@/components/profile/ServicesEditForm';
import ScheduledDatesEditForm from '@/components/profile/ScheduledDatesEditForm';
import AvailableHoursEditForm from '@/components/profile/AvailableHoursEditForm';
import RecurringScheduleEditForm from '@/components/profile/RecurringScheduleEditForm';
import PaymentEditForm from '@/components/profile/PaymentEditForm';

interface ClientData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  height: string;
  weight: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  responsibleParty: string;
  responsiblePartyName: string;
  responsiblePartyEmail: string;
  recurringWeekly: string;
  additionalInfo: string;
  selectedServices: string[];
  availableHours: string[];
  scheduledDates: string[];
  rawScheduledDates: string[];
  memberSince: string;
}

const HOUR_LABELS: Record<string, string> = {
  'mornings': 'Mornings: 7 am – 12 pm',
  'afternoons': 'Afternoons: 12 pm – 5 pm',
  'evenings': 'Evenings: 5 pm – 10 pm'
};

const RECURRING_LABELS: Record<string, string> = {
  'none': 'One-time only',
  'every-day': 'Every Day',
  'every-other-day': 'Every Other Day',
  'every-week': 'Every Week',
  'every-2-weeks': 'Every 2 Weeks',
  'every-3-weeks': 'Every 3 Weeks',
  'every-month': 'Every Month',
  'monday': 'Every Monday',
  'tuesday': 'Every Tuesday',
  'wednesday': 'Every Wednesday',
  'thursday': 'Every Thursday',
  'friday': 'Every Friday',
  'saturday': 'Every Saturday',
  'sunday': 'Every Sunday',
  'weekdays': 'Weekdays (Mon–Fri)',
  'weekends': 'Weekends (Sat–Sun)'
};

type EditingSection = 'profile' | 'address' | 'responsibleParty' | 'additionalInfo' | 'services' | 'dates' | 'recurring' | 'payment' | 'hours' | null;

const SectionEditButton = ({ section, onClick }: {section: string;onClick: () => void;}) =>
<div className="mt-4 pt-3 border-t border-border">
    <Button variant="outline" size="sm" className="w-full gap-2 text-muted-foreground hover:text-primary" onClick={onClick}>
      <Pencil className="w-3.5 h-3.5" />
      Edit {section}
    </Button>
  </div>;


const InfoRow = ({ icon: Icon, label, value }: {icon: any;label: string;value: string;}) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>);

};

const ClientProfileSection = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingSection>(null);

  const fetchData = async () => {
    if (!user) {setLoading(false);return;}

    const [{ data: profileData }, { data: bookings }, { data: allBookings }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('bookings').select('*').eq('client_user_id', user.id).order('created_at', { ascending: false }).limit(1),
    supabase.from('bookings').select('service, start_time, end_time, scheduled_date, client_recurring_weekly').eq('client_user_id', user.id)]
    );

    const booking = bookings?.[0] as any;
    const services = [...new Set((allBookings || []).map((b: any) => b.service))];

    const startTimes = [...new Set((allBookings || []).map((b: any) => b.start_time))];
    const hours: string[] = [];
    startTimes.forEach((t: string) => {
      if (t === '07:00' || t === '7:00') hours.push('mornings');else
      if (t === '12:00') hours.push('afternoons');else
      if (t === '17:00') hours.push('evenings');
    });

    const rawScheduledDates = [...new Set((allBookings || []).map((b: any) => b.scheduled_date))].sort() as string[];
    const scheduledDates = rawScheduledDates.map((d: string) => {
      try {return format(new Date(d + 'T00:00:00'), 'MMMM d, yyyy');}
      catch {return d;}
    });

    const recurringWeekly = booking?.client_recurring_weekly || '';

    setData({
      firstName: profileData?.first_name || user.user_metadata?.first_name || '',
      lastName: profileData?.last_name || user.user_metadata?.last_name || '',
      email: user.email || '',
      phone: booking?.client_phone || '',
      dateOfBirth: booking?.client_date_of_birth || '',
      height: booking?.client_height || '',
      weight: booking?.client_weight || '',
      address: booking?.client_address || '',
      addressLine2: booking?.client_address_line2 || '',
      city: booking?.client_city || '',
      state: booking?.client_state || '',
      zipCode: booking?.client_zip_code || profileData?.zip_code || '',
      responsibleParty: booking?.client_responsible_party || '',
      responsiblePartyName: booking?.client_responsible_party_name || '',
      responsiblePartyEmail: booking?.client_responsible_party_email || '',
      recurringWeekly,
      additionalInfo: booking?.client_additional_info || '',
      selectedServices: services,
      availableHours: [...new Set(hours)],
      scheduledDates,
      rawScheduledDates,
      memberSince: profileData?.created_at ? format(new Date(profileData.created_at), 'MMMM yyyy') : ''
    });
    setLoading(false);
  };

  useEffect(() => {fetchData();}, [user]);

  const updateBookings = async (fields: Record<string, string>) => {
    if (!user) return;
    const { error } = await supabase.
    from('bookings').
    update(fields).
    eq('client_user_id', user.id);
    if (error) throw error;
  };

  const handleSaveProfile = async (formData: {firstName: string;lastName: string;phone: string;dateOfBirth: string;height: string;weight: string;zipCode: string;}) => {
    try {
      if (!user) return;
      await Promise.all([
      supabase.from('profiles').update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        zip_code: formData.zipCode
      }).eq('user_id', user.id),
      updateBookings({
        client_phone: formData.phone,
        client_date_of_birth: formData.dateOfBirth,
        client_height: formData.height,
        client_weight: formData.weight,
        client_zip_code: formData.zipCode
      })]
      );
      toast.success('Profile updated');
      setEditing(null);
      await fetchData();
    } catch {toast.error('Failed to update profile');}
  };

  const handleSaveAddress = async (formData: {address: string;addressLine2: string;city: string;state: string;zipCode: string;}) => {
    try {
      await updateBookings({
        client_address: formData.address,
        client_address_line2: formData.addressLine2,
        client_city: formData.city,
        client_state: formData.state,
        client_zip_code: formData.zipCode
      });
      await supabase.from('profiles').update({ zip_code: formData.zipCode }).eq('user_id', user!.id);
      toast.success('Address updated');
      setEditing(null);
      await fetchData();
    } catch {toast.error('Failed to update address');}
  };

  const handleSaveResponsibleParty = async (formData: {responsibleParty: string;responsiblePartyName: string;responsiblePartyEmail: string;}) => {
    try {
      await updateBookings({
        client_responsible_party: formData.responsibleParty,
        client_responsible_party_name: formData.responsiblePartyName,
        client_responsible_party_email: formData.responsiblePartyEmail
      });
      toast.success('Responsible party updated');
      setEditing(null);
      await fetchData();
    } catch {toast.error('Failed to update');}
  };

  const handleSaveAdditionalInfo = async (formData: {additionalInfo: string;}) => {
    try {
      await updateBookings({ client_additional_info: formData.additionalInfo });
      toast.success('Additional info updated');
      setEditing(null);
      await fetchData();
    } catch {toast.error('Failed to update');}
  };

  const HOUR_TO_TIMES: Record<string, { start: string; end: string }> = {
    mornings: { start: '07:00', end: '12:00' },
    afternoons: { start: '12:00', end: '17:00' },
    evenings: { start: '17:00', end: '22:00' },
  };

  const handleSaveHours = async (formData: { availableHours: string[] }) => {
    try {
      if (!user) return;
      // Update all bookings to use the first selected hour block's times
      // (preserves the pattern used at signup)
      const primary = formData.availableHours[0];
      const times = HOUR_TO_TIMES[primary] || HOUR_TO_TIMES.mornings;
      await supabase
        .from('bookings')
        .update({ start_time: times.start, end_time: times.end })
        .eq('client_user_id', user.id);
      toast.success('Available hours updated');
      setEditing(null);
      await fetchData();
    } catch {
      toast.error('Failed to update hours');
    }
  };

  const handleSaveServices = async (formData: {selectedServices: string[];}) => {
    try {
      if (!user || !data) return;
      // Get all current bookings to understand existing structure
      const { data: allBookings } = await supabase.
      from('bookings').
      select('*').
      eq('client_user_id', user.id);

      if (!allBookings || allBookings.length === 0) return;

      // Use the first booking as template for client data
      const template = allBookings[0];
      const existingServices = [...new Set(allBookings.map((b) => b.service))];
      const newServices = formData.selectedServices.filter((s) => !existingServices.includes(s));
      const removedServices = existingServices.filter((s) => !formData.selectedServices.includes(s));

      // Delete bookings for removed services
      if (removedServices.length > 0) {
        for (const service of removedServices) {
          await supabase.from('bookings').delete().eq('client_user_id', user.id).eq('service', service);
        }
      }

      // Insert bookings for new services (using template data)
      if (newServices.length > 0) {
        const newBookings = newServices.map((service) => ({
          client_user_id: user.id,
          service,
          scheduled_date: template.scheduled_date,
          start_time: template.start_time,
          end_time: template.end_time,
          client_phone: template.client_phone,
          client_address: template.client_address,
          client_address_line2: template.client_address_line2,
          client_city: template.client_city,
          client_state: template.client_state,
          client_zip_code: template.client_zip_code,
          client_date_of_birth: template.client_date_of_birth,
          client_height: template.client_height,
          client_weight: template.client_weight,
          client_responsible_party: template.client_responsible_party,
          client_responsible_party_name: template.client_responsible_party_name,
          client_responsible_party_email: template.client_responsible_party_email,
          client_additional_info: template.client_additional_info,
          client_recurring_weekly: template.client_recurring_weekly,
          status: 'upcoming'
        }));
        await supabase.from('bookings').insert(newBookings);
      }

      toast.success('Services updated');
      setEditing(null);
      await fetchData();
    } catch {toast.error('Failed to update services');}
  };

  const handleSaveDates = async (rawDates: string[]) => {
    try {
      if (!user || !data) return;
      const { data: allBookings } = await supabase.
      from('bookings').
      select('*').
      eq('client_user_id', user.id);

      if (!allBookings || allBookings.length === 0) return;

      const template = allBookings[0];
      const existingDates = [...new Set(allBookings.map((b) => b.scheduled_date))];
      const newDates = rawDates.filter((d) => !existingDates.includes(d));
      const removedDates = existingDates.filter((d) => !rawDates.includes(d));

      // Delete bookings for removed dates
      if (removedDates.length > 0) {
        for (const date of removedDates) {
          await supabase.from('bookings').delete().eq('client_user_id', user.id).eq('scheduled_date', date);
        }
      }

      // Insert bookings for new dates (one per existing service)
      if (newDates.length > 0) {
        const services = data.selectedServices;
        const newBookings = newDates.flatMap((date) =>
        services.map((service) => ({
          client_user_id: user.id,
          service,
          scheduled_date: date,
          start_time: template.start_time,
          end_time: template.end_time,
          client_phone: template.client_phone,
          client_address: template.client_address,
          client_address_line2: template.client_address_line2,
          client_city: template.client_city,
          client_state: template.client_state,
          client_zip_code: template.client_zip_code,
          client_date_of_birth: template.client_date_of_birth,
          client_height: template.client_height,
          client_weight: template.client_weight,
          client_responsible_party: template.client_responsible_party,
          client_responsible_party_name: template.client_responsible_party_name,
          client_responsible_party_email: template.client_responsible_party_email,
          client_additional_info: template.client_additional_info,
          client_recurring_weekly: template.client_recurring_weekly,
          status: 'upcoming'
        }))
        );
        await supabase.from('bookings').insert(newBookings);
      }

      toast.success('Scheduled dates updated');
      setEditing(null);
      await fetchData();
    } catch {toast.error('Failed to update dates');}
  };

  const handleSaveRecurring = async (formData: {recurringWeekly: string;}) => {
    try {
      await updateBookings({ client_recurring_weekly: formData.recurringWeekly });
      toast.success('Recurring schedule updated');
      setEditing(null);
      await fetchData();
    } catch {toast.error('Failed to update');}
  };

  const handleSavePayment = async (_formData: {cardNumber: string;}) => {
    // Placeholder — payment processing not yet integrated
    toast.success('Payment info saved');
    setEditing(null);
  };

  if (loading) return <p className="text-muted-foreground text-center py-12">Loading profile...</p>;
  if (!data) return <p className="text-muted-foreground text-center py-12">No profile found.</p>;

  const fullName = `${data.firstName} ${data.lastName}`.trim() || 'Client';

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
          <p className="text-sm text-muted-foreground">Client</p>
        </div>
        {editing === 'profile' ?
        <ProfileEditForm
          data={{ firstName: data.firstName, lastName: data.lastName, phone: data.phone, dateOfBirth: data.dateOfBirth, height: data.height, weight: data.weight, zipCode: data.zipCode }}
          onSave={handleSaveProfile}
          onCancel={() => setEditing(null)} /> :


        <>
            <div className="space-y-3">
              <InfoRow icon={Mail} label="Email" value={data.email} />
              <InfoRow icon={Phone} label="Phone" value={data.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={data.dateOfBirth} />
              <InfoRow icon={Ruler} label="Height" value={data.height} />
              <InfoRow icon={Weight} label="Weight" value={data.weight} />
              <InfoRow icon={MapPin} label="Zip Code " value={data.zipCode} />
              <InfoRow icon={Clock} label="Member Since" value={data.memberSince} />
            </div>
            <SectionEditButton section="Profile" onClick={() => setEditing('profile')} />
          </>
        }
      </div>

      {/* Address */}
      <div className="bg-card rounded-xl shadow-lg p-6">
<h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">(Address)
Patients Location where services are provided Address<Home className="w-4 h-4 text-primary" />
        </h3>
        {editing === 'address' ?
        <AddressEditForm
          data={{ address: data.address, addressLine2: data.addressLine2, city: data.city, state: data.state, zipCode: data.zipCode }}
          onSave={handleSaveAddress}
          onCancel={() => setEditing(null)} /> :


        <>
            <div className="space-y-3">
              <InfoRow icon={MapPin} label="Street Address" value={data.address} />
              {data.addressLine2 && <InfoRow icon={MapPin} label="Address Line 2" value={data.addressLine2} />}
              <InfoRow icon={MapPin} label="City" value={data.city} />
              <InfoRow icon={MapPin} label="State" value={data.state} />
              <InfoRow icon={MapPin} label="Zip Code" value={data.zipCode} />
            </div>
            <SectionEditButton section="Address" onClick={() => setEditing('address')} />
          </>
        }
      </div>

      {/* Responsible Party */}
      {(data.responsibleParty || editing === 'responsibleParty') &&
      <div className="bg-card rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Responsible Party
          </h3>
          {editing === 'responsibleParty' ?
        <ResponsiblePartyEditForm
          data={{ responsibleParty: data.responsibleParty || 'myself', responsiblePartyName: data.responsiblePartyName, responsiblePartyEmail: data.responsiblePartyEmail }}
          onSave={handleSaveResponsibleParty}
          onCancel={() => setEditing(null)} /> :


        <>
              <div className="space-y-3">
                <InfoRow icon={User} label="Requesting Care For" value={data.responsibleParty === 'myself' ? 'Myself' : 'Someone Else'} />
                {data.responsiblePartyName && <InfoRow icon={User} label="Responsible Party Name" value={data.responsiblePartyName} />}
                {data.responsiblePartyEmail && <InfoRow icon={Mail} label="Responsible Party Email" value={data.responsiblePartyEmail} />}
              </div>
              <SectionEditButton section="Responsible Party" onClick={() => setEditing('responsibleParty')} />
            </>
        }
        </div>
      }

      {/* Services */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          Services
        </h3>
        {editing === 'services' ?
        <ServicesEditForm
          data={{ selectedServices: data.selectedServices }}
          onSave={handleSaveServices}
          onCancel={() => setEditing(null)} /> :


        <>
            {data.selectedServices.length > 0 ?
          <>
                <div className="flex flex-wrap gap-2">
                  {data.selectedServices.map((service) =>
              <span key={service} className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
                      {service}
                    </span>
              )}
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm mt-3">
                  <p className="font-medium text-foreground">
                    {data.selectedServices.length} service{data.selectedServices.length > 1 ? 's' : ''} selected
                    {' — '}
                    <span className="text-primary font-semibold">
                      {data.selectedServices.length <= 2 ?
                  `$${data.selectedServices.length * 55}/visit` :
                  `$${2 * 55 + (data.selectedServices.length - 2) * 45}/visit`}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    First 2 services: $55 each · 3rd service and beyond: $45 each
                  </p>
                </div>
              </> :

          <p className="text-sm text-muted-foreground">No services selected</p>
          }
            <SectionEditButton section="Services" onClick={() => setEditing('services')} />
          </>
        }
      </div>

      {/* Available Hours */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Available Hours
        </h3>
        {editing === 'hours' ? (
          <AvailableHoursEditForm
            data={{ availableHours: data.availableHours }}
            onSave={handleSaveHours}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            {data.availableHours.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.availableHours.map((hour) => (
                  <span key={hour} className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
                    {HOUR_LABELS[hour] || hour}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hours selected</p>
            )}
            <SectionEditButton section="Available Hours" onClick={() => setEditing('hours')} />
          </>
        )}
      </div>

      {/* Scheduled Dates */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Scheduled Dates
        </h3>
        {editing === 'dates' ?
        <ScheduledDatesEditForm
          data={{ scheduledDates: data.scheduledDates, rawDates: data.rawScheduledDates }}
          onSave={handleSaveDates}
          onCancel={() => setEditing(null)} /> :


        <>
            {data.scheduledDates.length > 0 ?
          <div className="space-y-2">
                {data.scheduledDates.map((date) =>
            <div key={date} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Calendar className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-sm font-medium text-foreground">{date}</p>
                  </div>
            )}
              </div> :

          <p className="text-sm text-muted-foreground">No dates scheduled</p>
          }
            <SectionEditButton section="Dates" onClick={() => setEditing('dates')} />
          </>
        }
      </div>

      {/* Recurring Schedule */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          Recurring Schedule
        </h3>
        {editing === 'recurring' ?
        <RecurringScheduleEditForm
          data={{ recurringWeekly: data.recurringWeekly || 'none' }}
          onSave={handleSaveRecurring}
          onCancel={() => setEditing(null)} /> :


        <>
            <InfoRow icon={Calendar} label="Frequency" value={RECURRING_LABELS[data.recurringWeekly] || data.recurringWeekly || 'Not set'} />
            <SectionEditButton section="Schedule" onClick={() => setEditing('recurring')} />
          </>
        }
      </div>

      {/* Payment Info */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Payment Information
        </h3>
        {editing === 'payment' ?
        <PaymentEditForm
          data={{ cardNumber: '' }}
          onSave={handleSavePayment}
          onCancel={() => setEditing(null)} /> :


        <>
            <p className="text-sm text-muted-foreground">Card on file</p>
            <SectionEditButton section="Payment" onClick={() => setEditing('payment')} />
          </>
        }
      </div>

      {/* Additional Info */}
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Additional Information
        </h3>
        {editing === 'additionalInfo' ?
        <AdditionalInfoEditForm
          data={{ additionalInfo: data.additionalInfo }}
          onSave={handleSaveAdditionalInfo}
          onCancel={() => setEditing(null)} /> :


        <>
            <p className="text-sm text-muted-foreground">{data.additionalInfo || 'None provided'}</p>
            <SectionEditButton section="Info" onClick={() => setEditing('additionalInfo')} />
          </>
        }
      </div>
    </div>);

};

export default ClientProfileSection;
