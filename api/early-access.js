export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address",
      });
    }

    const redisUrl =
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;

    const redisToken =
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) {
      console.error("Upstash environment variables are missing");

      return res.status(500).json({
        success: false,
        error: "Database is not configured",
      });
    }

    const emailKey =
      `qualityupgr:early_access:email:${encodeURIComponent(normalizedEmail)}`;

    // Try to create a unique record.
    // NX means: only create it if it doesn't already exist.
    const saveResponse = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: ["SET", emailKey, new Date().toISOString(), "NX"],
      }),
    });

    if (!saveResponse.ok) {
      throw new Error(
        `Upstash returned HTTP ${saveResponse.status}`
      );
    }

    const saveResult = await saveResponse.json();

    // Email already exists
    if (saveResult.result === null) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: "You are already on the early access list.",
      });
    }

    // Add email to the main set
    const addToListResponse = await fetch(redisUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command: [
          "SADD",
          "qualityupgr:early_access:emails",
          normalizedEmail,
        ],
      }),
    });

    if (!addToListResponse.ok) {
      throw new Error(
        `Upstash SADD returned HTTP ${addToListResponse.status}`
      );
    }

    return res.status(200).json({
      success: true,
      alreadyRegistered: false,
      message: "You have been added to the early access list.",
    });
  } catch (error) {
    console.error("Early access error:", error);

    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
}
