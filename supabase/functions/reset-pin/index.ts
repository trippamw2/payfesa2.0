import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { hash } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPinRequest {
  phone_number: string;
  new_pin: string;
  verification_code?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ResetPinRequest = await req.json();

    if (!body.phone_number || !body.new_pin) {
      throw new Error('Phone number and new PIN are required');
    }

    if (body.new_pin.length !== 6 || !/^\d+$/.test(body.new_pin)) {
      throw new Error('PIN must be exactly 6 digits');
    }

    // Find user by phone number
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone_number, name')
      .eq('phone_number', body.phone_number)
      .single();

    if (userError || !user) {
      throw new Error('User not found with this phone number');
    }

    // TODO: In production, verify the verification_code here
    // For now, we'll allow PIN reset with just phone number
    // if (!body.verification_code || body.verification_code !== 'expected_code') {
    //   throw new Error('Invalid verification code');
    // }

    // Hash the new PIN
    const newPinHash = await hash(body.new_pin);

    // Update user's PIN
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        pin_hash: newPinHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating PIN:', updateError);
      throw new Error('Failed to update PIN');
    }

    // Log the PIN reset
    await supabase.functions.invoke('log-analytics-event', {
      body: {
        event_type: 'pin_reset',
        user_id: user.id,
        metadata: {
          phone_number: body.phone_number,
          timestamp: new Date().toISOString()
        }
      }
    });

    console.log('PIN reset successful for user:', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PIN reset successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Reset PIN error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
