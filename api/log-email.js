// api/log-email.js
// Logs email into your Notion "Waitlist Emails – Music Migration" database.
// Env vars needed in Vercel:
//   NOTION_TOKEN          - Notion internal integration token
//   NOTION_WAITLIST_DB_ID - database_id of your waitlist DB

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse email from body (handles JSON or string)
  let email = '';
  try {
    if (typeof req.body === 'string') {
      const body = JSON.parse(req.body || '{}');
      email = (body.email || '').trim();
    } else {
      email = (req.body?.email || '').trim();
    }
  } catch (e) {
    console.error('Body parse error:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB_ID = process.env.NOTION_WAITLIST_DB_ID;

  if (!NOTION_TOKEN || !DB_ID) {
    console.error('Missing NOTION_TOKEN or NOTION_WAITLIST_DB_ID');
    return res.status(500).json({ error: 'Notion config missing' });
  }

  try {
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: DB_ID },
        properties: {
          // "Email" must be the title property name in your Notion DB
          Email: {
            title: [
              {
                text: {
                  content: email,
                },
              },
            ],
          },
        },
      }),
    });

    if (!notionRes.ok) {
      const text = await notionRes.text();
      console.error('Notion error:', text);
      return res.status(500).json({ error: 'Failed to write to Notion' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

