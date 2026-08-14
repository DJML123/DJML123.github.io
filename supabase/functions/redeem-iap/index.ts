// OnSpot edge function: redeem-iap
// Credits the purchased pack's coins via the idempotent grant ledger.
// The client sends the pack id plus the store's transaction id; this function
// validates the pack and credits its coins. Once expo-iap lands, the client
// posts the full store receipt instead and validation happens against the App
// Store / Play Store here - the transaction id below is then read out of the
// verified receipt rather than trusted from the client.
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

/** Store transaction ids are opaque strings; bound the shape so a client
 *  cannot stuff a novel into the ledger's primary key. */
const VALID_TRANSACTION_ID = /^[A-Za-z0-9._:-]{6,128}$/;

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
    let body: { packId?: unknown; transactionId?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid json body' }, 400);
    }

    const packId = typeof body.packId === 'string' ? body.packId : '';
    const coins = PACKS[packId];
    if (typeof coins !== 'number') return json({ error: 'unknown pack' }, 400);

    // The ledger key is the *purchase*, not the pack.
    //
    // This used to be `iap:${packId}`, and `grant_log`'s primary key is
    // (user_id, reason) - so the second time anyone bought the same pack, the
    // insert hit the conflict and the function answered "already claimed" with
    // zero coins. Paid, nothing delivered. Coin packs are consumables: the
    // thing that may only be credited once is one transaction, and the store
    // gives every purchase its own id.
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId : '';
    if (!VALID_TRANSACTION_ID.test(transactionId)) {
      return json({ error: 'missing or malformed transactionId' }, 400);
    }

    const reason = `iap:${packId}:${transactionId}`;

    // No pre-flight SELECT: `claim_grant` inserts the ledger row and credits
    // the wallet in one transaction, reports whether it was the call that did
    // so, and is idempotent by construction - reading first only added a round
    // trip and a window in which two parallel requests both saw "not claimed".
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
      packId,
    });
  } catch (err) {
    // Logged in full for the operator, generic for the caller - the raw error
    // text can carry table names and constraint details.
    console.error('[redeem-iap]', err);
    return json({ error: 'internal error' }, 500);
  }
});
