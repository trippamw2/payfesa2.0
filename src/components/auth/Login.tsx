import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import bcrypt from 'bcryptjs';
import ForgotPin from './ForgotPin';

const Login = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

  // Helper to create users table row if missing
  const ensureUserRowExists = async (authUserId: string, name?: string) => {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle();

    if (existingUser) return true;

    // Create user row with hashed PIN
    const pinHash = await bcrypt.hash(pin, 10);
    const salt = await bcrypt.genSalt(10);
    
    const { error: insertError } = await supabase.from('users').insert({
      id: authUserId,
      name: name || 'PayFesa User',
      phone_number: phoneNumber,
      pin_hash: pinHash,
      pin_salt: salt,
      language,
      wallet_balance: 0,
      escrow_balance: 0,
    });
    
    if (insertError) {
      console.error('Error creating user record:', insertError);
      return false;
    }
    
    return true;
  };

  const handleLogin = async () => {
    if (!phoneNumber || !pin) {
      toast.error(t('required'));
      return;
    }

    if (pin.length !== 4) {
      toast.error(t('pinLength'));
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const email = `phone${cleanPhone}@payfesa.app`;
      const password = `${cleanPhone}${pin}`;

      // Step 1: Try direct sign-in first (most common case)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData?.user && !signInError) {
        // Successfully signed in - ensure users table row exists
        const success = await ensureUserRowExists(signInData.user.id, signInData.user.user_metadata?.name);
        
        if (!success) {
          toast.error(language === 'en' ? 'Failed to initialize profile. Please try again.' : 'Palibe choipa. Yeseraninso.');
          setLoading(false);
          return;
        }
        
        // Add small delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 300));
        
        toast.success(language === 'en' ? 'Welcome back!' : 'Takulandirani!');
        navigate('/dashboard');
        return;
      }

      // Step 2: Sign-in failed - check if user exists in users table and validate PIN
      const { data: userData } = await supabase
        .from('users')
        .select('id, pin_hash, name, frozen')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (!userData) {
        toast.error(language === 'en' ? 'Phone number not found. Please register first.' : 'Nambala ya foni sinapezeke. Chonde lembetsani.');
        return;
      }

      if (userData.frozen) {
        toast.error(language === 'en' ? 'Account is frozen. Please contact support.' : 'Akaunti yanu yatsekeredwa. Chonde lankhulani ndi support.');
        return;
      }

      // Verify PIN
      const pinMatch = await bcrypt.compare(pin, userData.pin_hash);
      if (!pinMatch) {
        toast.error(language === 'en' ? 'Invalid PIN' : 'PIN yolakwika');
        return;
      }

      // Step 3: PIN is correct but auth account doesn't exist - create it
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            phone_number: phoneNumber,
            name: userData.name,
          },
        },
      });

      // Handle user_already_exists error - retry sign-in
      if (signUpError) {
        const errorCode = (signUpError as any).code || signUpError.message;
        
        if (errorCode === 'user_already_exists' || errorCode.includes('already registered')) {
          // Auth account exists but password was wrong - retry sign-in
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (retryData?.user && !retryError) {
            await ensureUserRowExists(retryData.user.id, retryData.user.user_metadata?.name);
            toast.success(language === 'en' ? 'Welcome back!' : 'Takulandirani!');
            navigate('/dashboard');
            return;
          }

          // Still failed - PIN must be wrong for the auth account
          toast.error(
            language === 'en' 
              ? 'Incorrect PIN. Use "Forgot PIN?" to reset.' 
              : 'PIN yolakwika. Gwiritsani ntchito "Mwayiwala PIN?"'
          );
          return;
        }

        console.error('Auth error:', signUpError);
        toast.error(language === 'en' ? 'Login failed' : 'Kulowa kwalephera');
        return;
      }

      if (!signUpData?.user) {
        toast.info(
          language === 'en'
            ? 'Account created. Please check your email to confirm.'
            : 'Akaunti yalengedwa. Chonde onani imelo yanu.'
        );
        return;
      }

      // Success - ensure user row exists and navigate
      await ensureUserRowExists(signUpData.user.id, signUpData.user.user_metadata?.name);
      toast.success(language === 'en' ? 'Welcome!' : 'Takulandirani!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(language === 'en' ? 'An error occurred during login' : 'Pali vuto polowa');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPin) {
    return <ForgotPin onBack={() => setShowForgotPin(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">{t('phoneNumber')}</Label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="+265..."
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="text-lg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pin">{t('pin')}</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="text-lg text-center tracking-widest"
        />
      </div>

      <Button 
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('login')}...
          </>
        ) : (
          t('login')
        )}
      </Button>

      <Button 
        type="button"
        onClick={() => setShowForgotPin(true)}
        variant="link"
        className="w-full text-primary hover:text-primary/80"
      >
        {t('forgotPin')}
      </Button>
    </div>
  );
};

export default Login;