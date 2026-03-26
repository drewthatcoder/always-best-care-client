import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';

interface AddressEditFormProps {
  data: {
    address: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
  };
  onSave: (data: AddressEditFormProps['data']) => Promise<void>;
  onCancel: () => void;
}

const AddressEditForm = ({ data, onSave, onCancel }: AddressEditFormProps) => {
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
        <Label className="text-xs text-muted-foreground">Street Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Address Line 2</Label>
        <Input value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">State</Label>
          <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0" />
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

export default AddressEditForm;
