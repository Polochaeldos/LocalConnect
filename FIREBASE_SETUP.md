# Firebase Setup Guide

This document provides step-by-step instructions for setting up Firebase for the ServiceHub application.

## 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing project "localconnect-4d689"
3. Enable the following services:
   - Authentication
   - Firestore Database
   - Hosting (optional)

## 2. Authentication Setup

1. Go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Configure settings as needed

## 3. Firestore Database Setup

1. Go to **Firestore Database**
2. Create database in **production mode**
3. Choose a location close to your users

### Database Structure

The application uses the following collections:

```
/users/{userId}
/providers/{providerId}
/bookings/{bookingId}
```

## 4. Firestore Security Rules

Replace the default security rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Provider profiles - read by anyone, write by owner only
    match /providers/{providerId} {
      allow read: if true; // Anyone can read provider profiles
      allow write: if request.auth != null && request.auth.uid == providerId;
    }

    // Bookings - accessible by customer and provider involved
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == resource.data.customerId ||
         request.auth.uid == resource.data.providerId);

      // Allow creation by authenticated customers
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.customerId;
    }

    // Deny all other requests
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 5. Firestore Indexes

**IMPORTANT**: You will encounter index errors when running the application. This is normal for Firestore compound queries.

### Required Indexes

When you see Firestore index errors in the console, follow these steps:

1. **Automatic Index Creation**:

   - Copy the provided URL from the error message (it looks like: `https://console.firebase.google.com/v1/r/project/localconnect-4d689/firestore/indexes?create_composite=...`)
   - Open the URL in your browser
   - Click "Create Index"
   - Wait for the index to build (usually 1-2 minutes)

2. **Manual Index Creation**:
   Go to **Firestore** > **Indexes** in Firebase Console and create these composite indexes:

### Collection: `bookings`

- **Index 1**:

  - Fields: `customerId` (Ascending), `createdAt` (Descending)
  - Query scope: Collection

- **Index 2**:

  - Fields: `providerId` (Ascending), `createdAt` (Descending)
  - Query scope: Collection

- **Index 3**:
  - Fields: `providerId` (Ascending), `status` (Ascending), `scheduledDate` (Ascending)
  - Query scope: Collection

### Collection: `providers`

- **Index 1**:

  - Fields: `isActive` (Ascending), `services` (Array)
  - Query scope: Collection

- **Index 2**:

  - Fields: `isActive` (Ascending), `city` (Ascending)
  - Query scope: Collection

- **Index 3**:
  - Fields: `isActive` (Ascending), `averageRating` (Descending)
  - Query scope: Collection

### Quick Fix for Development:

If you encounter the error:

```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/localconnect-4d689/firestore/indexes?create_composite=...
```

Simply:

1. Click the provided URL
2. Sign in to Firebase Console
3. Click "Create Index"
4. Wait for completion
5. Refresh your application

## 6. Firebase Functions (Optional)

For advanced features, you can deploy Cloud Functions:

```javascript
// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Automatically update provider ratings when a review is added
exports.updateProviderRating = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    // Check if a review was added
    if (newData.customerReview && !previousData.customerReview) {
      const providerId = newData.providerId;

      // Query all completed bookings with reviews for this provider
      const bookingsSnapshot = await admin
        .firestore()
        .collection("bookings")
        .where("providerId", "==", providerId)
        .where("status", "==", "completed")
        .get();

      const reviews = bookingsSnapshot.docs
        .map((doc) => doc.data().customerReview)
        .filter((review) => review && review.rating);

      if (reviews.length > 0) {
        const averageRating =
          reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length;

        // Update provider document
        await admin
          .firestore()
          .collection("providers")
          .doc(providerId)
          .update({
            averageRating: Math.round(averageRating * 10) / 10,
            reviewCount: reviews.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }
  });

// Send notification when booking status changes
exports.sendBookingNotification = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    // Check if status changed
    if (newData.status !== previousData.status) {
      // Here you would integrate with a notification service
      // like FCM, email service, or SMS service
      console.log(
        `Booking ${context.params.bookingId} status changed from ${previousData.status} to ${newData.status}`
      );
    }
  });
```

## 7. Environment Variables

For production deployment, set up environment variables:

```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Then update `src/lib/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
```

## 8. Testing

Test the following features:

1. **User Registration**: Both customer and provider roles
2. **Authentication**: Login/logout functionality
3. **Provider Profile**: Create and update provider profiles
4. **Service Listings**: Browse and filter services
5. **Booking System**: Create, update, and manage bookings
6. **Reviews**: Add and display customer reviews
7. **Real-time Updates**: Verify real-time data synchronization

## 9. Production Deployment

### Firebase Hosting

1. Install Firebase CLI:

   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:

   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:

   ```bash
   firebase init hosting
   ```

4. Build and deploy:
   ```bash
   npm run build
   firebase deploy
   ```

### Alternative Deployments

- **Vercel**: Connect GitHub repository for automatic deployments
- **Netlify**: Drag-and-drop or Git integration
- **Railway**: Container-based deployment

## 10. Monitoring and Analytics

1. Enable **Firebase Analytics** for user behavior tracking
2. Set up **Firebase Performance Monitoring** for app performance
3. Configure **Firebase Crashlytics** for error tracking
4. Use **Firebase Remote Config** for feature flags

## Support

### Common Issues & Solutions

#### 1. Firestore Index Errors

**Error**: `The query requires an index`
**Current Error**: If you see this specific error:

```
FirebaseError: [code=failed-precondition]: The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/localconnect-4d689/firestore/indexes?create_composite=ClNwcm9qZWN0cy9sb2NhbGNvbm5lY3QtNGQ2ODkvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Jvb2tpbmdzL2luZGV4ZXMvXxABGg4KCnByb3ZpZGVySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
```

**Immediate Fix**:

1. Click the URL in the error message above
2. Sign in to Firebase Console
3. Click "Create Index"
4. Wait for completion (1-2 minutes)
5. Refresh your app

**General Solution**:

- Use the provided URL in any error message to create the index automatically
- Or manually create indexes as described in Section 5
- Wait 1-2 minutes for index to build before retrying

#### 2. Authentication Issues

**Error**: User data not found after login
**Solution**:

- Ensure Firestore security rules allow user document reads
- Check that user documents are created during registration
- Verify user role is set correctly in Firestore

#### 3. Real-time Listener Errors

**Error**: Permission denied on Firestore listeners
**Solution**:

- Update Firestore security rules (Section 4)
- Ensure user is authenticated before setting up listeners
- Check that user has proper permissions for the documents

#### 4. Next.js Build Errors

**Error**: Missing prerender-manifest.json
**Solution**:

```bash
# Clear Next.js cache and rebuild
Remove-Item -Recurse -Force .\.next\ -ErrorAction SilentlyContinue
npm run dev
```

#### 5. Development Server Issues

**Error**: Port already in use or cache issues
**Solution**:

```bash
# Kill all Node processes and restart
taskkill /f /im node.exe
npm run dev
```

For Firebase-specific issues, refer to:

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
