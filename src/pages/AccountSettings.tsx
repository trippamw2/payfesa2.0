import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    fetchUserData();

    const channel = supabase
      .channel('user-account-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUserData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('name, phone_number, language')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load account data');
        return;
      }

      if (!data) {
        toast.error('User profile not found');
        return;
      }

      setName(data.name || '');
      setPhoneNumber(data.phone_number || '');
      setLanguage(data.language || 'en');
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ name, language })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Account settings updated');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 pb-16">
      <div className="bg-gradient-to-r from-primary to-secondary text-white px-2 py-2 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="hover:bg-white/20 text-white hover:text-white h-7 w-7"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Account Settings</h1>
            <p className="text-[10px] text-white/80">Manage your info</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-2 space-y-2">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-[10px]">Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-3 pt-0">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-[10px]">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone" className="text-[10px]">Phone Number</Label>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phoneNumber}
                  disabled
                  className="flex-1 h-8 text-xs"
                />
              </div>
              <p className="text-[9px] text-muted-foreground">
                Phone number cannot be changed
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="language" className="text-[10px]">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en" className="text-xs">English</SelectItem>
                  <SelectItem value="ny" className="text-xs">Chichewa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-8 text-xs">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
