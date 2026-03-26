import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';

interface PaymentEditFormProps {
  data: { cardNumber: string };
  onSave: (data: { cardNumber: string }) => Promise<void>;
  onCancel: () => void;
}

const PaymentEditForm = ({ data, onSave, onCancel }: PaymentEditFormProps) => {
  const [cardNumber, setCardNumber] = useState(data.cardNumber);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ cardNumber });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Payment processing will be available soon. You can update your card details here when it's ready.
      </p>
      <div>
        <Label className="text-xs text-muted-foreground">Card Number</Label>
        <Input
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="•••• •••• •••• ••••"
          maxLength={19}
          className="border-0 border-b border-input rounded-none px-0 focus-visible:ring-0"
        />
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

export default PaymentEditForm;
