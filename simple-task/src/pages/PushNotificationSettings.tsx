import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

export default function PushNotificationSettings() {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    contributions: true,
    payouts: true,
    groupMessages: true,
    achievements: true,
    trustScore: true,
    marketing: false,
  });
  const [fcmSupported, setFcmSupported] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
    loadPreferences();
  }, []);

  const checkNotificationSupport = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setFcmSupported(true);
      setNotificationsEnabled(Notification.permission === 'granted');
    }
    setLoading(false);
  };

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (data?.notification_preferences) {
        setPermissions(data.notification_preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!fcmSupported) {
      toast.error('Push notifications are not supported on this device');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Notifications enabled successfully');
        
        // TODO: Register FCM token
        // const token = await registerFCMToken();
        // await saveFCMToken(token);
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  const updatePreference = async (key: keyof typeof permissions, value: boolean) => {
    const newPermissions = { ...permissions, [key]: value };
    setPermissions(newPermissions);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: newPermissions })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      // Revert on error
      setPermissions(permissions);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-semibold">Push Notifications</h1>
            <p className="text-sm text-white/80">Manage your notification preferences</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notification Status</CardTitle>
            <CardDescription>
              {fcmSupported
                ? 'Push notifications are supported on this device'
                : 'Push notifications are not supported on this device'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!notificationsEnabled ? (
              <Button onClick={requestNotificationPermission} className="w-full">
                <Bell className="mr-2 h-4 w-4" />
                Enable Push Notifications
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-success">
                <Bell className="h-5 w-5" />
                <span>Push notifications are enabled</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose what you want to be notified about</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="contributions">Contributions</Label>
                <p className="text-sm text-muted-foreground">
                  Reminders and confirmations for contributions
                </p>
              </div>
              <Switch
                id="contributions"
                checked={permissions.contributions}
                onCheckedChange={(checked) => updatePreference('contributions', checked)}
                disabled={!notificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="payouts">Payouts</Label>
                <p className="text-sm text-muted-foreground">
                  Updates about upcoming and completed payouts
                </p>
              </div>
              <Switch
                id="payouts"
                checked={permissions.payouts}
                onCheckedChange={(checked) => updatePreference('payouts', checked)}
                disabled={!notificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="groupMessages">Group Messages</Label>
                <p className="text-sm text-muted-foreground">
                  New messages in your groups
                </p>
              </div>
              <Switch
                id="groupMessages"
                checked={permissions.groupMessages}
                onCheckedChange={(checked) => updatePreference('groupMessages', checked)}
                disabled={!notificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="achievements">Achievements</Label>
                <p className="text-sm text-muted-foreground">
                  When you earn new achievements and badges
                </p>
              </div>
              <Switch
                id="achievements"
                checked={permissions.achievements}
                onCheckedChange={(checked) => updatePreference('achievements', checked)}
                disabled={!notificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trustScore">Trust Score</Label>
                <p className="text-sm text-muted-foreground">
                  Changes to your trust score
                </p>
              </div>
              <Switch
                id="trustScore"
                checked={permissions.trustScore}
                onCheckedChange={(checked) => updatePreference('trustScore', checked)}
                disabled={!notificationsEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Marketing & Updates</Label>
                <p className="text-sm text-muted-foreground">
                  News, promotions, and product updates
                </p>
              </div>
              <Switch
                id="marketing"
                checked={permissions.marketing}
                onCheckedChange={(checked) => updatePreference('marketing', checked)}
                disabled={!notificationsEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
