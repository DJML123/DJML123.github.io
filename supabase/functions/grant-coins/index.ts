// OnSpot edge function: grant-coins
// Credits a fixed, server-defined coin amount to the caller's wallet.
// The client only ever asks "grant me the referral bonus" - the amounts
// live here, so they cannot be tampered with. Credits are idempotent:
// the grant_log table guarantees each user+reason can be claimed once.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const GRANTS: Record<string, number> = {
  referral: 100,
};

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'missing auth' }), { status: 401, headers: cors });
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: cors });

    const { reason } = await req.json();
    const coins = GRANTS[reason];
    if (typeof coins !== 'number') {
      return new Response(JSON.stringify({ error: 'unknown grant reason' }), { status: 400, headers: cors });
    }

    const { data: existing } = await supabase
      .from('grant_log')
      .select('coins')
      .eq('user_id', user.id)
      .eq('reason', reason)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ granted: 0, balance: null, alreadyClaimed: true }),
        { status: 200, headers: cors },
      );
    }

    const { data: balance, error } = await supabase.rpc('claim_grant', {
      p_user: user.id,
      p_reason: reason,
      p_coins: coins,
    });
    if (error) throw error;

    return new Response(
      JSON.stringify({ granted: coins, balance, alreadyClaimed: false }),
      { status: 200, headers: cors },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
