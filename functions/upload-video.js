const { google } = require("googleapis");

// ============================================================
// This Netlify Function runs on the SERVER
// It uses the Service Account key to upload videos to Google Drive
// Students never see any login — this happens invisibly in the background
// ============================================================

exports.handler = async function (event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    // ---- 1. Parse incoming request ----
    const body = JSON.parse(event.body);
    const { videoBase64, filename, studentName, programName, advisorEmail } = body;

    if (!videoBase64 || !filename) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing video data or filename" })
      };
    }

    // ---- 2. Authenticate using Service Account ----
    // The service account key is stored as a Netlify environment variable
    // NEVER hardcode credentials in code
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ["https://www.googleapis.com/auth/drive"]
    });

    const drive = google.drive({ version: "v3", auth });

    // ---- 3. Find the KLA_Interviews folder ----
    const folderSearch = await drive.files.list({
      q: "name='KLA_Interviews' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: "files(id, name)",
      spaces: "drive"
    });

    let folderId;
    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
      folderId = folderSearch.data.files[0].id;
    } else {
      // Create folder if it doesn't exist
      const folderCreate = await drive.files.create({
        requestBody: {
          name: "KLA_Interviews",
          mimeType: "application/vnd.google-apps.folder"
        },
        fields: "id"
      });
      folderId = folderCreate.data.id;
    }

    // ---- 4. Upload the video file ----
    const videoBuffer = Buffer.from(videoBase64, "base64");
    const { Readable } = require("stream");
    const videoStream = new Readable();
    videoStream.push(videoBuffer);
    videoStream.push(null);

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType: "video/webm",
        description: `Interview recording for ${studentName} — ${programName} — ${new Date().toLocaleDateString()}`
      },
      media: {
        mimeType: "video/webm",
        body: videoStream
      },
      fields: "id, webViewLink, webContentLink"
    });

    const fileId = uploadResponse.data.id;
    const webViewLink = uploadResponse.data.webViewLink;

    // ---- 5. Share the file with the advisor ----
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "user",
        emailAddress: advisorEmail || "becksowen2001@gmail.com"
      }
    });

    // ---- 6. Return the Drive link ----
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        success: true,
        driveUrl: webViewLink,
        fileId: fileId,
        message: "Video uploaded successfully"
      })
    };

  } catch (err) {
    console.error("Upload error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    };
  }
};
