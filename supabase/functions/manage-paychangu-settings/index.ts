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

    const { config } = await req.json();

    console.log('Saving PayChangu config:', { 
      id: config.id, 
      provider: config.provider, 
      test_mode: config.test_mode,
      enabled: config.enabled,
      has_api_secret: !!config.api_secret
    });

    // Validate required fields
    if (!config.provider || config.provider !== 'paychangu') {
      const error = new Error('Invalid provider');
      console.error('Validation error:', error);
      throw error;
    }

    if (!config.api_secret && config.enabled) {
      const error = new Error('API secret is required when enabled');
      console.error('Validation error:', error);
      throw error;
    }

    console.log('Upserting configuration to database...');

    // Upsert configuration using service role (bypasses RLS)
    const { data, error } = await supabaseClient
      .from('api_configurations')
      .upsert({
        id: config.id,
        provider: config.provider,
        enabled: config.enabled,
        api_key: config.api_key,
        api_secret: config.api_secret,
        webhook_url: config.webhook_url,
        webhook_secret: config.webhook_secret,
        test_mode: config.test_mode,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}${error.details ? ` - ${error.details}` : ''}${error.hint ? ` (${error.hint})` : ''}`);
    }

    console.log('PayChangu config saved successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `PayChangu ${config.test_mode ? 'Test' : 'Live'} configuration saved successfully`,
        data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in manage-paychangu-settings:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error && 'details' in error ? (error as any).details : null;
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
