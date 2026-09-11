# KLA Video Interview System
### Knowledge Learning Academy — Admissions Video Interview Platform

A complete two-sided video interview application that allows admission advisors to send interview invitations to students, record their responses, automatically upload videos to Google Drive, and assess student attention using AI-powered eye gaze detection.

---

## 🌐 Live Application

**https://kla-interview.netlify.app**

---

## 📋 Overview

This system has two sides:

### Advisor Side
- Admission advisor enters student name, email address and program name
- Clicks **"Send interview invitation"**
- Student automatically receives an invitation email with a unique interview link
- Advisor receives a completion notification email when the student finishes, including the video link and attention rating

### Student Side
- Student clicks the link in their email and lands directly on the interview welcome screen
- Enters their name and clicks Continue
- Completes **3 practice questions** to get comfortable with recording
- Answers **11 official interview questions** one at a time with a 2-minute timer per question
- A title card displays each question before recording begins
- Video uploads automatically to Google Drive when complete
- Student sees a confirmation screen — no manual submission needed

---

## ✨ Features

| Feature | Details |
|---|---|
| Automatic email invitation | Student receives interview link via EmailJS |
| Practice questions | 3 warm-up questions before the real interview |
| 11 interview questions | Covers financial literacy, academic readiness, career goals |
| 2-minute timer per question | Countdown shown on screen with colour warning at 30 seconds |
| Question title cards | Each question displayed as overlay before recording starts |
| Single continuous recording | One MediaRecorder session prevents timestamp corruption |
| Automatic Google Drive upload | Video uploads to KLA_Interviews folder silently |
| Eye gaze / attention tracking | AI detects if student looks at camera during interview |
| Pass / Fail attention rating | Sent to advisor email only — student never sees it |
| Advisor notification email | Includes video link, student details and attention result |
| No student login required | Students never need to sign into any account |

---

## 🧠 Eye Gaze Detection (Attention Tracking)

The app uses **face-api.js** to silently monitor whether the student is looking at the camera during the interview. This runs in the background without the student being aware.

### How it works
- The camera feed is analysed every 500 milliseconds during all 11 interview questions
- **face-api.js** detects the student's face and eye positions using a lightweight AI model
- If the student's eyes are centred and facing the camera, the frame is counted as "looking at camera"
- At the end of the interview, the percentage of time looking at camera is calculated

### Pass / Fail threshold
- **50% or more** looking at camera = **PASS**
- **Less than 50%** looking at camera = **FAIL**

### What the advisor receives
The advisor notification email includes a line such as:
```
Camera Attention: 72% — PASS (Threshold: 50%)
```
or
```
Camera Attention: 31% — FAIL (Threshold: 50%)
```

### Important notes
- The student is never informed of the rating
- Accuracy is approximately 75–85% — works best in good lighting with the student facing forward
- If the AI model fails to load, the interview continues normally and the email will show "Unable to assess"

---

## 📋 Interview Questions

### Practice Questions (3)
1. Please introduce yourself — say your name, where you are from, and one thing you enjoy doing
2. Describe your daily routine on a typical weekday
3. Tell us about a subject or topic you find interesting and why

### Official Interview Questions (11)
1. Tell me something about yourself
2. What program are you studying at Knowledge Learning Academy?
3. What is the name of the college you are attending?
4. Why are you studying this program? What is your motivation to pursue it?
5. How many hours per week are you required to dedicate to studying for this program?
6. What are the total program fees for your course of study?
7. How much grant and loan have you been approved for to fund your studies?
8. What do you plan to do with the grant money you have received?
9. What portion of your student loan is interest free, and under what conditions?
10. When does your loan repayment process begin, and what are the repayment terms?
11. What is the total duration of your program, and when do you expect to complete it?

---

## 🛠️ Technical Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | HTML, CSS, JavaScript | Single page application |
| Hosting | Netlify | Free hosting with serverless functions |
| Video recording | MediaRecorder API | Browser-based recording |
| Video repair | fix-webm-duration.js | Fixes WebM metadata for full playback |
| Eye tracking | face-api.js v0.22.2 | Face and eye landmark detection |
| Video storage | Google Drive API | Automatic upload to KLA_Interviews folder |
| Upload method | Resumable upload session | Handles large video files without size limits |
| Email — invitations | EmailJS (template_05m05lg) | Sends interview link to student |
| Email — notifications | EmailJS (template_9fj8lgs) | Sends completion + attention result to advisor |
| Backend functions | Netlify Functions (Node.js) | Google Drive authentication and upload session |
| Authentication | Google OAuth 2.0 | Refresh token stored in Netlify environment variables |

---

## 📁 Repository Structure

```
kla-interview-app/
│
├── index.html                    # Complete single-page application
├── privacy.html                  # Privacy policy page
├── netlify.toml                  # Netlify build configuration
│
└── netlify/
    └── functions/
        ├── upload-video.js       # Generates Google Drive resumable upload session
        ├── notify-advisor.js     # Shares uploaded file with advisor
        └── package.json          # Node.js dependencies (googleapis)
```

---

## ⚙️ Environment Variables (Netlify)

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token for Drive access |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service account JSON (legacy — no longer used) |

---

## 📧 EmailJS Configuration

| Setting | Value |
|---|---|
| Service ID | service_6bwg3v8 |
| Invitation template | template_05m05lg |
| Notification template | template_9fj8lgs |
| Public Key | tlLWjcsaTGYIajDdw |

### Notification email template variables
- `{{to_email}}` — advisor email address
- `{{student_name}}` — student full name
- `{{program_name}}` — program applied to
- `{{interview_date}}` — date and time of completion
- `{{video_url}}` — Google Drive link to the video
- `{{filename}}` — video filename
- `{{attention_result}}` — eye gaze Pass/Fail result

### Invitation email template variables
- `{{student_email}}` — student email address
- `{{student_name}}` — student full name
- `{{program_name}}` — program applied to
- `{{interview_link}}` — unique interview URL

---

## 🔄 How to Regenerate the Google Refresh Token

The refresh token may expire if not used for several months. Follow these steps to renew it:

1. Go to **developers.google.com/oauthplayground**
2. Click the **⚙️ gear icon** → tick **"Use your own OAuth credentials"**
3. Enter Client ID and Client Secret
4. In Step 1 type: `https://www.googleapis.com/auth/drive`
5. Click **"Authorize APIs"** → sign in as `krishnamurthyvignesh65@gmail.com` → Allow
6. **Immediately** click **"Exchange authorization code for tokens"**
7. Copy the **Refresh token**
8. Go to **netlify.com** → Project configuration → Environment variables
9. Update `GOOGLE_REFRESH_TOKEN` with the new value
10. Go to Deploys → Trigger deploy → Deploy site

---

## 🚀 How to Deploy Updates

1. Make changes to files locally
2. Go to **github.com/becksowen/kla-interview-app**
3. Press **( . )** to open the web editor
4. Edit files and save with **Ctrl+S**
5. Click the branch icon → type a commit message → **Commit & Push**
6. Netlify automatically deploys within 60 seconds

---

## 📦 Google Drive Storage

- Videos are stored in a folder called **KLA_Interviews**
- Folder is in the Google Drive account: `krishnamurthyvignesh65@gmail.com`
- Each video is named: `StudentName_KLA_interview_[timestamp].webm`
- The advisor `becksowen2001@gmail.com` is automatically shared viewer access on each video
- Google Drive free tier: 15 GB — sufficient for approximately 37+ complete interviews

---

## 🌐 Browser Compatibility

| Browser | Recording | Eye Tracking | Recommended |
|---|---|---|---|
| Google Chrome (desktop) | ✅ | ✅ | ✅ Best |
| Microsoft Edge (desktop) | ✅ | ✅ | ✅ Good |
| Firefox (desktop) | ✅ | ⚠️ Limited | ✅ Good |
| Safari (Mac/iPhone) | ⚠️ Limited | ⚠️ Limited | ❌ Not recommended |
| Chrome (Android) | ✅ | ⚠️ Limited | ⚠️ Acceptable |

---

## 🔒 Privacy & Compliance

- Student videos are stored securely on Google Drive
- Only authorised KLA staff can access recordings
- Privacy policy available at: **https://kla-interview.netlify.app/privacy.html**
- Eye gaze results are sent only to the advisor — never shown to the student
- No student data is stored on Netlify servers

---

## 📞 Support Contacts

| Role | Email |
|---|---|
| Drive storage account | krishnamurthyvignesh65@gmail.com |
| Advisor notifications | becksowen2001@gmail.com |

---

*Built for Knowledge Learning Academy Admissions — September 2026*
