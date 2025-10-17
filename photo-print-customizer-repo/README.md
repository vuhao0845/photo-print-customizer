# Photo Print Customizer (Next.js)

This repository is a minimal Next.js project prepared for deployment.  
It uses the page you provided as `/pages/photo-customizer.jsx`.

## Quick start (on your machine)
1. Install Node.js (v18+).  
2. In project folder:
   ```bash
   npm install
   npm run dev
   ```
3. Open http://localhost:3000

## Deploy to Vercel
1. Create a GitHub repository and push this project.  
2. Import the repo on Vercel.  
3. Set environment variable `WP_UPLOAD_ENDPOINT` to your WordPress endpoint:
   `https://your-wordpress-site.com/wp-json/custom-photo/v1/upload`
4. Deploy.

## Notes
- Add frame images under `public/frames/` (frame1.png, frame2.png, frame3.png).
- The API route `/api/upload` forwards order payloads to WordPress endpoint.

