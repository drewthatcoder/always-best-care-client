import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Save, X, Plus, CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';

interface ScheduledDatesEditFormProps {
  /** Raw date strings in 'MMMM d, yyyy' display format */
  data: { scheduledDates: string[]; rawDates: string[] };
  onSave: (rawDates: string[]) => Promise<void>;
  onCancel: () => void;
}

const ScheduledDatesEditForm = ({ data, onSave, onCancel }: ScheduledDatesEditFormProps) => {
  // Convert raw ISO dates to Date objects
  const [dates, setDates] = useState<Date[]>(
    data.rawDates.map((d) => new Date(d + 'T00:00:00'))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const isoStrings = dates.map((d) => format(d, 'yyyy-MM-dd'));
    await onSave(isoStrings);
    setSaving(false);
  };

  const removeDate = (index: number) => {
    setDates((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{dates.length} date{dates.length !== 1 ? 's' : ''} selected</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <CalendarIcon className="w-4 h-4" />
              Add Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="multiple"
              selected={dates}
              onSelect={(selected) => setDates(selected ?? [])}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {dates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dates
            .sort((a, b) => a.getTime() - b.getTime())
            .map((date, i) => (
              <div
                key={i}
                className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-xs font-medium"
              >
                {format(date, 'MMMM d, yyyy')}
                <button type="button" onClick={() => removeDate(i)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1 gap-2">
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm" className="flex-1 gap-2">
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ScheduledDatesEditForm;
