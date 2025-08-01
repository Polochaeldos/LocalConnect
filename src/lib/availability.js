// Utility functions for provider availability checking

/**
 * Check if a provider is available on a specific date and time
 * @param {Object} provider - Provider object with availability data
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format
 * @param {Array} existingBookings - Array of existing bookings for the provider
 * @returns {boolean} - True if available, false otherwise
 */
export const isProviderAvailable = (provider, date, time, existingBookings = []) => {
  if (!provider?.availability || !date || !time) {
    return false;
  }

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = new Date(date).getDay();
  const dayAvailability = provider.availability[dayOfWeek];

  // Check if provider works on this day
  if (!dayAvailability?.available) {
    return false;
  }

  // Check if time is within working hours
  const timeHour = parseInt(time.split(':')[0]);
  const timeMinute = parseInt(time.split(':')[1]);
  const requestedTime = timeHour * 60 + timeMinute;

  const startHour = parseInt(dayAvailability.startTime.split(':')[0]);
  const startMinute = parseInt(dayAvailability.startTime.split(':')[1]);
  const startTime = startHour * 60 + startMinute;

  const endHour = parseInt(dayAvailability.endTime.split(':')[0]);
  const endMinute = parseInt(dayAvailability.endTime.split(':')[1]);
  const endTime = endHour * 60 + endMinute;

  if (requestedTime < startTime || requestedTime >= endTime) {
    return false;
  }

  // Check if there's already a booking at this time
  const conflictingBooking = existingBookings.find(booking => 
    booking.scheduledDate === date && 
    booking.scheduledTime === time &&
    ['pending', 'confirmed'].includes(booking.status)
  );

  return !conflictingBooking;
};

/**
 * Get available time slots for a provider on a specific date
 * This now considers accepted bookings and shows realistic availability
 * @param {Object} provider - Provider object with availability data
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} existingBookings - Array of existing bookings for the provider
 * @param {number} slotDuration - Duration of each slot in minutes (default: 60)
 * @returns {Array} - Array of available time slots in HH:MM format
 */
export const getAvailableTimeSlots = (provider, date, existingBookings = [], slotDuration = 60) => {
  if (!provider?.availability || !date) {
    return [];
  }

  const dayOfWeek = new Date(date).getDay();
  const dayAvailability = provider.availability[dayOfWeek];

  if (!dayAvailability?.available) {
    return [];
  }

  const slots = [];
  const startHour = parseInt(dayAvailability.startTime.split(':')[0]);
  const startMinute = parseInt(dayAvailability.startTime.split(':')[1]);
  const endHour = parseInt(dayAvailability.endTime.split(':')[0]);
  const endMinute = parseInt(dayAvailability.endTime.split(':')[1]);

  let currentTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  while (currentTime + slotDuration <= endTime) {
    const hour = Math.floor(currentTime / 60);
    const minute = currentTime % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    if (isProviderAvailable(provider, date, timeString, existingBookings)) {
      slots.push(timeString);
    }

    currentTime += slotDuration;
  }

  return slots;
};

/**
 * Get availability status for a provider on a specific date
 * @param {Object} provider - Provider object with availability data
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} existingBookings - Array of existing bookings for the provider
 * @returns {Object} - Availability status with details
 */
export const getAvailabilityStatus = (provider, date, existingBookings = []) => {
  if (!provider?.availability || !date) {
    return { available: false, status: 'unavailable', message: 'No availability data' };
  }

  const dayOfWeek = new Date(date).getDay();
  const dayAvailability = provider.availability[dayOfWeek];

  if (!dayAvailability?.available) {
    return { 
      available: false, 
      status: 'closed', 
      message: 'Provider is closed on this day',
      dayName: getDayName(date)
    };
  }

  const availableSlots = getAvailableTimeSlots(provider, date, existingBookings);
  const totalPossibleSlots = getTotalPossibleSlots(dayAvailability);
  const bookedSlots = getBookedSlotsForDate(date, existingBookings);

  if (availableSlots.length === 0) {
    return {
      available: false,
      status: 'fully-booked',
      message: 'Fully booked for this day',
      bookedSlots: bookedSlots.length,
      totalSlots: totalPossibleSlots
    };
  }

  const availabilityPercentage = (availableSlots.length / totalPossibleSlots) * 100;
  let status = 'available';
  let message = `${availableSlots.length} slots available`;

  if (availabilityPercentage < 25) {
    status = 'limited';
    message = `Limited availability - only ${availableSlots.length} slots left`;
  } else if (availabilityPercentage < 50) {
    status = 'moderate';
    message = `${availableSlots.length} slots available`;
  }

  return {
    available: true,
    status,
    message,
    availableSlots: availableSlots.length,
    bookedSlots: bookedSlots.length,
    totalSlots: totalPossibleSlots,
    availabilityPercentage: Math.round(availabilityPercentage),
    workingHours: `${dayAvailability.startTime} - ${dayAvailability.endTime}`
  };
};

/**
 * Get booked slots for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} existingBookings - Array of existing bookings
 * @returns {Array} - Array of booked time slots
 */
export const getBookedSlotsForDate = (date, existingBookings = []) => {
  return existingBookings
    .filter(booking => 
      booking.scheduledDate === date && 
      ['pending', 'confirmed'].includes(booking.status)
    )
    .map(booking => booking.scheduledTime)
    .sort();
};

/**
 * Calculate total possible slots for a day
 * @param {Object} dayAvailability - Day availability object
 * @param {number} slotDuration - Duration of each slot in minutes
 * @returns {number} - Total number of possible slots
 */
export const getTotalPossibleSlots = (dayAvailability, slotDuration = 60) => {
  const startHour = parseInt(dayAvailability.startTime.split(':')[0]);
  const startMinute = parseInt(dayAvailability.startTime.split(':')[1]);
  const endHour = parseInt(dayAvailability.endTime.split(':')[0]);
  const endMinute = parseInt(dayAvailability.endTime.split(':')[1]);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  return Math.floor((endTime - startTime) / slotDuration);
};

/**
 * Get day name from date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} - Day name
 */
export const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
};

/**
 * Generate time slots for a given time range
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {number} duration - Duration of each slot in minutes
 * @returns {Array} - Array of time slots
 */
export const generateTimeSlots = (startTime, endTime, duration = 60) => {
  const slots = [];
  const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
  
  for (let time = start; time + duration <= end; time += duration) {
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
  
  return slots;
};

/**
 * Get next available slot for a provider
 * @param {Object} provider - Provider object
 * @param {Array} existingBookings - Existing bookings
 * @param {number} daysToCheck - Number of days to check ahead
 * @returns {Object|null} - Next available slot or null
 */
export const getNextAvailableSlot = (provider, existingBookings = [], daysToCheck = 14) => {
  const today = new Date();
  
  for (let i = 0; i < daysToCheck; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const dateString = checkDate.toISOString().split('T')[0];
    
    const availableSlots = getAvailableTimeSlots(provider, dateString, existingBookings);
    
    if (availableSlots.length > 0) {
      return {
        date: dateString,
        time: availableSlots[0],
        dayName: getDayName(dateString)
      };
    }
  }
  
  return null;
};

/**
 * Get provider's weekly availability overview
 * @param {Object} provider - Provider object
 * @param {string} weekStartDate - Start date of the week (YYYY-MM-DD)
 * @param {Array} existingBookings - Existing bookings
 * @returns {Object} - Weekly availability overview
 */
export const getWeeklyAvailability = (provider, weekStartDate, existingBookings = []) => {
  const weeklyAvailability = {};
  const startDate = new Date(weekStartDate);
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    const dayName = getDayName(dateString);
    
    weeklyAvailability[dayName] = getAvailabilityStatus(provider, dateString, existingBookings);
  }
  
  return weeklyAvailability;
};

/**
 * Check if a time slot is in the past
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format
 * @returns {boolean} - True if in the past
 */
export const isSlotInPast = (date, time) => {
  const slotDateTime = new Date(`${date}T${time}:00`);
  return slotDateTime < new Date();
};

/**
 * Filter out past time slots
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} timeSlots - Array of time slots
 * @returns {Array} - Filtered time slots
 */
export const filterPastSlots = (date, timeSlots) => {
  const today = new Date().toISOString().split('T')[0];
  
  // If it's not today, return all slots
  if (date !== today) {
    return timeSlots;
  }
  
  // If it's today, filter out past slots
  return timeSlots.filter(time => !isSlotInPast(date, time));
};

/**
 * Filter providers by availability
 * @param {Array} providers - Array of provider objects
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format
 * @param {Object} bookingsMap - Map of provider bookings
 * @returns {Array} - Filtered providers
 */
export const filterProvidersByAvailability = (providers, date, time, bookingsMap = {}) => {
  if (!date && !time) return providers;

  return providers.filter(provider => {
    const providerBookings = bookingsMap[provider.id] || [];
    
    if (date && time) {
      // Check specific date and time
      return isProviderAvailable(provider, date, time, providerBookings);
    } else if (date) {
      // Check if provider has any availability on this date
      return hasAvailabilityOnDate(provider, date, providerBookings);
    }
    
    return true;
  });
};

/**
 * Check if provider has any availability on a specific date
 * @param {Object} provider - Provider object
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} existingBookings - Array of existing bookings
 * @returns {boolean} - True if has availability
 */
export const hasAvailabilityOnDate = (provider, date, existingBookings = []) => {
  const availableSlots = getAvailableTimeSlots(provider, date, existingBookings);
  const filteredSlots = filterPastSlots(date, availableSlots);
  return filteredSlots.length > 0;
};

/**
 * Get the next available date for a provider
 * @param {Object} provider - Provider object with availability data
 * @param {Array} existingBookings - Array of existing bookings for the provider
 * @param {number} daysToCheck - Number of days to check ahead (default: 30)
 * @returns {string|null} - Next available date in YYYY-MM-DD format or null
 */
export const getNextAvailableDate = (provider, existingBookings = [], daysToCheck = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysToCheck; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    const dateString = checkDate.toISOString().split('T')[0];
    
    if (hasAvailabilityOnDate(provider, dateString, existingBookings)) {
      return dateString;
    }
  }

  return null;
};

/**
 * Format time for display
 * @param {string} time - Time in HH:MM format
 * @returns {string} - Formatted time (e.g., "2:00 PM")
 */
export const formatTimeForDisplay = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute);
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
