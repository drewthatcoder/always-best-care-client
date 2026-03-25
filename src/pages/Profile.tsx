import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Ruler, Weight, Heart, CreditCard, Clock, Users, FileText, Edit2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ClientProfile {
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
  memberSince: string;
}

const HOUR_LABELS: Record<string, string> = {
  'mornings': 'Mornings: 7 am – 12 pm',
  'afternoons': 'Afternoons: 12 pm – 5 pm',
  'evenings': 'Evenings: 5 pm – 10 pm',
};

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch the most recent booking for detailed client info
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const booking = bookings?.[0] as any;

      // Fetch all bookings for services, hours, and dates
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('service, start_time, end_time, scheduled_date')
        .eq('client_user_id', user.id);

      const services = [...new Set((allBookings || []).map((b: any) => b.service))];

      // Derive available hours from start_time values
      const startTimes = [...new Set((allBookings || []).map((b: any) => b.start_time))];
      const availableHours: string[] = [];
      startTimes.forEach((t: string) => {
        if (t === '07:00' || t === '7:00') availableHours.push('mornings');
        else if (t === '12:00') availableHours.push('afternoons');
        else if (t === '17:00') availableHours.push('evenings');
      });
      const uniqueHours = [...new Set(availableHours)];

      // Collect unique scheduled dates
      const scheduledDates = [...new Set((allBookings || []).map((b: any) => b.scheduled_date))]
        .sort()
        .map((d: string) => {
          try { return format(new Date(d + 'T00:00:00'), 'MMMM d, yyyy'); }
          catch { return d; }
        });

      setProfile({
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
        recurringWeekly: booking?.client_recurring_weekly || '',
        additionalInfo: booking?.client_additional_info || '',
        selectedServices: services,
        availableHours: uniqueHours,
        scheduledDates,
        memberSince: profileData?.created_at ? format(new Date(profileData.created_at), 'MMMM yyyy') : '',
      });

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No profile found.</p>
        <BottomNav />
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || 'Client';

  const recurringLabel: Record<string, string> = {
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
    'weekends': 'Weekends (Sat–Sun)',
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with gradient */}
      <div className="care-gradient pt-12 pb-24 px-6">
        <h1 className="text-xl font-semibold text-white text-center">My Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-16 space-y-4">
        {/* Basic Info Card */}
        <div className="bg-card rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
            <p className="text-sm text-muted-foreground">Client</p>
          </div>

          <div className="space-y-3">
            <ProfileRow icon={Mail} label="Email" value={profile.email} />
            <ProfileRow icon={Phone} label="Phone" value={profile.phone} />
            <ProfileRow icon={Calendar} label="Date of Birth" value={profile.dateOfBirth} />
            <ProfileRow icon={Ruler} label="Height" value={profile.height} />
            <ProfileRow icon={Weight} label="Weight" value={profile.weight} />
            <ProfileRow icon={MapPin} label="Zip Code" value={profile.zipCode} />
            <ProfileRow icon={Clock} label="Member Since" value={profile.memberSince} />
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-card rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Home className="w-4 h-4 text-primary" />
            Address
          </h3>
          <div className="space-y-3">
            <ProfileRow icon={MapPin} label="Street Address" value={profile.address} />
            {profile.addressLine2 && <ProfileRow icon={MapPin} label="Address Line 2" value={profile.addressLine2} />}
            <ProfileRow icon={MapPin} label="City" value={profile.city} />
            <ProfileRow icon={MapPin} label="State" value={profile.state} />
            <ProfileRow icon={MapPin} label="Zip Code" value={profile.zipCode} />
          </div>
        </div>

        {/* Responsible Party Card */}
        {profile.responsibleParty && (
          <div className="bg-card rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Responsible Party
            </h3>
            <div className="space-y-3">
              <ProfileRow icon={User} label="Requesting Care For" value={profile.responsibleParty === 'myself' ? 'Myself' : 'Someone Else'} />
              {profile.responsiblePartyName && <ProfileRow icon={User} label="Responsible Party Name" value={profile.responsiblePartyName} />}
              {profile.responsiblePartyEmail && <ProfileRow icon={Mail} label="Responsible Party Email" value={profile.responsiblePartyEmail} />}
            </div>
          </div>
        )}

        {/* Services Card */}
        {profile.selectedServices.length > 0 && (
          <div className="bg-card rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              Services
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.selectedServices.map((service) => (
                <span
                  key={service}
                  className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Available Hours Card */}
        {profile.availableHours.length > 0 && (
          <div className="bg-card rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Available Hours
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.availableHours.map((hour) => (
                <span
                  key={hour}
                  className="inline-block bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full"
                >
                  {HOUR_LABELS[hour] || hour}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Dates Card */}
        {profile.scheduledDates.length > 0 && (
          <div className="bg-card rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Scheduled Dates
            </h3>
            <div className="space-y-2">
              {profile.scheduledDates.map((date) => (
                <div key={date} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm font-medium text-foreground">{date}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recurring Schedule Card */}
        {profile.recurringWeekly && profile.recurringWeekly !== 'none' && (
          <div className="bg-card rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recurring Schedule
            </h3>
            <ProfileRow icon={Calendar} label="Frequency" value={recurringLabel[profile.recurringWeekly] || profile.recurringWeekly} />
          </div>
        )}

        {/* Payment Card */}
        <div className="bg-card rounded-xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Payment Information
          </h3>
          <p className="text-sm text-muted-foreground">Card on file</p>
        </div>

        {/* Additional Info Card */}
        {profile.additionalInfo && (
          <div className="bg-card rounded-xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Additional Information
            </h3>
            <p className="text-sm text-muted-foreground">{profile.additionalInfo}</p>
          </div>
        )}

        {/* Edit Button */}
        <Button className="w-full" variant="outline">
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

/* Reusable row component */
const ProfileRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
};

export default Profile;
