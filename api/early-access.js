export default async function handler(req, res) {
  // Allow requests from the website
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle browser preflight request
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only POST is allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { email } = req.body || {};

    // Basic email validation
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

    // Temporary response.
    // Redis + Resend will be connected in the next step.
    return res.status(200).json({
      success: true,
      message: "You have been added to the early access list.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Early access error:", error);

    return res.status(500).json({
      success: false,
      error: "Something went wrong. Please try again.",
    });
  }
}
