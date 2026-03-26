import { Calendar, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Job {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  location?: string;
  service?: string;
  clientZipCode?: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'confirmed' | 'pending_admin' | 'pending_client' | 'approved';
  providerViewed?: boolean;
  // Full client details
  clientPhone?: string;
  clientAddress?: string;
  clientAddressLine2?: string;
  clientCity?: string;
  clientState?: string;
  clientDateOfBirth?: string;
  clientHeight?: string;
  clientWeight?: string;
  clientResponsibleParty?: string;
  clientResponsiblePartyName?: string;
  clientResponsiblePartyEmail?: string;
  clientAdditionalInfo?: string;
  clientRecurringWeekly?: string;
  notes?: string;
}

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

const JobCard = ({ job, onClick }: JobCardProps) => {
  const statusStyles = {
    'upcoming': 'border-l-primary',
    'in-progress': 'border-l-care-orange',
    'completed': 'border-l-success',
    'cancelled': 'border-l-muted',
    'confirmed': 'border-l-success',
    'pending_admin': 'border-l-care-orange',
    'pending_client': 'border-l-care-orange',
    'approved': 'border-l-success',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg border border-border p-4 cursor-pointer",
        "hover:shadow-md transition-shadow",
        "border-l-4",
        statusStyles[job.status]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="font-medium text-foreground">{job.date}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{job.startTime} ~ {job.endTime}</span>
          </div>

          {job.service && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{job.service}</span>
            </div>
          )}
          
          {(job.clientAddress || job.clientZipCode) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{job.clientAddress ? `${job.clientAddress}, ${job.clientCity || ''} ${job.clientState || ''} ${job.clientZipCode || ''}`.trim() : job.clientZipCode}</span>
            </div>
          )}
        </div>
        
        <div className="text-right space-y-1">
          {(job.clientFirstName || job.clientLastName || job.clientName) && (
            <>
              <p className="text-sm font-semibold text-foreground">
                {job.clientFirstName && job.clientLastName
                  ? `${job.clientFirstName} ${job.clientLastName.charAt(0)}.`
                  : job.clientName}
              </p>
              <p className="text-xs text-muted-foreground">Client</p>
            </>
          )}
          {!job.providerViewed && (
            <span className="inline-block text-[10px] font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
              UPDATED
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
