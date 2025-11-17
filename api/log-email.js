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

  // Parse email from body (handles JSON string or parsed object)
  let email = '';
  try {
    if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body || '{}');
      email = (parsed.email || '').trim();
    } else if (req.body && typeof req.body === 'object') {
      email = (req.body.email || '').trim();
    }
  } catch (e) {
    console.error('Body parse error:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (!email) {
    console.error('No email provided in body:', req.body);
    return res.status(400).json({ error: 'Email required' });
  }

  if (!NOTION_TOKEN || !DB_ID) {
    console.error('Missing NOTION_TOKEN or NOTION_WAITLIST_DB_ID', {
      hasToken: !!NOTION_TOKEN,
      hasDbId: !!DB_ID,
    });
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
          // "Email" must be the title property name in your waitlist DB
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

    const text = await notionRes.text();
    console.log('Notion response status/text:', notionRes.status, text);

    if (!notionRes.ok) {
      return res.status(500).json({
        error: 'Failed to write to Notion',
        status: notionRes.status,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unexpected error talking to Notion:', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
};
