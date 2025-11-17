// api/log-email.js
// Logs email into your Notion "Waitlist Emails – Music Migration" database.
//
// Required env vars (in Vercel project settings):
//   NOTION_TOKEN          - Notion internal integration token
//   NOTION_WAITLIST_DB_ID - database_id of "Waitlist Emails – Music Migration"

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_WAITLIST_DB_ID;

module.exports = async (req, res) => {
  console.log('log-email incoming:', {
    method: req.method,
    body: req.body,
  });

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract email
  let email = '';
  try {
    if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body || '{}');
      email = (parsed.email || '').trim();
    } else {
      email = (req.body.email || '').trim();
    }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (!email) return res.status(400).json({ error: 'Email required' });

  // ⭐ Extract best-guess IP address
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'Unknown';

  try {
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: DB_ID },
        properties: {
          Email: {
            title: [{ text: { content: email } }],
          },
          "Consent IP": {
            rich_text: [{ text: { content: ip } }],
          },
        },
      }),
    });

    const text = await notionRes.text();
    console.log("Notion response:", notionRes.status, text);

    if (!notionRes.ok)
      return res.status(500).json({ error: "Failed to write to Notion" });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Unexpected error sending to Notion:", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
};
