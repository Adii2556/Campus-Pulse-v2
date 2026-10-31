/* ============================================================
   Vite plugin — dev-server mirror of the /api/* serverless
   functions. Lets `npm run dev` exercise the same code paths
   (and env vars) as the Vercel deployment. Production traffic
   goes to the real functions, not through Vite.
   ============================================================ */
import type { Plugin, Connect, ViteDevServer } from 'vite';
import type { ServerResponse } from 'node:http';
import { runExtraction, runDigest, isAiConfigured } from './ai.ts';

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

async function readBody(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk as Uint8Array);
  const text = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(text); } catch { return null; }
}

type RunFn<T> = (body: T) => Promise<unknown>;
type ValidateInputFn = (body: unknown) => string | null;

function makeHandler<T>(run: RunFn<T>, validateInput: ValidateInputFn): Connect.NextHandleFunction {
  return async (req: Connect.IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'POST only' });
      return;
    }
    const body: unknown = await readBody(req);
    const err = validateInput(body);
    if (err) {
      sendJson(res, 400, { error: err });
      return;
    }
    if (!isAiConfigured()) {
      sendJson(res, 503, { error: 'The AI service is not configured on this deployment.' });
      return;
    }
    try {
      const result = await run(body as T);
      sendJson(res, 200, result);
    } catch (e: unknown) {
      const errObj = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : null;
      const code = typeof errObj?.code === 'string' ? errObj.code : undefined;
      const msg = typeof errObj?.message === 'string' ? errObj.message : 'Unknown AI error';
      if (code === 'INVALID') {
        sendJson(res, 502, { error: 'The AI service returned an unusable result. Try again.' });
        return;
      }
      const timedOut = /abort|timeout|timed out/i.test(msg);
      sendJson(res, timedOut ? 504 : 502, {
        error: timedOut ? 'The AI service took too long to respond.' : msg.slice(0, 240),
      });
    }
  };
}

export default function aiDevPlugin(): Plugin {
  return {
    name: 'campus-pulse-ai-dev',
    configureServer(server: ViteDevServer): void {
      server.middlewares.use('/api/extract', makeHandler<{ text: string }>(
        (body: { text: string }) => runExtraction(body.text, process.env),
        (body: unknown) => {
          if (!body || typeof body !== 'object') return 'Invalid JSON body.';
          const rec = body as Record<string, unknown>;
          const text = typeof rec.text === 'string' ? rec.text.trim() : '';
          if (text.length < 8) return 'Send at least 8 characters of notice text.';
          if (text.length > 4000) return 'Notice is too long (max 4000 characters).';
          return null;
        },
      ));
      server.middlewares.use('/api/digest', makeHandler<{ items: unknown[] }>(
        (body: { items: unknown[] }) => runDigest(body.items, process.env),
        (body: unknown) => {
          if (!body || typeof body !== 'object') return 'Invalid JSON body.';
          const rec = body as Record<string, unknown>;
          if (!Array.isArray(rec.items) || rec.items.length === 0) return 'Provide a non-empty items array.';
          if (rec.items.length > 60) return 'Too many items (max 60).';
          return null;
        },
      ));
    },
  };
}
