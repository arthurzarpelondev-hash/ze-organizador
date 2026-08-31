import { buildPushPayload } from '@block65/webcrypto-web-push';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Ze-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

function checkSecret(request, env) {
  return request.headers.get('X-Ze-Secret') === env.SHARED_SECRET;
}

async function handleSubscribe(request, env) {
  if (!checkSecret(request, env)) return json({ error: 'unauthorized' }, env, 401);
  const subscription = await request.json();
  await env.ZE_KV.put('subscription', JSON.stringify(subscription));
  return json({ ok: true }, env);
}

async function handleReminders(request, env) {
  if (!checkSecret(request, env)) return json({ error: 'unauthorized' }, env, 401);
  const body = await request.json();
  const reminders = Array.isArray(body.reminders) ? body.reminders : [];
  await env.ZE_KV.put('reminders', JSON.stringify(reminders));

  // Mantém só os ids notificados que ainda existem, pra não crescer pra sempre
  const notifiedRaw = await env.ZE_KV.get('notified');
  const notified = notifiedRaw ? JSON.parse(notifiedRaw) : [];
  const stillValid = notified.filter((id) => reminders.some((r) => r.id === id));
  await env.ZE_KV.put('notified', JSON.stringify(stillValid));

  return json({ ok: true, count: reminders.length }, env);
}

async function sendPush(env, subscription, payload) {
  const vapid = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
  const message = { data: JSON.stringify(payload), options: { ttl: 3600 } };
  const pushPayload = await buildPushPayload(message, subscription, vapid);
  return fetch(subscription.endpoint, pushPayload);
}

async function checkAndNotify(env) {
  const [subRaw, remindersRaw, notifiedRaw] = await Promise.all([
    env.ZE_KV.get('subscription'),
    env.ZE_KV.get('reminders'),
    env.ZE_KV.get('notified'),
  ]);
  if (!subRaw || !remindersRaw) return { sent: 0 };

  const subscription = JSON.parse(subRaw);
  const reminders = JSON.parse(remindersRaw);
  const notified = notifiedRaw ? JSON.parse(notifiedRaw) : [];
  const notifiedSet = new Set(notified);

  const now = Date.now();
  let sent = 0;

  for (const r of reminders) {
    if (notifiedSet.has(r.id)) continue;
    const due = new Date(r.datetimeUTC).getTime();
    if (isNaN(due) || due > now) continue;

    try {
      const body = `Está na hora de ${r.title}`;
      await sendPush(env, subscription, { title: 'Zé', body, id: r.id });
      sent++;
    } catch (err) {
      console.error('push failed', err);
    }
    notifiedSet.add(r.id);
  }

  if (sent > 0) {
    await env.ZE_KV.put('notified', JSON.stringify([...notifiedSet]));
  }
  return { sent };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }
    const url = new URL(request.url);

    if (url.pathname === '/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }
    if (url.pathname === '/reminders' && request.method === 'POST') {
      return handleReminders(request, env);
    }
    if (url.pathname === '/check' && request.method === 'POST') {
      if (!checkSecret(request, env)) return json({ error: 'unauthorized' }, env, 401);
      const result = await checkAndNotify(env);
      return json(result, env);
    }
    if (url.pathname === '/health') {
      return json({ ok: true }, env);
    }
    return json({ error: 'not found' }, env, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAndNotify(env));
  },
};
