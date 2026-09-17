const MODEL = 'qwen/qwen3.6-27b';

function send(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { success: false, message: 'Method not allowed.' });
  if (!process.env.GROQ_API_KEY) return send(res, 503, { success: false, message: 'Groq is not configured.' });

  try {
    const image = req.body && req.body.image;
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return send(res, 400, { success: false, message: 'A valid image preview is required.' });
    }
    if (image.length > 3_500_000) {
      return send(res, 413, { success: false, message: 'Image preview is too large.' });
    }

    const prompt = `You are QualityUpgr's image-quality diagnostician. Analyze this photo ONLY for technical image quality, not for identity or sensitive personal traits. Return JSON only with this exact shape:
{
  "problems": ["short problem 1", "short problem 2"],
  "severity": "low|medium|high",
  "mode": "natural|balanced|detail",
  "scale": 1|2|4,
  "recommendation": "one short concrete treatment plan",
  "confidence": 0.0
}
Look for visible blur, compression, noise, low resolution, weak detail, exposure/contrast problems, and whether extra sharpening could damage the image. Do not claim that missing original detail can truly be recovered. Prefer scale 2 over 4 unless the image clearly benefits from 4x. Prefer natural when the image is already clean, balanced for ordinary defects, and detail only when fine detail is genuinely soft and noise is low.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } }
          ]
        }],
        temperature: 0.2,
        max_completion_tokens: 300,
        response_format: { type: 'json_object' },
        reasoning_effort: 'none'
      })
    });

    const raw = await response.text();
    let payload = {};
    try { payload = JSON.parse(raw); } catch (_) {}
    if (!response.ok) {
      return send(res, response.status, { success: false, message: payload?.error?.message || 'Groq request failed.' });
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return send(res, 502, { success: false, message: 'Groq returned no analysis.' });

    let analysis;
    try { analysis = JSON.parse(content); } catch (_) {
      return send(res, 502, { success: false, message: 'Groq returned invalid JSON.' });
    }

    const allowedModes = new Set(['natural', 'balanced', 'detail']);
    const allowedSeverity = new Set(['low', 'medium', 'high']);
    if (!Array.isArray(analysis.problems)) analysis.problems = [];
    analysis.problems = analysis.problems.slice(0, 5).map(String);
    if (!allowedModes.has(analysis.mode)) analysis.mode = 'balanced';
    if (!allowedSeverity.has(analysis.severity)) analysis.severity = 'medium';
    if (![1, 2, 4].includes(Number(analysis.scale))) analysis.scale = 2;
    analysis.scale = Number(analysis.scale);
    if (typeof analysis.recommendation !== 'string') analysis.recommendation = 'Standard adaptive enhancement.';
    analysis.recommendation = analysis.recommendation.slice(0, 240);
    analysis.confidence = Math.max(0, Math.min(1, Number(analysis.confidence) || 0));

    return send(res, 200, { success: true, model: MODEL, analysis });
  } catch (error) {
    return send(res, 500, { success: false, message: 'Groq diagnosis failed.' });
  }
};
