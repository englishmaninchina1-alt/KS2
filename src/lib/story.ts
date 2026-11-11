export type StoryRole = 'user' | 'assistant';

export type StoryMessage = { role: StoryRole; content: string };

export type StoryPlan = {
  who: string;
  where: string;
  problem: string;
  ending: string;
};

const MESSAGES: Record<string, string> = {
  not_configured:
    'The story coach is still being set up. A grown-up needs to add the OPENAI key in the site secrets.',
  rate_limited: 'You have written a lot today! Take a little break, then come back in an hour.',
  too_large: 'That message was very long. Try sending a shorter part of your story.',
  bad_request: 'The coach did not catch that. Try writing it another way.',
  upstream: 'The coach got tangled in a sentence. Try again in a moment.',
  upstream_unreachable: 'The coach could not reach the story library. Try again in a moment.',
  no_model: 'The story coach is not available right now. Try again later.',
  empty_reply: 'The coach lost its words. Try asking again.',
  offline: 'You seem to be offline. Check your connection and try again.',
  not_live:
    'The story coach runs on the published site. Open the live Word Wizards link to write a story.',
};

export class StoryError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'StoryError';
    this.code = code;
  }
}

type AskInput = {
  messages: StoryMessage[];
  plan: StoryPlan;
  category: string;
  words: string[];
};

export async function askStoryCoach(input: AskInput): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/story', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new StoryError('offline', MESSAGES.offline);
  }

  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new StoryError('not_live', MESSAGES.not_live);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code = typeof data?.error === 'string' ? data.error : 'upstream';
    throw new StoryError(code, MESSAGES[code] ?? MESSAGES.upstream);
  }

  if (!data || typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new StoryError('empty_reply', MESSAGES.empty_reply);
  }

  return data.reply.trim();
}
