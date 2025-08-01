# ServiceHub - Local Services Aggregator

A comprehensive web application that connects customers with trusted local service providers. Built with Next.js and Firebase for a seamless, real-time experience.

## 🚀 Features

### 🔐 Authentication & Role Management

- **Dual Role System**: Separate authentication flows for Customers and Service Providers
- **Firebase Authentication**: Secure user management with email/password
- **Role-based Route Protection**: Automatic redirection based on user roles
- **Profile Management**: Comprehensive user profiles with role-specific data

### 🏠 Customer Features

- **Service Discovery**: Browse and search through various service categories
- **Advanced Filtering**: Filter by category, price range, ratings, and availability
- **Real-time Booking**: Book services with integrated calendar system
- **Booking Management**: Track booking status and history
- **Review System**: Rate and review completed services
- **Dashboard**: Comprehensive overview of bookings and activities

### 🔧 Service Provider Features

- **Provider Dashboard**: Complete business management interface
- **Service Management**: Add, edit, and manage offered services
- **Calendar Integration**: Set availability and manage time slots
- **Booking Requests**: Accept or decline booking requests in real-time
- **Review Management**: View and respond to customer reviews
- **Performance Analytics**: Track ratings, bookings, and earnings

### 🌟 Core Functionality

- **Real-time Updates**: Live booking status and notifications
- **Service Categories**: Electricians, Tutors, Cleaners, Plumbers, Gardeners, Painters
- **Geolocation Support**: Location-based service discovery
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Smooth animations and intuitive user interface

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19, JavaScript (JSX)
- **Styling**: Tailwind CSS with custom animations
- **Backend**: Firebase Firestore (NoSQL database)
- **Authentication**: Firebase Auth with role-based access
- **Hosting**: Firebase Hosting (production ready)
- **APIs**: Google Maps API integration (prepared)
- **Real-time**: Firestore real-time listeners

## 📱 Application Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.js            # Landing page with service categories
│   ├── login/page.js      # User authentication
│   ├── register/page.js   # User registration with role selection
│   ├── services/page.js   # Service listing and search
│   ├── customer/
│   │   └── dashboard/     # Customer dashboard
│   └── provider/
│       └── dashboard/     # Service provider dashboard
├── components/
│   └── RouteGuard.js      # Role-based route protection
├── contexts/
│   └── AuthContext.js     # Authentication state management
└── lib/
    ├── firebase.js        # Firebase configuration
    └── firestore.js       # Database operations utility
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project set up
- Google Maps API key (for geolocation features)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd servicehub
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Firebase Configuration**

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Update `src/lib/firebase.js` with your Firebase config

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Environment Setup

The Firebase configuration is already set up in `src/lib/firebase.js`. For production, consider using environment variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Structure

#### Users Collection

```javascript
{
  uid: "user_id",
  email: "user@example.com",
  role: "customer" | "provider",
  name: "User Name",
  phone: "phone_number",
  city: "City Name",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Providers Collection

```javascript
{
  uid: "provider_id",
  name: "Provider Name",
  services: ["electrician", "plumber"],
  description: "Service description",
  city: "City Name",
  isActive: true,
  isAvailable: true,
  averageRating: 4.5,
  reviewCount: 10,
  pricing: {
    averagePrice: 100
  },
  availability: {
    // Weekly schedule
  }
}
```

#### Bookings Collection

```javascript
{
  customerId: "customer_id",
  providerId: "provider_id",
  serviceType: "electrician",
  scheduledDate: "2025-08-01",
  scheduledTime: "14:00",
  status: "pending" | "confirmed" | "completed" | "rejected",
  totalPrice: 100,
  description: "Service description",
  customerReview: {
    rating: 5,
    comment: "Excellent service!"
  }
}
```

## 🌟 Key Features Implementation

### Authentication Flow

1. User selects role during registration (Customer/Provider)
2. Firebase Auth creates user account
3. User profile saved to Firestore with role information
4. Route protection automatically redirects based on role

### Booking System

1. Customer browses services and selects provider
2. Real-time availability check
3. Booking request sent to provider
4. Provider accepts/rejects in real-time
5. Status updates sync across all devices

### Review System

1. Reviews linked to completed bookings
2. Automatic rating calculation for providers
3. Real-time updates to provider profiles

## 🚀 Deployment

### Firebase Hosting

1. **Install Firebase CLI**

   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**

   ```bash
   firebase login
   ```

3. **Initialize Firebase in project**

   ```bash
   firebase init hosting
   ```

4. **Build and deploy**
   ```bash
   npm run build
   firebase deploy
   ```

### Alternative Deployment Options

- **Vercel**: Connect your GitHub repository for automatic deployments
- **Netlify**: Drag-and-drop deployment or Git integration
- **Railway**: Container-based deployment

## 🔒 Security

### Firebase Security Rules

Implement Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Providers can manage their own profiles
    match /providers/{providerId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == providerId;
    }

    // Booking access rules
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null &&
        (request.auth.uid == resource.data.customerId ||
         request.auth.uid == resource.data.providerId);
    }
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing React framework
- **Firebase** for backend infrastructure
- **Tailwind CSS** for utility-first styling
- **Vercel** for deployment platform

## 📞 Support

For support, email support@servicehub.com or join our community discussions.

---

**Built with ❤️ using Next.js and Firebase**
