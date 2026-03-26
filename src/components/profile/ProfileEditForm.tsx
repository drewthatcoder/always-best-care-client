import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';

interface ProfileEditFormProps {
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    height: string;
    weight: string;
    zipCode: string;
  };
  onSave: (data: ProfileEditFormProps['data']) => Promise<void>;
  onCancel: () => void;
}

const ProfileEditForm = ({ data, onSave, onCancel }: ProfileEditFormProps) => {
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">First Name</Label>
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Last Name</Label>
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Date of Birth</Label>
        <Input value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Height</Label>
          <Input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Weight</Label>
          <Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Zip Code</Label>
        <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
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

export default ProfileEditForm;
