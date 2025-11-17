// api/log-email.js

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const email = (body.email || '').trim();
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB_ID = process.env.NOTION_WAITLIST_DB_ID;

  if (!NOTION_TOKEN || !DB_ID) {
    return new Response(JSON.stringify({ error: 'Notion config missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
          // This writes into your primary "Email" title column
          Email: {
            title: [
              {
                text: {
                  content: email,
                },
              },
            ],
          },
          // If you added a "Submitted At" Created time property in Notion,
          // it will be filled automatically by Notion.
        },
      }),
    });

    if (!notionRes.ok) {
      const text = await notionRes.text();
      console.error('Notion error:', text);
      return new Response(JSON.stringify({ error: 'Failed to write to Notion' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
