const { google } = require("googleapis");
const https = require("https");

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

  // Check required environment variables
  if (!process.env.GOOGLE_CLIENT_ID) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "GOOGLE_CLIENT_ID not set in Netlify environment variables." }) };
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "GOOGLE_CLIENT_SECRET not set in Netlify environment variables." }) };
  }
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "GOOGLE_REFRESH_TOKEN not set in Netlify environment variables." }) };
  }

  try {
    let body;
    try { body = JSON.parse(event.body); }
    catch (e) { return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid request body" }) }; }

    const { filename, studentName, programName, advisorEmail, fileSize } = body;
    if (!filename) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Missing filename" }) };

    console.log("Generating upload session for:", studentName, "| File:", filename, "| Size:", fileSize);

    // Authenticate using OAuth2 with refresh token
    // This uploads directly into krishnamurthyvignesh65@gmail.com's Drive
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://kla-interview.netlify.app"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    // Get a fresh access token
    const tokenResponse = await oauth2Client.getAccessToken();
    const accessToken = tokenResponse.token;
    console.log("Got access token successfully");

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Find or create KLA_Interviews folder
    let folderId;
    try {
      const folderSearch = await drive.files.list({
        q: "name='KLA_Interviews' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id)",
        spaces: "drive"
      });
      if (folderSearch.data.files && folderSearch.data.files.length > 0) {
        folderId = folderSearch.data.files[0].id;
        console.log("Found KLA_Interviews folder:", folderId);
      } else {
        const fc = await drive.files.create({
          requestBody: { name: "KLA_Interviews", mimeType: "application/vnd.google-apps.folder" },
          fields: "id"
        });
        folderId = fc.data.id;
        console.log("Created KLA_Interviews folder:", folderId);
      }
    } catch(folderErr) {
      console.error("Folder error:", folderErr.message);
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Drive folder error: " + folderErr.message }) };
    }

    // Initiate resumable upload session
    const metadata = JSON.stringify({
      name: filename,
      parents: [folderId],
      mimeType: "video/webm",
      description: "KLA Interview | " + (studentName||"") + " | " + (programName||"") + " | " + new Date().toLocaleDateString()
    });

    const uploadUrl = await new Promise(function(resolve, reject) {
      const options = {
        hostname: "www.googleapis.com",
        path: "/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink",
        method: "POST",
        headers: {
          "Authorization": "Bearer " + accessToken,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(metadata),
          "X-Upload-Content-Type": "video/webm",
          "X-Upload-Content-Length": fileSize || 0
        }
      };

      const req = https.request(options, function(res) {
        console.log("Initiate response status:", res.statusCode);
        let responseBody = "";
        res.on("data", function(chunk) { responseBody += chunk; });
        res.on("end", function() {
          if (res.statusCode === 200) {
            const location = res.headers["location"];
            if (location) {
              console.log("Got resumable upload URL successfully");
              resolve(location);
            } else {
              reject(new Error("No location header. Body: " + responseBody.substring(0,300)));
            }
          } else {
            reject(new Error("Failed to initiate. Status: " + res.statusCode + " Body: " + responseBody.substring(0,300)));
          }
        });
      });

      req.on("error", function(e) { reject(new Error("HTTPS error: " + e.message)); });
      req.write(metadata);
      req.end();
    });

    console.log("Resumable upload session created successfully");

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        uploadUrl: uploadUrl,
        folderId: folderId,
        message: "Upload session ready"
      })
    };

  } catch (err) {
    console.error("Function error:", err.message, "\nStack:", err.stack);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
