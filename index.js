export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const model = body.model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
      const messages = body.messages;

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Invalid request: messages array is required' }), {
          status: 400, headers: corsHeaders
        });
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: messages.map(m => ({ role: m.role, content: m.text }))
          })
        }
      );

      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        return new Response(JSON.stringify({ error: data.errors[0].message }), {
          status: 400, headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({
        result: {
          alternatives: [{
            message: {
              role: 'assistant',
              text: data.result.response
            }
          }]
        }
      }), { headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: corsHeaders
      });
    }
  }
};