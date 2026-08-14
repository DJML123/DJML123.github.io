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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Every response is JSON, so every response says so - without the header a
 *  browser client gets a string it has to guess the type of. */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing auth' }, 401);
    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'unauthorized' }, 401);

    // A malformed body is the client's mistake, not a server fault: parsed
    // separately so it answers 400 instead of falling into the catch below and
    // reporting a 500 with the raw error text.
    let body: { reason?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid json body' }, 400);
    }

    const reason = typeof body.reason === 'string' ? body.reason : '';
    const coins = GRANTS[reason];
    if (typeof coins !== 'number') return json({ error: 'unknown grant reason' }, 400);

    // No pre-flight SELECT on grant_log: `claim_grant` does the ledger insert
    // and the wallet credit in one transaction and reports whether it was the
    // call that credited, so checking first only added a round trip and a
    // window in which two parallel requests both saw "not claimed yet".
    const { data, error } = await supabase.rpc('claim_grant', {
      p_user: user.id,
      p_reason: reason,
      p_coins: coins,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const granted = row?.granted === true;
    return json({
      granted: granted ? coins : 0,
      balance: row?.balance ?? null,
      alreadyClaimed: !granted,
    });
  } catch (err) {
    // Logged in full for the operator, generic for the caller - the raw error
    // text can carry table names and constraint details.
    console.error('[grant-coins]', err);
    return json({ error: 'internal error' }, 500);
  }
});
