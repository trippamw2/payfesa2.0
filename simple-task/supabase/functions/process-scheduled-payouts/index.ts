import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PaychanguService } from "../_shared/paychangu.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing scheduled payouts for today at 17:00...');

    // Fetch PayChangu configuration from api_configurations
    const { data: payConfig, error: configError } = await supabaseAdmin
      .from('api_configurations')
      .select('*')
      .eq('provider', 'paychangu')
      .eq('enabled', true)
      .order('test_mode', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError || !payConfig || !payConfig.api_key) {
      console.error('PayChangu not configured:', configError);
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PAYCHANGU_SECRET_KEY = payConfig.api_key;
    console.log(`Using PayChangu ${payConfig.test_mode ? 'TEST' : 'LIVE'} mode`);

    // Get all pending payouts scheduled for today
    const { data: scheduledPayouts, error: fetchError } = await supabaseAdmin
      .from('payout_schedule')
      .select('*')
      .eq('scheduled_date', new Date().toISOString().split('T')[0])
      .eq('status', 'pending')
      .lte('payout_time', '17:00:00');

    if (fetchError) {
      console.error('Error fetching scheduled payouts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledPayouts?.length || 0} payouts to process`);

    let processedCount = 0;
    let failedCount = 0;

    for (const payout of scheduledPayouts || []) {
      try {
        // Get user data
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('escrow_balance, name')
          .eq('id', payout.user_id)
          .single();

        if (userError || !userData) {
          console.error(`User not found for payout ${payout.id}:`, userError);
          failedCount++;
          continue;
        }

        // Check if user has sufficient escrow balance
        if (userData.escrow_balance < payout.amount) {
          console.log(`Insufficient escrow balance for payout ${payout.id}, checking reserve wallet...`);
          
          // Activate Reserve Payout Engine
          try {
            const reserveResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/reserve-payout-engine`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  groupId: payout.group_id,
                  userId: payout.user_id,
                  expectedAmount: payout.amount
                })
              }
            );

            const reserveResult = await reserveResponse.json();
            console.log('Reserve engine response:', reserveResult);

            if (!reserveResult.covered) {
              // Reserve couldn't cover, mark as failed
              console.error(`Reserve wallet couldn't cover shortfall for payout ${payout.id}`);
              
              await supabaseAdmin
                .from('payout_schedule')
                .update({
                  status: 'failed',
                  processed_at: new Date().toISOString()
                })
                .eq('id', payout.id);
              
              failedCount++;
              continue;
            }

            console.log(`Reserve wallet covered shortfall for payout ${payout.id} - proceeding with full payout`);
            // Continue processing - escrow balance has been topped up by reserve engine
          } catch (reserveError) {
            console.error(`Error calling reserve engine for payout ${payout.id}:`, reserveError);
            
            await supabaseAdmin
              .from('payout_schedule')
              .update({
                status: 'failed',
                processed_at: new Date().toISOString()
              })
              .eq('id', payout.id);
            
            failedCount++;
            continue;
          }
        }

        // Calculate fees (11% total: 10% platform + 1% reserve)
        const feeAmount = payout.amount * 0.11;
        const platformFee = payout.amount * 0.10; // 10% for platform earnings
        const reserveFee = payout.amount * 0.01;  // 1% for reserve wallet
        const netPayout = payout.amount - feeAmount;

        // Get user's primary payment method (mobile money or bank)
        const { data: mobileAccount } = await supabaseAdmin
          .from('mobile_money_accounts')
          .select('*')
          .eq('user_id', payout.user_id)
          .eq('is_primary', true)
          .eq('is_active', true)
          .maybeSingle();

        const { data: bankAccount } = await supabaseAdmin
          .from('bank_accounts')
          .select('*')
          .eq('user_id', payout.user_id)
          .eq('is_primary', true)
          .maybeSingle();

        if (!mobileAccount && !bankAccount) {
          console.error(`No payment method found for payout ${payout.id}`);
          
          await supabaseAdmin
            .from('payout_schedule')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', payout.id);

          // Send notification
          await supabaseAdmin.functions.invoke('send-push-notification', {
            body: {
              userId: payout.user_id,
              title: 'Payout Failed',
              message: 'No payment method configured. Please add a mobile money account or bank account.',
              data: { type: 'payout_failed', payoutId: payout.id }
            }
          });

          failedCount++;
          continue;
        }

        // Validate payment account details
        if (mobileAccount) {
          if (!mobileAccount.phone_number?.trim() || !mobileAccount.provider?.trim()) {
            console.error(`Incomplete mobile money account for payout ${payout.id}`);
            
            await supabaseAdmin
              .from('payout_schedule')
              .update({
                status: 'failed',
                processed_at: new Date().toISOString()
              })
              .eq('id', payout.id);

            await supabaseAdmin.functions.invoke('send-push-notification', {
              body: {
                userId: payout.user_id,
                title: 'Payout Failed',
                message: 'Mobile money account details are incomplete. Please update your account information.',
                data: { type: 'payout_failed', payoutId: payout.id }
              }
            });

            failedCount++;
            continue;
          }
        } else if (bankAccount) {
          if (!bankAccount.bank_name?.trim() || !bankAccount.account_number?.trim() || !bankAccount.account_name?.trim()) {
            console.error(`Incomplete bank account for payout ${payout.id}`);
            
            await supabaseAdmin
              .from('payout_schedule')
              .update({
                status: 'failed',
                processed_at: new Date().toISOString()
              })
              .eq('id', payout.id);

            await supabaseAdmin.functions.invoke('send-push-notification', {
              body: {
                userId: payout.user_id,
                title: 'Payout Failed',
                message: 'Bank account details are incomplete. Please update your account information.',
                data: { type: 'payout_failed', payoutId: payout.id }
              }
            });

            failedCount++;
            continue;
          }
        }

        // Determine payment method
        const isMobileMoney = !!mobileAccount;

        // Generate unique charge ID
        const chargeId = `SPO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Prepare payment request using unified PaychanguService
        const paymentRequest: any = {
          type: 'payout',
          method: mobileAccount ? 'mobile_money' : 'bank_transfer',
          amount: netPayout,
          chargeId,
          currency: 'MWK',
        };

        if (mobileAccount) {
          paymentRequest.phoneNumber = mobileAccount.phone_number;
          paymentRequest.provider = mobileAccount.provider;
          paymentRequest.accountName = userData.name || mobileAccount.account_name || 'User';
        } else if (bankAccount) {
          paymentRequest.accountNumber = bankAccount.account_number;
          paymentRequest.accountName = bankAccount.account_name;
          paymentRequest.bankName = bankAccount.bank_name;
        }

        console.log('Processing scheduled payout via PaychanguService:', { 
          payoutId: payout.id, 
          chargeId,
          method: paymentRequest.method 
        });

        // Process payment via unified service
        const paymentResult = await PaychanguService.processPayment(
          {
            secretKey: payConfig.api_key,
            baseUrl: 'https://api.paychangu.com',
          },
          paymentRequest
        );

        if (!paymentResult.success) {
          console.error('Payout failed:', paymentResult.error);
          await supabaseAdmin
            .from('payout_schedule')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .eq('id', payout.id);
          failedCount++;
          continue;
        }

        const paychanguTxn = paymentResult.transaction;

        // Update escrow balance (debit)
        const { error: escrowError } = await supabaseAdmin.rpc('update_escrow_balance', {
          p_user_id: payout.user_id,
          p_amount: -payout.amount
        });

        if (escrowError) {
          console.error(`Error updating escrow for payout ${payout.id}:`, escrowError);
          failedCount++;
          continue;
        }

        // Update payout schedule status with Paychangu details
        const { error: payoutUpdateError } = await supabaseAdmin
          .from('payout_schedule')
          .update({
            status: paychanguTxn.status === 'pending' ? 'processing' : 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', payout.id);

        if (payoutUpdateError) {
          console.error(`Error updating payout status ${payout.id}:`, payoutUpdateError);
          // Rollback escrow
          await supabaseAdmin.rpc('update_escrow_balance', {
            p_user_id: payout.user_id,
            p_amount: payout.amount
          });
          failedCount++;
          continue;
        }

        // Create transaction record
        await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: payout.user_id,
            type: 'payout',
            amount: payout.amount,
            status: paychanguTxn.status === 'pending' ? 'processing' : 'completed',
            group_id: payout.group_id,
            details: {
              fee: feeAmount,
              net_payout: netPayout,
              payout_type: 'scheduled',
              scheduled_date: payout.scheduled_date,
              payout_time: payout.payout_time,
              charge_id: chargeId,
              paychangu_ref_id: paychanguTxn.ref_id,
              paychangu_trace_id: paychanguTxn.trace_id,
              payment_method_type: isMobileMoney ? 'mobile_money' : 'bank_transfer'
            }
          });

        // Route 1% to reserve wallet
        try {
          await supabaseAdmin.rpc('add_to_reserve_wallet', {
            p_amount: reserveFee,
            p_group_id: payout.group_id,
            p_user_id: payout.user_id,
            p_reason: `Reserve contribution from scheduled payout ${payout.id}`
          });
          console.log(`Added ${reserveFee} to reserve wallet from payout ${payout.id}`);
        } catch (reserveError) {
          console.error(`Error adding to reserve wallet for payout ${payout.id}:`, reserveError);
        }

        // Create revenue transaction (10% platform fee only)
        await supabaseAdmin
          .from('revenue_transactions')
          .insert({
            transaction_id: payout.id,
            user_id: payout.user_id,
            group_id: payout.group_id,
            revenue_type: 'fee',
            amount: platformFee,
            original_payout_amount: payout.amount,
            net_payout: netPayout,
            fee_percentage: 10
          });

        // Update trust score
        await supabaseAdmin.rpc('update_trust_score', {
          p_user_id: payout.user_id,
          p_change_amount: 2,
          p_reason: 'Scheduled payout received'
        });

        // Send success push notification
        try {
          await supabaseAdmin.functions.invoke('send-push-notification', {
            body: {
              userIds: [payout.user_id],
              title: 'Payout Received',
              body: `Your payout of MWK ${netPayout.toLocaleString()} has been processed successfully. Fee: MWK ${feeAmount.toLocaleString()}`,
              data: {
                type: 'payout_success',
                payoutId: payout.id,
                amount: netPayout.toString(),
                feeAmount: feeAmount.toString(),
              },
            },
          });
        } catch (notifError) {
          console.error('Failed to send success notification:', notifError);
        }

        console.log(`Successfully processed payout ${payout.id} for user ${payout.user_id}`);
        processedCount++;
      } catch (error) {
        console.error(`Error processing payout ${payout.id}:`, error);
        
        // Send failure push notification
        try {
          await supabaseAdmin.functions.invoke('send-push-notification', {
            body: {
              userIds: [payout.user_id],
              title: 'Payout Failed',
              body: 'Your payout could not be processed. Please contact support.',
              data: {
                type: 'payout_failed',
                payoutId: payout.id,
              },
            },
          });
        } catch (notifError) {
          console.error('Failed to send failure notification:', notifError);
        }
        
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        failed: failedCount,
        total: scheduledPayouts?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-scheduled-payouts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
