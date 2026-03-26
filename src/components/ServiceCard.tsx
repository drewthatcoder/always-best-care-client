import { cn } from '@/lib/utils';

import bathingImg from '@/assets/services/bathing.jpg';
import transferringImg from '@/assets/services/transferring.jpg';
import dressingImg from '@/assets/services/dressing.jpg';
import toiletingImg from '@/assets/services/toileting.jpg';
import walkingImg from '@/assets/services/walking.jpg';
import mealImg from '@/assets/services/meal.jpg';
import housekeepingImg from '@/assets/services/housekeeping.jpg';
import medicationImg from '@/assets/services/medication.jpg';
import transportationImg from '@/assets/services/transportation.jpg';

interface ServiceCardProps {
  service: string;
  image: string;
  selected: boolean;
  onToggle: () => void;
}

const ServiceCard = ({ service, image, selected, onToggle }: ServiceCardProps) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex flex-col items-center gap-1 w-full"
    >
      <div className="relative">
        <img
          src={image}
          alt={service}
          className={cn(
            "w-full aspect-square rounded-2xl object-cover transition-all duration-200",
            selected && "ring-2 ring-primary"
          )}
        />
        {/* Circular checkbox overlay */}
        <div className={cn(
          "absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background/80",
          selected ? "border-primary bg-primary" : "border-muted-foreground/50"
        )}>
          {selected && (
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          )}
        </div>
      </div>
      <span className="text-xs text-center font-medium leading-tight text-foreground">
        {service}
      </span>
    </button>
  );
};

export const AVAILABLE_SERVICES = [
  { id: 'bathing', label: 'Bathing & Grooming Assistance', image: bathingImg },
  { id: 'dressing', label: 'Dressing Assistance', image: dressingImg },
  { id: 'transferring', label: 'Transferring Assistance', image: transferringImg },
  { id: 'toileting', label: 'Toileting Assistance', image: toiletingImg },
  { id: 'walking', label: 'Walking Assistance', image: walkingImg },
  { id: 'meal', label: 'Meal Prep/Feeding Assistance', image: mealImg },
  { id: 'housekeeping', label: 'Light Housekeeping Assistance', image: housekeepingImg },
  { id: 'medication', label: 'Medication Assistance', image: medicationImg },
  { id: 'transportation', label: 'Transportation', image: transportationImg },
];

export const AVAILABLE_HOURS = [
  { id: 'mornings', label: 'Mornings: 7 am – 12 pm' },
  { id: 'afternoons', label: 'Afternoons: 12 pm – 5 pm' },
  { id: 'evenings', label: 'Evenings: 5 pm – 10 pm' },
];

export default ServiceCard;
