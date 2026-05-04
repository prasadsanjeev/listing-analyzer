const https = require("https");

module.exports = async function (context, req) {
  // CORS headers — allow your static site to call this function
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders, body: "" };
    return;
  }

  if (req.method !== "POST") {
    context.res = { status: 405, headers: corsHeaders, body: JSON.stringify({ error: "Method not allowed" }) };
    return;
  }

  // Read Gemini API key from Azure Function Application Settings (env var)
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "GEMINI_API_KEY not configured in Function App settings." }),
    };
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    context.res = { status: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing prompt in request body." }) };
    return;
  }

  // Build Gemini request payload
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
  });

  // Call Gemini API server-side (no CORS restriction here)
  const geminiPath = `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: "generativelanguage.googleapis.com",
        path: geminiPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

      const reqOut = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });

      reqOut.on("error", reject);
      reqOut.write(payload);
      reqOut.end();
    });

    const parsed = JSON.parse(geminiResponse.body);

    if (geminiResponse.status !== 200) {
      context.res = {
        status: geminiResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: parsed.error?.message || "Gemini API error" }),
      };
      return;
    }

    // Extract text from Gemini response
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};
