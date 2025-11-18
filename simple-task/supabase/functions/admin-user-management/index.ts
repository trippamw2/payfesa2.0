import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, user_id, data } = await req.json();

    console.log('Admin action:', action, 'for user:', user_id);

    switch (action) {
      case 'suspend':
        // Ban user in auth
        const { error: banError } = await supabaseClient.auth.admin.updateUserById(user_id, {
          ban_duration: '876000h', // ~100 years
        });
        if (banError) throw banError;

        // Update user frozen status
        await supabaseClient.from('users').update({ frozen: true }).eq('id', user_id);
        
        return new Response(
          JSON.stringify({ success: true, message: 'User suspended successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'unsuspend':
        // Unban user in auth
        const { error: unbanError } = await supabaseClient.auth.admin.updateUserById(user_id, {
          ban_duration: 'none',
        });
        if (unbanError) throw unbanError;

        // Update user frozen status
        await supabaseClient.from('users').update({ frozen: false }).eq('id', user_id);
        
        return new Response(
          JSON.stringify({ success: true, message: 'User unsuspended successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'reset_pin':
        // Generate random PIN
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();
        const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
        const hashedPin = await bcrypt.hash(newPin);

        // Update user PIN
        await supabaseClient.from('users').update({ 
          pin_hash: hashedPin 
        }).eq('id', user_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `PIN reset to: ${newPin}`,
            new_pin: newPin 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'make_admin':
        // Add admin role
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .upsert({ user_id, role: 'admin' }, { onConflict: 'user_id,role' });
        
        if (roleError) throw roleError;

        return new Response(
          JSON.stringify({ success: true, message: 'User granted admin role' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'update_role':
        const { role, remove } = data;
        
        if (remove) {
          // Remove role
          await supabaseClient
            .from('user_roles')
            .delete()
            .eq('user_id', user_id)
            .eq('role', role);
        } else {
          // Add role
          await supabaseClient
            .from('user_roles')
            .upsert({ user_id, role }, { onConflict: 'user_id,role' });
        }

        return new Response(
          JSON.stringify({ success: true, message: `Role ${remove ? 'removed' : 'added'} successfully` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in admin-user-management:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
