// Frontend Test Suite for Pre-booked Functionality
// Tests the React components and user interface for pre-booked room management

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios for API calls
jest.mock('axios');

// Import components to test
import RoomAvailability from '../components/booking/RoomAvailability';
import BookingForm from '../components/booking/BookingForm';
import RoomStatus from '../components/reception/RoomStatus';

describe('Pre-booked Functionality Frontend Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Test Case 1: Pre-booked Scenario Detection', () => {
    test('should display room as pre-booked when there is a booking starting on checkout date', async () => {
      // Mock API response for pre-booked scenario
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'prebooked',
                status_description: 'Pre-booked for 2025-08-28',
                next_booking_formatted: '2025-08-28 to 2025-08-29 (Test Guest)',
                is_prebooked: true,
                is_available: false
              }
            ]
          }
        }
      });

      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-28" 
      />);

      await waitFor(() => {
        expect(screen.getByText('Room 102')).toBeInTheDocument();
        expect(screen.getByText('Pre-booked for 2025-08-28')).toBeInTheDocument();
        expect(screen.getByText('Pre-booked')).toBeInTheDocument();
      });

      // Verify the room is not selectable
      const roomElement = screen.getByText('Room 102').closest('.room-item');
      expect(roomElement).toHaveClass('prebooked');
      expect(roomElement).toHaveClass('disabled');
    });

    test('should show correct visual indicators for pre-booked rooms', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'prebooked',
                status_description: 'Pre-booked for 2025-08-28',
                is_prebooked: true
              }
            ]
          }
        }
      });

      render(<RoomStatus />);

      await waitFor(() => {
        const prebookedIndicator = screen.getByTestId('prebooked-indicator-102');
        expect(prebookedIndicator).toBeInTheDocument();
        expect(prebookedIndicator).toHaveClass('status-prebooked');
      });
    });
  });

  describe('Test Case 2: Booking Conflict Prevention', () => {
    test('should prevent booking when room is pre-booked', async () => {
      // Mock API to return pre-booked room
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'prebooked',
                is_prebooked: true,
                is_available: false
              }
            ]
          }
        }
      });

      // Mock booking creation API to return error
      axios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            message: 'Room is not available for the selected dates due to existing bookings'
          }
        }
      });

      render(<BookingForm />);

      // Fill in booking form
      fireEvent.change(screen.getByLabelText('Check-in Date'), {
        target: { value: '2025-08-27' }
      });
      fireEvent.change(screen.getByLabelText('Check-out Date'), {
        target: { value: '2025-08-28' }
      });
      fireEvent.change(screen.getByLabelText('Room Number'), {
        target: { value: '102' }
      });

      // Submit booking
      fireEvent.click(screen.getByText('Book Now'));

      await waitFor(() => {
        expect(screen.getByText('Room is not available for the selected dates due to existing bookings')).toBeInTheDocument();
      });
    });

    test('should disable pre-booked rooms in booking form', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'prebooked',
                is_prebooked: true,
                is_available: false
              },
              {
                room_number: '103',
                availability_status: 'available',
                is_prebooked: false,
                is_available: true
              }
            ]
          }
        }
      });

      render(<BookingForm />);

      await waitFor(() => {
        const room102Option = screen.getByDisplayValue('102');
        const room103Option = screen.getByDisplayValue('103');
        
        expect(room102Option).toBeDisabled();
        expect(room103Option).not.toBeDisabled();
      });
    });
  });

  describe('Test Case 3: Same-Day Booking Logic', () => {
    test('should allow same-day booking even when room has future booking', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'available',
                status_description: 'Available for booking',
                is_prebooked: false,
                is_available: true
              }
            ]
          }
        }
      });

      render(<BookingForm />);

      // Set same-day booking
      fireEvent.change(screen.getByLabelText('Check-in Date'), {
        target: { value: '2025-08-27' }
      });
      fireEvent.change(screen.getByLabelText('Check-out Date'), {
        target: { value: '2025-08-27' }
      });

      await waitFor(() => {
        expect(screen.getByText('Room 102')).toBeInTheDocument();
        expect(screen.getByText('Available for booking')).toBeInTheDocument();
      });
    });

    test('should show correct status for same-day bookings', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'available',
                status_description: 'Available for same-day booking',
                is_prebooked: false,
                is_available: true
              }
            ]
          }
        }
      });

      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-27" 
      />);

      await waitFor(() => {
        expect(screen.getByText('Available for same-day booking')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 4: Edge Cases', () => {
    test('should handle multiple consecutive bookings correctly', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '101',
                availability_status: 'prebooked',
                status_description: 'Pre-booked for 2025-09-01',
                is_prebooked: true,
                is_available: false
              }
            ]
          }
        }
      });

      render(<RoomAvailability 
        checkInDate="2025-08-31" 
        checkOutDate="2025-09-01" 
      />);

      await waitFor(() => {
        expect(screen.getByText('Pre-booked for 2025-09-01')).toBeInTheDocument();
      });
    });

    test('should handle cancelled bookings correctly', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '103',
                availability_status: 'available',
                status_description: 'Available for booking',
                is_prebooked: false,
                is_available: true
              }
            ]
          }
        }
      });

      render(<RoomAvailability 
        checkInDate="2025-09-09" 
        checkOutDate="2025-09-10" 
      />);

      await waitFor(() => {
        expect(screen.getByText('Available for booking')).toBeInTheDocument();
      });
    });

    test('should handle room maintenance status', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '105',
                availability_status: 'maintenance',
                status_description: 'Under maintenance',
                is_prebooked: false,
                is_available: false
              }
            ]
          }
        }
      });

      render(<RoomStatus />);

      await waitFor(() => {
        expect(screen.getByText('Under maintenance')).toBeInTheDocument();
        expect(screen.getByText('Maintenance')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 5: Performance Testing', () => {
    test('should handle large number of rooms efficiently', async () => {
      // Mock response with 50 rooms
      const mockRooms = Array.from({ length: 50 }, (_, i) => ({
        room_number: `${100 + i}`,
        availability_status: i % 3 === 0 ? 'prebooked' : 'available',
        status_description: i % 3 === 0 ? 'Pre-booked' : 'Available',
        is_prebooked: i % 3 === 0,
        is_available: i % 3 !== 0
      }));

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: mockRooms
          }
        }
      });

      const startTime = performance.now();
      
      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-28" 
      />);

      await waitFor(() => {
        expect(screen.getByText('Room 100')).toBeInTheDocument();
        expect(screen.getByText('Room 149')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    test('should handle rapid date changes efficiently', async () => {
      axios.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'available',
                is_available: true
              }
            ]
          }
        }
      });

      render(<BookingForm />);

      const checkInInput = screen.getByLabelText('Check-in Date');
      const checkOutInput = screen.getByLabelText('Check-out Date');

      // Rapidly change dates
      for (let i = 0; i < 10; i++) {
        fireEvent.change(checkInInput, {
          target: { value: `2025-08-${27 + i}` }
        });
        fireEvent.change(checkOutInput, {
          target: { value: `2025-08-${28 + i}` }
        });
      }

      // Should not crash and should make API calls
      expect(axios.get).toHaveBeenCalledTimes(20); // 10 changes * 2 inputs
    });
  });

  describe('Test Case 6: User Experience', () => {
    test('should show loading state while fetching room data', async () => {
      // Mock delayed response
      axios.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: {
              success: true,
              data: { rooms: [] }
            }
          }), 100)
        )
      );

      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-28" 
      />);

      expect(screen.getByText('Loading rooms...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading rooms...')).not.toBeInTheDocument();
      });
    });

    test('should show error message when API fails', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-28" 
      />);

      await waitFor(() => {
        expect(screen.getByText('Error loading room availability')).toBeInTheDocument();
      });
    });

    test('should provide clear feedback for pre-booked rooms', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'prebooked',
                status_description: 'Pre-booked for 2025-08-28',
                next_booking_formatted: '2025-08-28 to 2025-08-29 (Test Guest)',
                is_prebooked: true
              }
            ]
          }
        }
      });

      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-28" 
      />);

      await waitFor(() => {
        expect(screen.getByText('Pre-booked for 2025-08-28')).toBeInTheDocument();
        expect(screen.getByText('2025-08-28 to 2025-08-29 (Test Guest)')).toBeInTheDocument();
        expect(screen.getByText('This room is not available for your selected dates')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 7: Accessibility', () => {
    test('should have proper ARIA labels for pre-booked rooms', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'prebooked',
                is_prebooked: true
              }
            ]
          }
        }
      });

      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-28" 
      />);

      await waitFor(() => {
        const roomElement = screen.getByText('Room 102').closest('.room-item');
        expect(roomElement).toHaveAttribute('aria-label', 'Room 102 - Pre-booked');
        expect(roomElement).toHaveAttribute('aria-disabled', 'true');
      });
    });

    test('should be keyboard navigable', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'available',
                is_available: true
              }
            ]
          }
        }
      });

      render(<RoomAvailability 
        checkInDate="2025-08-27" 
        checkOutDate="2025-08-28" 
      />);

      await waitFor(() => {
        const roomElement = screen.getByText('Room 102').closest('.room-item');
        roomElement.focus();
        
        fireEvent.keyDown(roomElement, { key: 'Enter' });
        
        expect(roomElement).toHaveClass('selected');
      });
    });
  });

  describe('Test Case 8: Integration Testing', () => {
    test('should integrate with booking flow correctly', async () => {
      // Mock room availability
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'available',
                is_available: true
              }
            ]
          }
        }
      });

      // Mock successful booking creation
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Booking created successfully',
          booking_id: 123
        }
      });

      render(<BookingForm />);

      // Fill form
      fireEvent.change(screen.getByLabelText('Guest Name'), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByLabelText('Check-in Date'), {
        target: { value: '2025-08-27' }
      });
      fireEvent.change(screen.getByLabelText('Check-out Date'), {
        target: { value: '2025-08-28' }
      });
      fireEvent.change(screen.getByLabelText('Room Number'), {
        target: { value: '102' }
      });

      // Submit booking
      fireEvent.click(screen.getByText('Book Now'));

      await waitFor(() => {
        expect(screen.getByText('Booking created successfully')).toBeInTheDocument();
      });
    });

    test('should update room status after booking', async () => {
      // Initial state - room available
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'available',
                is_available: true
              }
            ]
          }
        }
      });

      render(<RoomStatus />);

      await waitFor(() => {
        expect(screen.getByText('Available')).toBeInTheDocument();
      });

      // After booking - room becomes pre-booked
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            rooms: [
              {
                room_number: '102',
                availability_status: 'prebooked',
                is_prebooked: true
              }
            ]
          }
        }
      });

      // Trigger refresh
      fireEvent.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(screen.getByText('Pre-booked')).toBeInTheDocument();
      });
    });
  });
});

// Test utilities
export const testUtils = {
  // Helper function to create mock room data
  createMockRoom: (roomNumber, status = 'available') => ({
    room_number: roomNumber,
    availability_status: status,
    status_description: status === 'prebooked' ? 'Pre-booked' : 'Available',
    is_prebooked: status === 'prebooked',
    is_available: status === 'available'
  }),

  // Helper function to simulate API delay
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper function to create mock booking data
  createMockBooking: (data = {}) => ({
    guest_name: 'Test Guest',
    check_in_date: '2025-08-27',
    check_out_date: '2025-08-28',
    room_number: '102',
    ...data
  })
};

export default testUtils;
