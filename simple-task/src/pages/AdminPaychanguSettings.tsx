import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Key, AlertCircle, Info, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePaychanguConfigRealtime } from '@/hooks/usePaychanguConfigRealtime';

interface PaychanguConfig {
  id: string;
  provider: string;
  enabled: boolean;
  api_key: string | null;
  api_secret: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  test_mode: boolean;
}

const AdminPaychanguSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [testConfig, setTestConfig] = useState<PaychanguConfig | null>(null);
  const [liveConfig, setLiveConfig] = useState<PaychanguConfig | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Realtime updates
  usePaychanguConfigRealtime(() => {
    if (isAdmin) {
      loadAPIConfigs();
    }
  });

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminRole) {
        const adminSession = sessionStorage.getItem('admin_session');
        if (adminSession) {
          try {
            const session = JSON.parse(adminSession);
            const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
            if (ageOk) {
              setIsAdmin(true);
              setLoading(false);
              await loadAPIConfigs();
              return;
            }
          } catch {}
        }
        toast.error('Admin access required');
        navigate('/admin/login');
        return;
      }

      setIsAdmin(true);
      await loadAPIConfigs();
    } catch (error) {
      console.error('Error checking admin access:', error);
      setLoading(false);
      toast.error('Failed to verify admin access');
    } finally {
      setLoading(false);
    }
  };

  const loadAPIConfigs = async () => {
    try {
      console.log('Loading PayChangu configurations...');
      
      // Use edge function to bypass RLS
      const { data: response, error } = await supabase.functions.invoke('get-paychangu-settings');

      console.log('Edge function response:', { response, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to call edge function');
      }
      
      if (!response || !response.success) {
        console.error('Response error:', response);
        throw new Error(response?.error || 'Failed to load configurations');
      }
      
      const data = response.data;
      console.log('Loaded configurations:', data);

      const test = data?.find((c: any) => c.test_mode === true);
      const live = data?.find((c: any) => c.test_mode === false);

      setTestConfig(test || {
        id: crypto.randomUUID(),
        provider: 'paychangu',
        enabled: false,
        api_key: null,
        api_secret: null,
        webhook_url: null,
        webhook_secret: null,
        test_mode: true,
      });

      setLiveConfig(live || {
        id: crypto.randomUUID(),
        provider: 'paychangu',
        enabled: false,
        api_key: null,
        api_secret: null,
        webhook_url: null,
        webhook_secret: null,
        test_mode: false,
      });
      
      toast.success('API configurations loaded successfully');
    } catch (error: any) {
      console.error('Error loading API configs:', error);
      toast.error(error.message || 'Failed to load API configurations');
    }
  };

  const testAPIKeys = async (config: PaychanguConfig) => {
    if (!config.api_key) {
      toast.error('API key is required for testing');
      return;
    }

    setSaving(true);
    try {
      toast.info('Testing PayChangu API keys...');
      
      const testResponse = await fetch('https://api.paychangu.com/payment', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.api_key}`
        },
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@payfesa.com',
          amount: 100,
          currency: 'MWK',
          callback_url: `${window.location.origin}/webhook`,
          return_url: `${window.location.origin}`,
          tx_ref: `TEST-${Date.now()}`,
          customization: {
            title: 'API Test',
            description: 'Testing API configuration'
          }
        })
      });

      const result = await testResponse.json();
      
      if (testResponse.ok && result.status === 'success') {
        toast.success('✅ API keys are valid and working!');
      } else {
        toast.error(`❌ API test failed: ${result.message || 'Invalid API keys'}`);
      }
    } catch (error: any) {
      console.error('API test error:', error);
      toast.error(`API test failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (config: PaychanguConfig) => {
    try {
      setSaving(true);

      // Validate required fields
      if (!config.api_key && config.enabled) {
        toast.error('API Secret Key is required when enabled');
        return;
      }

      // Use edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke('manage-paychangu-settings', {
        body: { config }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      toast.success(data.message || `PayChangu ${config.test_mode ? 'Test' : 'Live'} configuration saved successfully`);
      
      // Update local state with saved data instead of reloading
      if (config.test_mode) {
        setTestConfig(data.data);
      } else {
        setLiveConfig(data.data);
      }
    } catch (error: any) {
      console.error('Error saving API config:', error);
      toast.error(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (testMode: boolean, field: keyof PaychanguConfig, value: any) => {
    if (testMode) {
      setTestConfig(prev => prev ? { ...prev, [field]: value } : null);
    } else {
      setLiveConfig(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const ConfigForm = ({ config, testMode }: { config: PaychanguConfig | null; testMode: boolean }) => {
    if (!config) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {testMode ? 'Test Mode Configuration' : 'Live Mode Configuration'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {testMode 
                ? 'Use this for testing without real transactions' 
                : 'Production configuration for real transactions'}
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => updateConfig(testMode, 'enabled', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${testMode ? 'test' : 'live'}-key`}>API Secret Key</Label>
          <div className="flex gap-2">
            <Key className="h-5 w-5 text-muted-foreground mt-2" />
            <Input
              id={`${testMode ? 'test' : 'live'}-key`}
              type="password"
              value={config.api_key || ''}
              onChange={(e) => updateConfig(testMode, 'api_key', e.target.value)}
              placeholder="Enter PayChangu Secret Key"
              disabled={!config.enabled}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Get this from your PayChangu dashboard
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${testMode ? 'test' : 'live'}-webhook-url`}>Webhook URL</Label>
          <Input
            id={`${testMode ? 'test' : 'live'}-webhook-url`}
            value={config.webhook_url || `${window.location.origin}/api/paychangu-webhook`}
            onChange={(e) => updateConfig(testMode, 'webhook_url', e.target.value)}
            placeholder="https://yourapp.com/api/paychangu-webhook"
            disabled={!config.enabled}
          />
          <p className="text-xs text-muted-foreground">
            Configure this URL in your PayChangu webhook settings
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${testMode ? 'test' : 'live'}-webhook-secret`}>Webhook Secret</Label>
          <Input
            id={`${testMode ? 'test' : 'live'}-webhook-secret`}
            type="password"
            value={config.webhook_secret || ''}
            onChange={(e) => updateConfig(testMode, 'webhook_secret', e.target.value)}
            placeholder="Optional: Webhook verification secret"
            disabled={!config.enabled}
          />
        </div>

        <Button 
          variant="outline"
          onClick={() => testAPIKeys(config)} 
          disabled={saving || !config.enabled || !config.api_key} 
          className="w-full mb-4"
        >
          <Key className="mr-2 h-4 w-4" />
          Test API Keys
        </Button>

        <Button 
          onClick={() => handleSave(config)} 
          disabled={saving || !config.enabled} 
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          Save {testMode ? 'Test' : 'Live'} Configuration
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              PayChangu API Settings
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3" />
                Live Updates
              </Badge>
            </h1>
            <p className="text-muted-foreground">Configure PayChangu payment gateway integration with real-time sync</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Information</AlertTitle>
          <AlertDescription>
            API credentials are encrypted and stored securely. Test mode allows verification without real transactions.
          </AlertDescription>
        </Alert>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>PayChangu Integration</AlertTitle>
          <AlertDescription>
            PayChangu handles all payment operations including:
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>Mobile Money (Airtel Money, TNM Mpamba) and Bank Accounts</li>
              <li>Bank Transfers</li>
              <li>Collections (money in from users)</li>
              <li>Payouts (money out to users)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="test" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="test">Test Mode</TabsTrigger>
            <TabsTrigger value="live">Live Mode</TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle>Test Mode Configuration</CardTitle>
                <CardDescription>
                  Safe testing environment without real transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigForm config={testConfig} testMode={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live">
            <Card>
              <CardHeader>
                <CardTitle>Live Mode Configuration</CardTitle>
                <CardDescription>
                  Production environment for real transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConfigForm config={liveConfig} testMode={false} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPaychanguSettings;
