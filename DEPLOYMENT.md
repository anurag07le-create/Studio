# Deployment Guide: StoryGen-Atelier

This guide explains how to deploy your application using a **Split Deployment** strategy:
- **Frontend** -> **Netlify** (Static hosting, fast)
- **Backend** -> **Render** (Stateful hosting, supports SQLite & FFmpeg)

## Prerequisites
1.  **GitHub Account**: You must push your code to a GitHub repository.
2.  **Netlify Account**: [Create here](https://netlify.com).
3.  **Render Account**: [Create here](https://render.com).

## Step 1: Push to GitHub
1.  Initialize a git repository if you haven't (you likely have one).
2.  Commit the changes I created:
    ```bash
    git add .
    git commit -m "Configure deployment for Netlify and Render"
    git push origin main
    ```

## Step 2: Deploy Backend (Render)
1.  **New Web Service**: Go to Render Dashboard -> New -> Web Service.
2.  **Connect GitHub**: Select your repository.
3.  **Settings**:
    - **Name**: `storygen-backend`
    - **Root Directory**: `backend` (Important!)
    - **Runtime**: `Docker`
    - **Instance Type**: Select "Starter" or higher (Free tier spins down, but works. **Persistent Disk requires paid plan**, or accepted data loss on restart).
4.  **Persistent Disk (Crucial)**:
    - Go to "Disks" in the service settings (Advanced).
    - **Mount Path**: `/app/backend/data`
    - **Size**: 1GB.
    - *Note: Without this, your database and generated videos will disappear every time the server restarts.*
5.  **Environment Variables**:
    - `PORT`: `3005`
6.  **Deploy**: Click "Create Web Service".
7.  **Copy URL**: Once deployed, copy the URL (e.g., `https://storygen-backend.onrender.com`).

## Step 3: Deploy Frontend (Netlify)
1.  **New Site**: Go to Netlify Dashboard -> "Add new site" -> "Import an existing project".
2.  **Connect GitHub**: Select your repository.
3.  **Build Settings** (Should be auto-detected from `netlify.toml`):
    - **Base directory**: `frontend`
    - **Build command**: `npm run build`
    - **Publish directory**: `dist`
4.  **Environment Variables**:
    - Click "Show advanced" -> "New Variable".
    - **Key**: `VITE_API_BASE_URL`
    - **Value**: Your Render Backend URL + `/api` (e.g., `https://storygen-backend.onrender.com/api`).
5.  **Deploy**: Click "Deploy site".

## Final Verification
- Open your Netlify URL.
- Try creating a story.
- *Troubleshooting*: If requests fail, check the browser console (Network tab) to ensure they are hitting the correct Render URL.
