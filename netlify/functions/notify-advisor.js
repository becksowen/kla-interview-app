const { google } = require("googleapis");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};

exports.handler = async function (event, context) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    let body;
    try { body = JSON.parse(event.body); }
    catch (e) { return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid request body" }) }; }

    const { fileId, advisorEmail, studentName, programName } = body;
    if (!fileId) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Missing fileId" }) };

    console.log("Sharing file:", fileId, "with advisor:", advisorEmail);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://kla-interview.netlify.app"
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Get file details
    const fileDetails = await drive.files.get({
      fileId: fileId,
      fields: "id, webViewLink, name"
    });
    const webViewLink = fileDetails.data.webViewLink;
    console.log("File view link:", webViewLink);

    // Share with advisor
    if (advisorEmail) {
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: { role: "reader", type: "user", emailAddress: advisorEmail }
        });
        console.log("Shared with advisor:", advisorEmail);
      } catch (e) {
        console.warn("Share warning:", e.message);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        driveUrl: webViewLink,
        message: "File shared with advisor"
      })
    };

  } catch (err) {
    console.error("Notify error:", err.message);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
