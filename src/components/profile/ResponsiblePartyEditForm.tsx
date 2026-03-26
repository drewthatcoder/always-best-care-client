import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';

interface ResponsiblePartyEditFormProps {
  data: {
    responsibleParty: string;
    responsiblePartyName: string;
    responsiblePartyEmail: string;
  };
  onSave: (data: ResponsiblePartyEditFormProps['data']) => Promise<void>;
  onCancel: () => void;
}

const ResponsiblePartyEditForm = ({ data, onSave, onCancel }: ResponsiblePartyEditFormProps) => {
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground">Requesting Care For</Label>
        <select
          value={form.responsibleParty}
          onChange={(e) => setForm({ ...form, responsibleParty: e.target.value })}
          className="flex h-10 w-full border-0 border-b border-input rounded-none bg-background px-0 py-2 text-sm focus-visible:outline-none focus-visible:ring-0"
        >
          <option value="myself">Myself</option>
          <option value="someone-else">Someone Else</option>
        </select>
      </div>
      {form.responsibleParty === 'someone-else' && (
        <>
          <div>
            <Label className="text-xs text-muted-foreground">Responsible Party Name</Label>
            <Input value={form.responsiblePartyName} onChange={(e) => setForm({ ...form, responsiblePartyName: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Responsible Party Email</Label>
            <Input value={form.responsiblePartyEmail} onChange={(e) => setForm({ ...form, responsiblePartyEmail: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
          </div>
        </>
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

export default ResponsiblePartyEditForm;
