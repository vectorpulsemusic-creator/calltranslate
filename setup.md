# CallTranslate - Local Setup & Offline Guide

This application is built with React, Vite, and Firebase. To run it locally or as a standalone-like application, follow these steps.

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- A **Firebase Project** (for database and authentication)

## 2. Local Installation
1. **Download the source code** to your local machine.
2. Open a terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   GEMINI_API_KEY=your_gemini_api_key
   ```

## 3. Running the App
Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### Troubleshooting: White Screen
If the app shows a white screen when running locally, check the browser console (F12). This is often caused by:
- **Missing `.env` file:** Ensure you have created a `.env` file with the variables listed above.
- **Missing Firebase Config:** Ensure `firebase-applet-config.json` is present and valid in the root directory.
- **Node Version:** Ensure you are using Node.js v18 or higher.

## 4. Admin Setup
To set yourself as an admin:
1. Log in to the app once using Google Sign-In.
2. Go to your **Firebase Console** -> **Firestore Database**.
3. Find your user document in the `users` collection.
4. Change the `role` field from `"user"` to `"admin"`.
5. Refresh the app, and you will see the **Admin Panel**.

## 5. "Installer" Variation
To make it feel like a local app:
- **PWA**: This app can be configured as a Progressive Web App (PWA) so you can "Install" it from Chrome/Edge as a standalone window.
- **Electron**: You can wrap this project in Electron to create a `.exe` or `.app` installer.

## 7. Batch Files for Windows
For a simpler experience on Windows, you can use the provided batch files:
- **install.bat**: Run this first to install all necessary dependencies.
- **run.bat**: Run this to start the application. It will automatically check for dependencies and run the installer on the first run.
