/**
 * Prepare live data for the signed-in Maestro flows.
 * Credentials come only from QA_CLIENT_EMAIL and QA_CLIENT_PASSWORD.
 * This script never prints those values or the access token.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function readSupabaseConfig() {
  const source = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase.js'), 'utf8');
  const url = source.match(/supabaseUrl = '([^']+)'/);
  const anonKey = source.match(/supabaseAnonKey = '([^']+)'/);
  if (!url || !anonKey) {
    fail('Could not read the app Supabase config.');
  }
  return { url: url[1], anonKey: anonKey[1] };
}

const email = process.env.QA_CLIENT_EMAIL || '';
const password = process.env.QA_CLIENT_PASSWORD || '';

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  if (!email || !password) {
    fail('QA client secrets are missing. Refusing to seed.');
  }

  const { url, anonKey } = readSupabaseConfig();
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError || !authData.user) {
    fail(`QA sign-in failed (${authError?.code || authError?.status || 'unknown'}).`);
  }

  const userId = authData.user.id;

  const { error: notificationError } = await supabase.from('notifications').insert({
    user_id: userId,
    title: 'QA notification',
    body: 'Please review this care update',
    read: false,
  });
  if (notificationError) {
    fail(`Could not insert QA notification (${notificationError.code || 'unknown'}).`);
  }

  const marker = 'QA provider connection';
  const scheduled = new Date();
  scheduled.setUTCDate(scheduled.getUTCDate() + 1);
  const scheduledDate = scheduled.toISOString().slice(0, 10);

  const { data: existing, error: existingError } = await supabase
    .from('bookings')
    .select('id, provider_user_id')
    .eq('client_user_id', userId)
    .eq('service', marker)
    .limit(1);
  if (existingError) {
    fail(`Could not read QA booking (${existingError.code || 'unknown'}).`);
  }

  if (existing && existing.length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        provider_user_id: userId,
        status: 'upcoming',
        scheduled_date: scheduledDate,
        client_zip_code: '95814',
      })
      .eq('id', existing[0].id)
      .select('id');
    if (updateError || !updated || updated.length !== 1) {
      fail(`Could not attach a provider to the QA booking (${updateError?.code || 'no row'}).`);
    }
  } else {
    const { error: insertError } = await supabase.from('bookings').insert({
      client_user_id: userId,
      provider_user_id: userId,
      scheduled_date: scheduledDate,
      start_time: '7:00 AM',
      end_time: '12:00 PM',
      service: marker,
      status: 'upcoming',
      client_zip_code: '95814',
    });
    if (insertError) {
      fail(`Could not create QA booking with a provider (${insertError.code || 'unknown'}).`);
    }
  }

  console.log('Seeded an unread notification and a provider-connected booking.');
}

main().catch((err) => {
  const code = err && err.code ? err.code : 'unknown';
  fail(`QA seed failed (${code}).`);
});
