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
    const { userIds, title, body, data } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get FCM tokens for specified users
    const { data: tokens } = await supabaseClient
      .from('fcm_tokens')
      .select('token, user_id')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active tokens found for specified users' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create in-app notifications for all users
    const notifications = userIds.map((userId: string) => ({
      user_id: userId,
      type: data?.type || 'general',
      title,
      message: body,
      metadata: data || {},
    }));

    await supabaseClient
      .from('user_notifications')
      .insert(notifications);

    // Get Firebase service account
    const firebaseConfig = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    
    if (!firebaseConfig) {
      console.log('Firebase config not found, notifications saved to database only');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notifications saved to database (FCM not configured)',
          notificationCount: notifications.length
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Parse Firebase config
    const serviceAccount = JSON.parse(firebaseConfig);
    
    // Get OAuth2 access token
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };
    const jwtClaimSetEncoded = btoa(JSON.stringify(jwtClaimSet));
    
    // Import private key
    const privateKey = serviceAccount.private_key;
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKey.substring(
      pemHeader.length,
      privateKey.length - pemFooter.length
    ).replace(/\s/g, '');
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Sign JWT
    const dataToSign = `${jwtHeader}.${jwtClaimSetEncoded}`;
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(dataToSign)
    );
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${dataToSign}.${signatureBase64}`;
    
    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    
    const { access_token } = await tokenResponse.json();
    
    // Send FCM messages
    const results = await Promise.allSettled(
      tokens.map(async ({ token }) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: data || {},
              },
            }),
          }
        );
        
        if (!response.ok) {
          const error = await response.text();
          console.error(`Failed to send to token ${token}:`, error);
          
          // Deactivate invalid tokens
          if (error.includes('INVALID') || error.includes('NOT_FOUND')) {
            await supabaseClient
              .from('fcm_tokens')
              .update({ is_active: false })
              .eq('token', token);
          }
          
          throw new Error(error);
        }
        
        return response.json();
      })
    );
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Push notifications sent: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifications sent',
        tokenCount: tokens.length,
        successCount,
        failCount,
        notificationCount: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
