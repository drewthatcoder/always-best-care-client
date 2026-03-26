import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const HOUR_OPTIONS = [
  { value: 'mornings', label: 'Mornings: 7 am – 12 pm' },
  { value: 'afternoons', label: 'Afternoons: 12 pm – 5 pm' },
  { value: 'evenings', label: 'Evenings: 5 pm – 10 pm' },
];

interface AvailableHoursEditFormProps {
  data: { availableHours: string[] };
  onSave: (formData: { availableHours: string[] }) => void;
  onCancel: () => void;
}

const AvailableHoursEditForm = ({ data, onSave, onCancel }: AvailableHoursEditFormProps) => {
  const [selected, setSelected] = useState<string[]>(data.availableHours);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {HOUR_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <Checkbox
              checked={selected.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
            />
            <span className="text-sm font-medium text-foreground">{option.label}</span>
          </label>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-destructive">Please select at least one time block.</p>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={selected.length === 0}
          onClick={() => onSave({ availableHours: selected })}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default AvailableHoursEditForm;
