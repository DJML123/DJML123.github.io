// OnSpot edge function: redeem-iap
// Credits the purchased pack's coins via the idempotent grant ledger.
// The client sends the pack id, this function validates it and credits the
// pack's coins. Once expo-iap lands, the client posts the store receipt
// instead and validation happens against the App Store / Play Store here.
// Each pack can be redeemed once per user (grant_log primary key).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const PACKS: Record<string, number> = {
  starter: 100,
  creator: 515,
  vip: 1050,
  mega: 2150,
  ultra: 4400,
  legendaer: 8950,
  titan: 17100,
  kosmos: 58000,
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

    const { packId } = await req.json();
    const coins = PACKS[packId];
    if (typeof coins !== 'number') {
      return new Response(JSON.stringify({ error: 'unknown pack' }), { status: 400, headers: cors });
    }

    const reason = `iap:${packId}`;
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