import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BonusType {
  code: string;
  name: string;
  bonus_amount: number;
  conditions: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('Starting bonus calculation...');

    // Get all active bonus types
    const { data: bonusTypes, error: bonusTypesError } = await supabaseClient
      .from('bonus_types')
      .select('*')
      .eq('is_active', true);

    if (bonusTypesError) throw bonusTypesError;

    console.log(`Processing ${bonusTypes?.length || 0} bonus types...`);

    let totalBonusesAwarded = 0;
    let totalBonusAmount = 0;

    // Get all active users
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, trust_score');

    if (usersError) throw usersError;

    for (const user of users || []) {
      try {
        // ELITE ONLY: Check if user has Trust Score > 90
        const trustScore = user.trust_score || 50;
        
        if (trustScore <= 90) {
          console.log(`User ${user.id} does not qualify (Trust Score: ${trustScore}, required: >90)`);
          continue; // Skip non-elite users
        }

        // Check each bonus type
        for (const bonusType of bonusTypes || []) {
          // Verify bonus requires elite status
          if ((bonusType.conditions?.min_trust_score || 0) > trustScore) {
            continue;
          }

          const eligible = await checkBonusEligibility(
            supabaseClient,
            user.id,
            trustScore,
            bonusType
          );

          if (eligible.isEligible) {
            // Award bonus
            const { error: bonusError } = await supabaseClient
              .from('bonus_transactions')
              .insert({
                user_id: user.id,
                group_id: eligible.groupId,
                bonus_type_code: bonusType.code,
                amount: bonusType.bonus_amount,
                reason: eligible.reason,
                metadata: eligible.metadata,
              });

            if (bonusError) {
              console.error(`Error awarding bonus to user ${user.id}:`, bonusError);
              continue;
            }

            // Credit user's wallet
            await supabaseClient.rpc('update_wallet_balance', {
              p_user_id: user.id,
              p_amount: bonusType.bonus_amount,
            });

            totalBonusesAwarded++;
            totalBonusAmount += bonusType.bonus_amount;

            // Send notification
            try {
              await supabaseClient.functions.invoke('send-push-notification', {
                body: {
                  userIds: [user.id],
                  title: `🎁 ${bonusType.name} Earned!`,
                  body: `Congratulations! You've earned MWK ${bonusType.bonus_amount.toLocaleString()} for ${bonusType.name.toLowerCase()}. ${eligible.reason}`,
                  data: {
                    type: 'bonus_awarded',
                    bonus_code: bonusType.code,
                    amount: bonusType.bonus_amount,
                  },
                },
              });
            } catch (notifError) {
              console.error(`Error sending bonus notification to ${user.id}:`, notifError);
            }

            // Send system message to group if applicable
            if (eligible.groupId) {
              try {
                const { data: userData } = await supabaseClient
                  .from('users')
                  .select('name')
                  .eq('id', user.id)
                  .single();

                await supabaseClient.functions.invoke('send-system-message', {
                  body: {
                    groupId: eligible.groupId,
                    template: 'bonus_awarded',
                    data: {
                      userName: userData?.name || 'A member',
                      bonusName: bonusType.name,
                      bonusAmount: bonusType.bonus_amount,
                    },
                  },
                });
              } catch (msgError) {
                console.error(`Error sending bonus system message:`, msgError);
              }
            }

            console.log(`✅ Awarded ${bonusType.code} to user ${user.id}: MWK ${bonusType.bonus_amount}`);
          }
        }
      } catch (error) {
        console.error(`Error processing bonuses for user ${user.id}:`, error);
      }
    }

    console.log(`✅ Bonus calculation complete: ${totalBonusesAwarded} bonuses awarded, total: MWK ${totalBonusAmount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Awarded ${totalBonusesAwarded} bonuses`,
        total_bonuses: totalBonusesAwarded,
        total_amount: totalBonusAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Bonus calculation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function checkBonusEligibility(
  supabase: any,
  userId: string,
  trustScore: number,
  bonusType: BonusType
): Promise<{
  isEligible: boolean;
  reason?: string;
  metadata?: any;
  groupId?: string;
}> {
  try {
    // ELITE REQUIREMENT: Trust Score must be > 90
    if (trustScore <= 90) {
      return { isEligible: false };
    }

    // Check if user already received this bonus in current cycle
    const { data: existingBonus } = await supabase
      .from('bonus_transactions')
      .select('id, awarded_at')
      .eq('user_id', userId)
      .eq('bonus_type_code', bonusType.code)
      .order('awarded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check max per cycle limit
    if (existingBonus) {
      const daysSinceLastBonus = Math.floor(
        (Date.now() - new Date(existingBonus.awarded_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastBonus < 30) {
        return { isEligible: false }; // One bonus per cycle (30 days)
      }
    }

    const conditions = bonusType.conditions;

    // Get user data for streak checking
    const { data: userData } = await supabase
      .from('users')
      .select('contribution_streak, completed_cycles')
      .eq('id', userId)
      .single();

    const streak = userData?.contribution_streak || 0;

    // ELITE STREAK BONUSES
    if (bonusType.code === 'ELITE_STREAK_100') {
      if (streak >= 100) {
        return {
          isEligible: true,
          reason: `Elite 100-streak bonus unlocked (${streak} contributions)`,
          metadata: { streak, trust_score: trustScore },
        };
      }
    }

    if (bonusType.code === 'ELITE_STREAK_50') {
      if (streak >= 50 && streak < 100) {
        return {
          isEligible: true,
          reason: `Elite 50-streak bonus unlocked (${streak} contributions)`,
          metadata: { streak, trust_score: trustScore },
        };
      }
    }

    if (bonusType.code === 'ELITE_STREAK_20') {
      if (streak >= 20 && streak < 50) {
        return {
          isEligible: true,
          reason: `Elite 20-streak bonus unlocked (${streak} contributions)`,
          metadata: { streak, trust_score: trustScore },
        };
      }
    }

    // ELITE PRIORITY BONUS - for maintaining elite status
    if (bonusType.code === 'ELITE_PRIORITY') {
      if (trustScore > 90) {
        return {
          isEligible: true,
          reason: `Elite priority bonus (Trust Score: ${trustScore})`,
          metadata: { trust_score: trustScore },
        };
      }
    }

    // Legacy bonuses (kept for backward compatibility but require elite status)
    // CONSISTENCY_3: 3 consecutive on-time payments
    if (bonusType.code === 'CONSISTENCY_3') {
      const { data: contributions } = await supabase
        .from('contributions')
        .select('status, completed_at, group_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(3);

      if (contributions && contributions.length >= 3) {
        // Check if they're consecutive (within last 90 days)
        const lastThree = contributions.slice(0, 3);
        const daysDiff = Math.floor(
          (new Date().getTime() - new Date(lastThree[2].completed_at).getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        if (daysDiff <= 90) {
          return {
            isEligible: true,
            reason: '3 consecutive on-time payments',
            metadata: { consecutive_payments: 3 },
            groupId: lastThree[0].group_id,
          };
        }
      }
    }

    // EARLY_BIRD: Pay before deadline
    if (bonusType.code === 'EARLY_BIRD') {
      const { data: earlyPayments } = await supabase
        .from('contributions')
        .select('created_at, group_id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (earlyPayments && earlyPayments.length > 0) {
        // Check if payment was made early (this week)
        return {
          isEligible: true,
          reason: 'Made payment before deadline',
          metadata: { early_payment: true },
          groupId: earlyPayments[0].group_id,
        };
      }
    }

    // TRUST_90: Trust score above 90
    if (bonusType.code === 'TRUST_90') {
      const minScore = conditions.min_trust_score || 90;
      if (trustScore >= minScore && trustScore < 100) {
        return {
          isEligible: true,
          reason: `Trust score ${trustScore} exceeds ${minScore}`,
          metadata: { trust_score: trustScore },
        };
      }
    }

    // PERFECT_SCORE: Trust score 100
    if (bonusType.code === 'PERFECT_SCORE') {
      if (trustScore === 100) {
        return {
          isEligible: true,
          reason: 'Perfect trust score achieved',
          metadata: { trust_score: 100 },
        };
      }
    }

    // NO_MISS: Perfect record bonus
    if (bonusType.code === 'NO_MISS') {
      const { data: contributions } = await supabase
        .from('contributions')
        .select('status')
        .eq('user_id', userId);

      if (contributions && contributions.length >= (conditions.min_cycles || 10)) {
        const missedCount = contributions.filter(
          (c: any) => c.status === 'failed' || c.status === 'missed'
        ).length;

        if (missedCount === 0) {
          return {
            isEligible: true,
            reason: `Completed ${contributions.length} cycles with no missed payments`,
            metadata: { total_cycles: contributions.length, missed: 0 },
          };
        }
      }
    }

    return { isEligible: false };
  } catch (error) {
    console.error(`Error checking eligibility for ${bonusType.code}:`, error);
    return { isEligible: false };
  }
}
