import { useState, useEffect } from 'react';
import { Bell, Moon, Globe, Shield, HelpCircle, LogOut, ChevronRight, MapPin, Plus, X, Upload } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [zipCodes, setZipCodes] = useState<{ id: string; zip_code: string }[]>([]);
  const [newZip, setNewZip] = useState('');
  const [addingZip, setAddingZip] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchZipCodes = async () => {
      const { data } = await supabase
        .from('provider_zip_codes')
        .select('id, zip_code')
        .order('created_at', { ascending: true });
      setZipCodes((data as { id: string; zip_code: string }[]) || []);
    };
    fetchZipCodes();
  }, [user]);

  const handleAddZip = async () => {
    const trimmed = newZip.trim();
    if (!trimmed || !/^\d{5}$/.test(trimmed)) {
      toast.error('Please enter a valid 5-digit zip code');
      return;
    }
    if (zipCodes.some((z) => z.zip_code === trimmed)) {
      toast.error('This zip code is already added');
      return;
    }
    if (!user) return;

    setAddingZip(true);
    const { data, error } = await supabase
      .from('provider_zip_codes')
      .insert({ user_id: user.id, zip_code: trimmed })
      .select('id, zip_code')
      .single();
    setAddingZip(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setZipCodes((prev) => [...prev, data as { id: string; zip_code: string }]);
    setNewZip('');
    toast.success(`Zip code ${trimmed} added`);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const text = await file.text();
    const parsed = text
      .split(/[\n,\r]+/)
      .map((v) => v.trim().replace(/^"|"$/g, ''))
      .filter((v) => /^\d{5}$/.test(v));

    const unique = [...new Set(parsed)].filter(
      (z) => !zipCodes.some((existing) => existing.zip_code === z)
    );

    if (unique.length === 0) {
      toast.error('No new valid 5-digit zip codes found in CSV');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingCsv(true);
    const inserts = unique.map((z) => ({ user_id: user.id, zip_code: z }));
    const { data, error } = await supabase
      .from('provider_zip_codes')
      .insert(inserts)
      .select('id, zip_code');
    setUploadingCsv(false);

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (error) {
      toast.error(error.message);
      return;
    }
    setZipCodes((prev) => [...prev, ...(data as { id: string; zip_code: string }[])]);
    toast.success(`${unique.length} zip code${unique.length > 1 ? 's' : ''} added from CSV`);
  };

  const handleRemoveZip = async (id: string, zip: string) => {
    const { error } = await supabase.from('provider_zip_codes').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setZipCodes((prev) => prev.filter((z) => z.id !== id));
    toast.success(`Zip code ${zip} removed`);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const settingsGroups = [
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Push Notifications', hasSwitch: true, defaultChecked: true },
        { icon: Moon, label: 'Dark Mode', hasSwitch: true, defaultChecked: false },
        { icon: Globe, label: 'Language', value: 'English' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Shield, label: 'Privacy & Security' },
        { icon: HelpCircle, label: 'Help & Support' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-40">
        <h1 className="text-lg font-semibold text-center">Settings</h1>
      </header>

      <main className="p-4 space-y-6">
        {/* Service Territory Zip Codes */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
            Service Territory
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <span className="font-medium text-sm">Your Service Zip Codes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              You'll only see jobs and notifications from clients in these zip codes.
            </p>

            {/* Zip code badges */}
            {zipCodes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {zipCodes.map((z) => (
                  <Badge
                    key={z.id}
                    variant="secondary"
                    className="flex items-center gap-1 pl-3 pr-1 py-1.5"
                  >
                    {z.zip_code}
                    <button
                      onClick={() => handleRemoveZip(z.id, z.zip_code)}
                      className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add zip code input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter zip code"
                value={newZip}
                onChange={(e) => setNewZip(e.target.value)}
                maxLength={5}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddZip()}
              />
              <Button
                size="sm"
                onClick={handleAddZip}
                disabled={addingZip}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCsv}
                className="gap-1"
                title="Upload CSV of zip codes"
              >
                <Upload className="w-4 h-4" />
                CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvUpload}
              />
            </div>
          </div>
        </div>

        {settingsGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
              {group.title}
            </h2>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {group.items.map((item, index) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                    index !== group.items.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.hasSwitch ? (
                    <Switch defaultChecked={item.defaultChecked} />
                  ) : item.value ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-sm">{item.value}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Care-On-Demand v1.0.0
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
