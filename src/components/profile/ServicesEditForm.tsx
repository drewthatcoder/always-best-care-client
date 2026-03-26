import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import ServiceCard, { AVAILABLE_SERVICES } from '@/components/ServiceCard';

interface ServicesEditFormProps {
  data: { selectedServices: string[] };
  onSave: (data: { selectedServices: string[] }) => Promise<void>;
  onCancel: () => void;
}

const ServicesEditForm = ({ data, onSave, onCancel }: ServicesEditFormProps) => {
  const [selected, setSelected] = useState<string[]>(data.selectedServices);
  const [saving, setSaving] = useState(false);

  const toggleService = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await onSave({ selectedServices: selected });
    setSaving(false);
  };

  const price = selected.length <= 2
    ? selected.length * 55
    : 2 * 55 + (selected.length - 2) * 45;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {AVAILABLE_SERVICES.map((svc) => (
          <ServiceCard
            key={svc.id}
            service={svc.label}
            image={svc.image}
            selected={selected.includes(svc.label)}
            onToggle={() => toggleService(svc.label)}
          />
        ))}
      </div>
      {selected.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium text-foreground">
            {selected.length} service{selected.length > 1 ? 's' : ''} selected
            {' — '}
            <span className="text-primary font-semibold">${price}/visit</span>
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            First 2 services: $55 each · 3rd service and beyond: $45 each
          </p>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving || selected.length === 0} size="sm" className="flex-1 gap-2">
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

export default ServicesEditForm;
