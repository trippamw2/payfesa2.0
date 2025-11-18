import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, accountId, amount, groupId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get mobile money account
    const { data: account } = await supabaseClient
      .from('mobile_money_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      throw new Error('Mobile money account not found');
    }

    // Generate transaction ID
    const transactionId = `MM${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('mobile_money_transactions')
      .insert({
        user_id: user.id,
        group_id: groupId || null,
        type,
        amount,
        provider: account.provider,
        phone_number: account.phone_number,
        transaction_id: transactionId,
        status: 'pending',
        transaction_category: type === 'deposit' ? 'contribution' : 'payout',
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Simulate mobile money processing (in production, integrate with actual API)
    // For now, we'll immediately mark as processing
    await supabaseClient
      .from('mobile_money_transactions')
      .update({ status: 'processing' })
      .eq('id', transaction.id);

    // TODO: Integrate with actual Airtel Money and TNM Mpamba APIs
    // This would involve making HTTP requests to their APIs
    // and handling callbacks/webhooks

    return new Response(
      JSON.stringify({
        success: true,
        transaction,
        message: 'Transaction initiated successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
