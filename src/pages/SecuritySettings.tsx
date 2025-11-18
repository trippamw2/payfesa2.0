import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import bcrypt from 'bcryptjs';

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdatePin = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Please fill all PIN fields');
      return;
    }

    if (newPin.length !== 6 || confirmPin.length !== 6) {
      toast.error('PIN must be 6 digits');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('New PINs do not match');
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('pin_hash')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        toast.error('Failed to verify current PIN');
        return;
      }

      if (!userData || !userData.pin_hash) {
        toast.error('User security data not found. Please contact support.');
        return;
      }

      const isValid = await bcrypt.compare(currentPin, userData.pin_hash);
      if (!isValid) {
        toast.error('Current PIN is incorrect');
        return;
      }

      const newPinHash = await bcrypt.hash(newPin, 10);

      const { error } = await supabase
        .from('users')
        .update({ pin_hash: newPinHash })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('PIN updated successfully');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      console.error('Error updating PIN:', error);
      toast.error('Failed to update PIN');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="hover:bg-white/20 text-white hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Security Settings</h1>
            <p className="text-sm text-white/80">Manage your account security</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change PIN
            </CardTitle>
            <CardDescription>Update your 6-digit security PIN</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Current PIN</Label>
              <InputOTP
                maxLength={6}
                value={currentPin}
                onChange={setCurrentPin}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-2">
              <Label>New PIN</Label>
              <InputOTP
                maxLength={6}
                value={newPin}
                onChange={setNewPin}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-2">
              <Label>Confirm New PIN</Label>
              <InputOTP
                maxLength={6}
                value={confirmPin}
                onChange={setConfirmPin}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button onClick={handleUpdatePin} disabled={updating} className="w-full">
              {updating ? 'Updating...' : 'Update PIN'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Never share your PIN with anyone</p>
            <p>• Change your PIN regularly</p>
            <p>• Use a unique PIN that's hard to guess</p>
            <p>• Don't use obvious PINs like 123456 or your birthday</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
