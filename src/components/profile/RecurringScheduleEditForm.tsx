import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

interface RecurringScheduleEditFormProps {
  data: { recurringWeekly: string };
  onSave: (data: { recurringWeekly: string }) => Promise<void>;
  onCancel: () => void;
}

const RecurringScheduleEditForm = ({ data, onSave, onCancel }: RecurringScheduleEditFormProps) => {
  const [value, setValue] = useState(data.recurringWeekly);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ recurringWeekly: value });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Frequency</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="border rounded-md mt-1">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No, one-time only</SelectItem>
            <SelectItem value="every-day">Every Day</SelectItem>
            <SelectItem value="every-other-day">Every Other Day</SelectItem>
            <SelectItem value="every-week">Every Week</SelectItem>
            <SelectItem value="every-2-weeks">Every 2 Weeks</SelectItem>
            <SelectItem value="every-3-weeks">Every 3 Weeks</SelectItem>
            <SelectItem value="every-month">Every Month</SelectItem>
            <SelectItem value="monday">Every Monday</SelectItem>
            <SelectItem value="tuesday">Every Tuesday</SelectItem>
            <SelectItem value="wednesday">Every Wednesday</SelectItem>
            <SelectItem value="thursday">Every Thursday</SelectItem>
            <SelectItem value="friday">Every Friday</SelectItem>
            <SelectItem value="saturday">Every Saturday</SelectItem>
            <SelectItem value="sunday">Every Sunday</SelectItem>
            <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
            <SelectItem value="weekends">Weekends (Sat–Sun)</SelectItem>
          </SelectContent>
        </Select>
      </div>
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

export default RecurringScheduleEditForm;
