import type { Env } from './env';

/** Alerts for you (the site owner). Uses Telegram and/or email, whichever you have set up. Never throws. */
export async function notify(env: Env, subject: string, body: string): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `${subject}\n\n${body}`.slice(0, 3500) }),
      })
    );
  }
  if (env.ADMIN_EMAIL) jobs.push(sendMail(env, env.ADMIN_EMAIL, subject, body));
  await Promise.allSettled(jobs);
}

/** Sends one email through Resend. Returns false (and does nothing) if email is not set up. */
export async function sendMail(env: Env, to: string, subject: string, text: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }),
    });
    return res.ok;
  } catch (e) {
    console.error('mail failure', e);
    return false;
  }
}
