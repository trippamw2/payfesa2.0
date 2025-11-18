import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CreditCard, Smartphone, Building2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface PaymentMethod {
  id: string;
  type: 'mobile' | 'bank';
  name: string;
  details: string;
  is_primary: boolean;
}

export default function PaymentSettings() {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [primaryMethod, setPrimaryMethod] = useState('');

  useEffect(() => {
    fetchPaymentMethods();

    const mobileChannel = supabase
      .channel('mobile-money-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mobile_money_accounts' }, fetchPaymentMethods)
      .subscribe();

    const bankChannel = supabase
      .channel('bank-accounts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchPaymentMethods)
      .subscribe();

    return () => {
      supabase.removeChannel(mobileChannel);
      supabase.removeChannel(bankChannel);
    };
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [mobileData, bankData] = await Promise.all([
        supabase.from('mobile_money_accounts').select('*').eq('user_id', user.id),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id)
      ]);

      const methods: PaymentMethod[] = [];

      mobileData.data?.forEach(acc => {
        methods.push({
          id: `mobile_${acc.id}`,
          type: 'mobile',
          name: acc.provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba',
          details: acc.phone_number,
          is_primary: acc.is_primary
        });
        if (acc.is_primary) setPrimaryMethod(`mobile_${acc.id}`);
      });

      bankData.data?.forEach(acc => {
        methods.push({
          id: `bank_${acc.id}`,
          type: 'bank',
          name: acc.bank_name,
          details: acc.account_number,
          is_primary: acc.is_primary
        });
        if (acc.is_primary) setPrimaryMethod(`bank_${acc.id}`);
      });

      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (methodId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [type, id] = methodId.split('_');
      
      // Clear is_primary from both mobile and bank accounts
      await Promise.all([
        supabase.from('mobile_money_accounts').update({ is_primary: false }).eq('user_id', user.id),
        supabase.from('bank_accounts').update({ is_primary: false }).eq('user_id', user.id)
      ]);

      // Set the selected account as primary
      if (type === 'mobile') {
        const { error } = await supabase.from('mobile_money_accounts').update({ is_primary: true }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', id);
        if (error) throw error;
      }

      setPrimaryMethod(methodId);
      toast.success('Primary payment method updated');
    } catch (error) {
      console.error('Error setting primary method:', error);
      toast.error('Failed to update primary method');
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
            <h1 className="text-sm font-semibold">Payment Settings</h1>
            <p className="text-[10px] text-white/80">Manage payment methods</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-2 space-y-2">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" />
              Default Payment Method
            </CardTitle>
            <CardDescription className="text-[10px]">
              Choose default payment method
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {paymentMethods.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-[10px] text-muted-foreground mb-2">No payment methods</p>
                <div className="flex gap-1.5 justify-center">
                  <Button onClick={() => navigate('/mobile-money')} size="sm" className="h-7 text-[10px]">
                    <Smartphone className="mr-1 h-3 w-3" />
                    Add Payment
                  </Button>
                  <Button onClick={() => navigate('/bank-accounts')} variant="outline" size="sm" className="h-7 text-[10px]">
                    <Building2 className="mr-1 h-3 w-3" />
                    Add Bank
                  </Button>
                </div>
              </div>
            ) : (
              <RadioGroup value={primaryMethod} onValueChange={handleSetPrimary}>
                <div className="space-y-2">
                  {paymentMethods.map(method => (
                    <div
                      key={method.id}
                      className="flex items-center space-x-2 border rounded-lg p-2 hover:bg-accent/50 transition-colors"
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {method.type === 'mobile' ? (
                              <Smartphone className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                            )}
                            <div>
                              <p className="text-[10px] font-medium">{method.name}</p>
                              <p className="text-[9px] text-muted-foreground">{method.details}</p>
                            </div>
                          </div>
                          {method.is_primary && (
                            <Badge className="bg-green-100 text-green-700 text-[9px] px-1 py-0">
                              <Check className="h-2.5 w-2.5 mr-0.5" />
                              Primary
                            </Badge>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-2 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/mobile-money')}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-xs font-semibold">Payment Accounts</h3>
                  <p className="text-[10px] text-muted-foreground">Manage accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/bank-accounts')}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-xs font-semibold">Bank Accounts</h3>
                  <p className="text-[10px] text-muted-foreground">Manage banks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
