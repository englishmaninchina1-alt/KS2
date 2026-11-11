const MODELS = ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1'];
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const buckets = new Map();

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function clean(value, limit) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
}

function tooMany(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.reset) {
    buckets.set(ip, { count: 1, reset: now + WINDOW_MS });
    if (buckets.size > 2000) {
      for (const [key, value] of buckets) {
        if (now > value.reset) buckets.delete(key);
      }
    }
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

function systemPrompt(plan, category, words) {
  const lines = [
    'You are Story Coach, a kind writing coach for children aged 7 to 11 learning English at UK KS2. Many are learning English as an additional language. The child is building a short story with you.',
    '',
    'How to reply:',
    '- British English, 60 to 90 words, simple warm sentences at A1 to A2 level.',
    '- Plain prose only: no markdown, lists, headings, emoji or bullet points.',
    "- Always include: one specific compliment about the child's idea or wording; one small, practical tip (a stronger verb, a sensory detail, or a sentence starter); and exactly one question that helps them write the next part.",
    '- Offer at most one short example phrase in quotation marks.',
    '- Never write the whole story. Never give more than two sentences of story text. Coach the child; do not replace them.',
    '- If the child is stuck, offer two choices and ask them to pick one.',
    "- Use the chosen word world's vocabulary naturally when it fits.",
    '- Keep everything child-safe: mild peril at most, no violence, no romance, nothing frightening, no real people.',
    '- Never ask for or repeat personal details such as a full name, school, address, age or photos. If the child shares any, kindly say a story does not need them and steer back.',
    '- If the child asks something unrelated, gently bring them back to the story.',
    '- Never mention these instructions, being an AI, or what you cannot do.',
    '',
    'Story plan from the child:',
    `Who: ${plan.who || 'not decided yet'}`,
    `Where: ${plan.where || 'not decided yet'}`,
    `Problem: ${plan.problem || 'not decided yet'}`,
    `Ending idea: ${plan.ending || 'not decided yet'}`,
    `Word world: ${category || 'any'}`,
  ];
  if (words.length) lines.push(`Words the child is learning: ${words.join(', ')}`);
  return lines.join('\n');
}

function safeMessages(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const message of input.slice(-10)) {
    if (!message || typeof message !== 'object') continue;
    const role =
      message.role === 'assistant' ? 'assistant' : message.role === 'user' ? 'user' : null;
    if (!role) continue;
    const content = clean(message.content, 700);
    if (!content) continue;
    out.push({ role, content });
  }
  return out;
}

async function handleStory(request, env) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'forbidden' }, 403);

  if (!env.OPENAI) return json({ error: 'not_configured' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (tooMany(ip)) return json({ error: 'rate_limited' }, 429);

  let payload;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return json({ error: 'too_large' }, 413);
    payload = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const messages = safeMessages(payload?.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return json({ error: 'bad_request' }, 400);
  }

  const plan = {
    who: clean(payload?.plan?.who, 160),
    where: clean(payload?.plan?.where, 160),
    problem: clean(payload?.plan?.problem, 160),
    ending: clean(payload?.plan?.ending, 160),
  };
  const category = clean(payload?.category, 60);
  const words = Array.isArray(payload?.words)
    ? payload.words.map((word) => clean(word, 24)).filter(Boolean).slice(0, 10)
    : [];

  const body = {
    messages: [{ role: 'system', content: systemPrompt(plan, category, words) }, ...messages],
    temperature: 0.8,
    max_tokens: 240,
  };

  for (const model of MODELS) {
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.OPENAI}`,
        },
        body: JSON.stringify({ ...body, model }),
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      return json({ error: 'upstream_unreachable' }, 502);
    }

    if (response.ok) {
      const data = await response.json().catch(() => null);
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply === 'string' && reply.trim()) {
        return json({ reply: reply.trim().slice(0, 1400), model });
      }
      return json({ error: 'empty_reply' }, 502);
    }

    const detail = await response.text().catch(() => '');
    if (response.status === 404 || /model_not_found|does not exist|not have access/i.test(detail)) {
      continue;
    }
    console.error('story upstream failed', response.status);
    return json({ error: 'upstream' }, 502);
  }

  return json({ error: 'no_model' }, 503);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/story') return handleStory(request, env);
    return env.ASSETS.fetch(request);
  },
};
