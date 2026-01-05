import { buildApiUrl } from '../config/api';
import { toast } from 'react-toastify';

/**
 * Fetch utility for PreBookedRooms component (Admin side only)
 */

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token not found');
  }
  return token;
};

/**
 * Fetch all prebooked rooms (future bookings)
 * @param {Object} filters - Optional filters (check_in_date, room_type, guest_name)
 * @returns {Promise<Object>} API response with prebooked rooms data
 */
export const fetchPrebookedRooms = async (filters = {}) => {
  try {
    const token = getAuthToken();
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('action', 'get_prebooked');
    
    if (filters.check_in_date) {
      queryParams.append('check_in_date', filters.check_in_date);
    }
    if (filters.room_type) {
      queryParams.append('room_type', filters.room_type);
    }
    if (filters.guest_name) {
      queryParams.append('guest_name', filters.guest_name);
    }
    
    const response = await fetch(
      `${buildApiUrl('reception/prebooked_api.php')}?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, response.statusText);
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch prebooked rooms (${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ API Error:', data);
      throw new Error(data.message || 'Failed to load pre-booked rooms');
    }
    
    console.log('✅ Prebooked rooms fetched:', data.data?.length || 0);
    return data;
    
  } catch (error) {
    console.error('Error fetching prebooked rooms:', error);
    throw error;
  }
};

/**
 * Update a prebooked booking
 * @param {number} bookingId - The booking ID to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} API response
 */
export const updatePrebookedBooking = async (bookingId, updateData) => {
  try {
    const token = getAuthToken();
    
    const response = await fetch(
      `${buildApiUrl('reception/prebooked_api.php')}?action=update_booking`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_id: bookingId,
          ...updateData
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error:', response.status, response.statusText);
      console.error('Error response:', errorText);
      throw new Error(`Failed to update booking (${response.status})`);
    }
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);
      throw new Error('Invalid response from server');
    }
    
    if (!data.success) {
      console.error('❌ API Error:', data);
      throw new Error(data.message || 'Failed to update booking');
    }
    
    console.log('✅ Booking updated successfully');
    return data;
    
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

/**
 * Get prebooked rooms statistics
 * @returns {Promise<Object>} API response with statistics
 */
export const fetchPrebookedStats = async () => {
  try {
    const token = getAuthToken();
    
    const response = await fetch(
      `${buildApiUrl('reception/prebooked_api.php')}?action=get_stats`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats (${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to load statistics');
    }
    
    return data;
    
  } catch (error) {
    console.error('Error fetching prebooked stats:', error);
    throw error;
  }
};

