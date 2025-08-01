// Utility functions for Firebase operations
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

// User operations
export const createUserProfile = async (uid, userData) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

// Provider operations
export const createProviderProfile = async (uid, providerData) => {
  try {
    await setDoc(doc(db, 'providers', uid), {
      ...providerData,
      isActive: true,
      isAvailable: true,
      averageRating: 0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating provider profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateProviderProfile = async (uid, updates) => {
  try {
    await updateDoc(doc(db, 'providers', uid), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating provider profile:', error);
    return { success: false, error: error.message };
  }
};

export const getProviderProfile = async (uid) => {
  try {
    const providerDoc = await getDoc(doc(db, 'providers', uid));
    if (providerDoc.exists()) {
      return { success: true, data: { id: providerDoc.id, ...providerDoc.data() } };
    }
    return { success: false, error: 'Provider not found' };
  } catch (error) {
    console.error('Error getting provider profile:', error);
    return { success: false, error: error.message };
  }
};

// Booking operations
export const createBooking = async (bookingData) => {
  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: error.message };
  }
};

export const updateBookingStatus = async (bookingId, status, additionalData = {}) => {
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status,
      ...additionalData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return { success: false, error: error.message };
  }
};

export const getBooking = async (bookingId) => {
  try {
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    if (bookingDoc.exists()) {
      return { success: true, data: { id: bookingDoc.id, ...bookingDoc.data() } };
    }
    return { success: false, error: 'Booking not found' };
  } catch (error) {
    console.error('Error getting booking:', error);
    return { success: false, error: error.message };
  }
};

// Review operations
export const addReview = async (bookingId, reviewData) => {
  try {
    // Update the booking with review data
    await updateDoc(doc(db, 'bookings', bookingId), {
      customerReview: {
        ...reviewData,
        createdAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    // Update provider's average rating
    await updateProviderRating(reviewData.providerId);

    return { success: true };
  } catch (error) {
    console.error('Error adding review:', error);
    return { success: false, error: error.message };
  }
};

const updateProviderRating = async (providerId) => {
  try {
    // Get all completed bookings with reviews for this provider
    const reviewsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', providerId),
      where('status', '==', 'completed')
    );

    const reviewsSnapshot = await getDocs(reviewsQuery);
    const reviews = reviewsSnapshot.docs
      .map(doc => doc.data().customerReview)
      .filter(review => review && review.rating);

    if (reviews.length > 0) {
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      
      await updateDoc(doc(db, 'providers', providerId), {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        reviewCount: reviews.length,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating provider rating:', error);
  }
};

// Search operations
export const searchProviders = async (filters = {}) => {
  try {
    let providersQuery = query(
      collection(db, 'providers'),
      where('isActive', '==', true)
    );

    if (filters.category) {
      providersQuery = query(
        collection(db, 'providers'),
        where('isActive', '==', true),
        where('services', 'array-contains', filters.category)
      );
    }

    if (filters.limit) {
      providersQuery = query(providersQuery, limit(filters.limit));
    }

    const providersSnapshot = await getDocs(providersQuery);
    const providers = providersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: providers };
  } catch (error) {
    console.error('Error searching providers:', error);
    return { success: false, error: error.message };
  }
};

// Availability operations
export const updateProviderAvailability = async (providerId, availability) => {
  try {
    await updateDoc(doc(db, 'providers', providerId), {
      availability,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating availability:', error);
    return { success: false, error: error.message };
  }
};

export const getAvailableTimeSlots = async (providerId, date) => {
  try {
    // Get provider's availability settings
    const providerResult = await getProviderProfile(providerId);
    if (!providerResult.success) {
      return providerResult;
    }

    const provider = providerResult.data;
    const dayOfWeek = new Date(date).getDay();
    
    // Get day availability (0 = Sunday, 1 = Monday, etc.)
    const dayAvailability = provider.availability?.[dayOfWeek];
    if (!dayAvailability || !dayAvailability.available) {
      return { success: true, data: [] };
    }

    // Get existing bookings for this date
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('providerId', '==', providerId),
      where('scheduledDate', '==', date),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookedTimes = bookingsSnapshot.docs.map(doc => doc.data().scheduledTime);

    // Generate available time slots
    const availableSlots = [];
    const startTime = dayAvailability.startTime || '09:00';
    const endTime = dayAvailability.endTime || '17:00';
    
    // This is a simplified version - you'd want more sophisticated slot generation
    const slots = generateTimeSlots(startTime, endTime, 60); // 60-minute slots
    
    slots.forEach(slot => {
      if (!bookedTimes.includes(slot)) {
        availableSlots.push(slot);
      }
    });

    return { success: true, data: availableSlots };
  } catch (error) {
    console.error('Error getting available time slots:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to generate time slots
const generateTimeSlots = (startTime, endTime, intervalMinutes) => {
  const slots = [];
  const start = new Date(`2000-01-01 ${startTime}`);
  const end = new Date(`2000-01-01 ${endTime}`);
  
  let current = new Date(start);
  while (current < end) {
    slots.push(current.toTimeString().slice(0, 5));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }
  
  return slots;
};

export default {
  createUserProfile,
  getUserProfile,
  createProviderProfile,
  updateProviderProfile,
  getProviderProfile,
  createBooking,
  updateBookingStatus,
  getBooking,
  addReview,
  searchProviders,
  updateProviderAvailability,
  getAvailableTimeSlots
};
