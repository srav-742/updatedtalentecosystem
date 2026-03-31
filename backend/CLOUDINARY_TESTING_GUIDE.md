# Cloudinary Video Storage Testing Guide

## Overview
This guide helps you verify that interview session videos are being stored correctly in Cloudinary and are accessible from your dashboard.

---

## ✅ Changes Made

### Backend Changes:
1. **Updated `routes/interview.routes.js`**
   - Changed video type from `private` to `upload` (publicly accessible)
   - Added `public_access: "public"` 
   - Added video transformations for better playback (720p & 480p)
   - Added eager transcoding for MP4/H.264 format
   - Enhanced logging for upload verification

2. **Updated `controllers/interviewController.js`**
   - Added `recordingPublicId` and `recordingUrl` to interview details response

3. **Created `routes/cloudinaryTest.routes.js`**
   - Test endpoints to verify Cloudinary configuration
   - List all uploaded interview videos
   - Get specific video details

4. **Created `utils/cloudinaryVideoHelper.js`**
   - Helper functions to generate video URLs
   - HLS streaming support
   - Video player HTML generation

5. **Updated `app.js`**
   - Registered cloudinary test routes at `/api/cloudinary-test`

### Frontend Changes:
1. **Updated `pages/recruiter/InterviewDetail.jsx`**
   - Added video player section
   - Displays interview recording when available
   - Beautiful UI with purple gradient theme

---

## 🚀 How to Test

### Step 1: Restart Backend Server
```bash
cd backend
npm run dev
```

### Step 2: Verify Cloudinary Configuration
Test these endpoints in your browser or Postman:

#### Check Cloudinary Status
```
GET http://localhost:5000/api/cloudinary-test/status
```

**Expected Response:**
```json
{
  "success": true,
  "cloudinary_config": {
    "cloud_name": "✓ Set",
    "api_key": "✓ Set",
    "api_secret": "✓ Set"
  },
  "message": "Cloudinary configuration check completed"
}
```

#### List All Interview Videos
```
GET http://localhost:5000/api/cloudinary-test/list-interviews
```

**Expected Response:**
```json
{
  "success": true,
  "total_videos": 2,
  "videos": [
    {
      "public_id": "ai-interviews/video123",
      "secure_url": "https://res.cloudinary.com/...",
      "duration": 45.5,
      "format": "mp4",
      "playable_url": "https://res.cloudinary.com/.../video.mp4"
    }
  ]
}
```

### Step 3: Check Cloudinary Dashboard
1. Visit: https://console.cloudinary.com/
2. Go to **Media Library**
3. Look for folder: **`ai-interviews`**
4. Filter by **Resource Type: Video**
5. You should see all uploaded interview recordings

### Step 4: Test Video Upload Flow
1. Start a mock interview as a job seeker
2. Complete the interview (answer questions)
3. After submission, check backend console logs for:
   ```
   [CLOUDINARY-UPLOAD] Success: ai-interviews/xxx | URL: https://...
   [DATABASE-UPDATE] Application updated for userId: xxx, jobId: xxx
   ```

### Step 5: View Video in Recruiter Dashboard
1. Login as a recruiter
2. Navigate to job applications
3. Click "View Interview" for an application
4. You should see a **video player** with the candidate's recording
5. Click play to verify the video loads and plays correctly

---

## 🔍 Troubleshooting

### Issue: Videos not appearing in Cloudinary
**Solution:**
- Check `.env` file has correct Cloudinary credentials
- Verify backend console for upload errors
- Ensure file size is within Cloudinary limits (default: 100MB)

### Issue: Video player shows "loading" or doesn't play
**Solution:**
- Check browser console for CORS errors
- Verify the video URL is accessible (not private)
- Ensure video format is MP4/H.264 (handled by eager transformation)

### Issue: "Failed to fetch videos from Cloudinary"
**Solution:**
- Check Cloudinary API credentials
- Verify your Cloudinary plan supports API access
- Check network connectivity to Cloudinary

### Issue: Video upload fails
**Solution:**
- Check file size limits in Cloudinary dashboard
- Verify multer is configured correctly
- Check backend console for detailed error messages

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/interview/upload-recording` | POST | Upload interview video |
| `/api/interview-details/:applicationId` | GET | Get interview details (includes video URL) |
| `/api/cloudinary-test/status` | GET | Check Cloudinary config |
| `/api/cloudinary-test/list-interviews` | GET | List all videos |
| `/api/cloudinary-test/video/:publicId` | GET | Get video details |

---

## 🎯 Video Storage Flow

```
1. Candidate completes interview
        ↓
2. Frontend records video/audio
        ↓
3. POST to /api/interview/upload-recording
        ↓
4. Backend uploads to Cloudinary
   - Folder: ai-interviews
   - Type: upload (public)
   - Format: MP4/H.264
        ↓
5. Cloudinary returns secure_url
        ↓
6. Backend saves URL to Application model
        ↓
7. Recruiter views interview
        ↓
8. Video player loads from Cloudinary CDN
```

---

## 🎨 Frontend Video Player Features

- **Controls**: Play, pause, volume, fullscreen
- **Responsive**: Adapts to modal size
- **Max Height**: 500px (scrollable if needed)
- **Styling**: Purple gradient theme matching your UI
- **Fallback**: Message for unsupported browsers

---

## 📝 Notes

1. **Video Quality**: Videos are automatically transcoded to:
   - 720p (HD) - Primary quality
   - 480p (SD) - Fallback for slower connections

2. **Storage Location**: All videos stored in `ai-interviews` folder

3. **Access**: Videos are publicly accessible via secure URL (no authentication needed for playback)

4. **Cost**: Monitor Cloudinary usage in dashboard to avoid overage charges

---

## ✅ Verification Checklist

- [ ] Backend server restarted
- [ ] Cloudinary credentials configured in `.env`
- [ ] `/api/cloudinary-test/status` returns all "✓ Set"
- [ ] Videos appear in Cloudinary dashboard
- [ ] Upload logs show `[CLOUDINARY-UPLOAD] Success`
- [ ] Database shows `recordingUrl` populated
- [ ] Video player appears in Interview Detail modal
- [ ] Video plays correctly in browser
- [ ] No CORS or network errors in console

---

## 🔐 Security Note

Videos are currently set to **public access** for easy viewing. If you need to restrict access later:
1. Change `type: "upload"` to `type: "authenticated"`
2. Use signed URLs with expiration
3. Implement Cloudinary authentication

For production with sensitive data, consider implementing private videos with signed URLs.
