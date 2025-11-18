import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Building2, Plus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PaymentMethod {
  id: string;
  type: 'mobile' | 'bank';
  provider: string;
  details: string;
  is_primary: boolean;
  is_verified: boolean;
}

interface PaymentMethodSelectorProps {
  selectedMethod?: string;
  onMethodSelect: (methodId: string, method: PaymentMethod) => void;
  allowAddNew?: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodSelect,
  allowAddNew = true,
}: PaymentMethodSelectorProps) {
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [mobileData, bankData] = await Promise.all([
        supabase.from('mobile_money_accounts').select('*').eq('user_id', user.id),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
      ]);

      const allMethods: PaymentMethod[] = [];

      mobileData.data?.forEach((acc) => {
        allMethods.push({
          id: `mobile_${acc.id}`,
          type: 'mobile',
          provider: acc.provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba',
          details: acc.phone_number,
          is_primary: acc.is_primary,
          is_verified: acc.is_verified,
        });
      });

      bankData.data?.forEach((acc) => {
        allMethods.push({
          id: `bank_${acc.id}`,
          type: 'bank',
          provider: acc.bank_name,
          details: acc.account_number,
          is_primary: acc.is_primary,
          is_verified: acc.is_verified,
        });
      });

      // Sort: primary first, then verified, then by type
      allMethods.sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return a.type.localeCompare(b.type);
      });

      setMethods(allMethods);

      // Auto-select primary method if nothing selected
      if (!selectedMethod && allMethods.length > 0) {
        const primary = allMethods.find((m) => m.is_primary) || allMethods[0];
        onMethodSelect(primary.id, primary);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (methods.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No payment methods added yet</p>
          </div>
          {allowAddNew && (
            <Button onClick={() => navigate('/payment-settings')} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Select Payment Method</Label>
        {allowAddNew && (
          <Button
            onClick={() => navigate('/payment-settings')}
            variant="ghost"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        )}
      </div>

      <RadioGroup value={selectedMethod} onValueChange={(value) => {
        const method = methods.find(m => m.id === value);
        if (method) onMethodSelect(value, method);
      }}>
        <div className="space-y-2">
          {methods.map((method) => (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedMethod === method.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => onMethodSelect(method.id, method)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={method.id} id={method.id} />
                  
                  <div className={`p-2 rounded-full ${
                    method.type === 'mobile' 
                      ? 'bg-info/10' 
                      : 'bg-warning/10'
                  }`}>
                    {method.type === 'mobile' ? (
                      <Smartphone className="h-5 w-5 text-info" />
                    ) : (
                      <Building2 className="h-5 w-5 text-warning" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{method.provider}</p>
                      {method.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      {method.is_verified && (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {method.type === 'mobile' ? method.details : `****${method.details.slice(-4)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
