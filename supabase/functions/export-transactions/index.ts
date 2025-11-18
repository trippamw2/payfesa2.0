import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  start_date?: string;
  end_date?: string;
  format?: 'json' | 'csv';
  transaction_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: ExportRequest = await req.json();
    const format = body.format || 'json';

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (body.start_date) {
      query = query.gte('created_at', body.start_date);
    }

    if (body.end_date) {
      query = query.lte('created_at', body.end_date);
    }

    if (body.transaction_type) {
      query = query.eq('type', body.transaction_type);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      console.error('Error fetching transactions:', txError);
      throw new Error('Failed to fetch transactions');
    }

    // Format response based on requested format
    if (format === 'csv') {
      // Convert to CSV
      const headers = ['ID', 'Date', 'Type', 'Amount', 'Status', 'Group ID', 'Phone'];
      const csvRows = [
        headers.join(','),
        ...transactions.map(tx => [
          tx.id,
          new Date(tx.created_at).toISOString(),
          tx.type,
          tx.amount,
          tx.status,
          tx.group_id || '',
          tx.phone || ''
        ].join(','))
      ];

      return new Response(
        csvRows.join('\n'),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`
          },
          status: 200,
        }
      );
    }

    // Return JSON format
    return new Response(
      JSON.stringify({
        success: true,
        transactions,
        count: transactions.length,
        exported_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Export transactions error:', error);
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
