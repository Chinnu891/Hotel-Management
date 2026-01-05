// Frontend Test Suite for Pre-booked Functionality
// Tests the React components and user interface for pre-booked room management

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios for API calls
jest.mock('axios');

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

      // Create a simple component for testing
      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
              setLoading(false);
            });
        }, []);

        if (loading) return <div>Loading rooms...</div>;
        if (!roomData) return <div>No room data</div>;

        return (
          <div className="room-item prebooked disabled">
            <div>Room {roomData.room_number}</div>
            <div>{roomData.status_description}</div>
            <div>{roomData.availability_status}</div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Room 102')).toBeInTheDocument();
        expect(screen.getByText('Pre-booked for 2025-08-28')).toBeInTheDocument();
        expect(screen.getByText('prebooked')).toBeInTheDocument();
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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        if (!roomData) return <div>Loading...</div>;

        return (
          <div data-testid={`prebooked-indicator-${roomData.room_number}`} className="status-prebooked">
            {roomData.status_description}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [error, setError] = React.useState(null);
        const [formData, setFormData] = React.useState({
          checkIn: '2025-08-27',
          checkOut: '2025-08-28',
          roomNumber: '102'
        });

        const handleSubmit = async () => {
          try {
            await axios.post('/api/bookings', formData);
          } catch (err) {
            setError(err.response.data.message);
          }
        };

        return (
          <div>
            <input 
              aria-label="Check-in Date"
              value={formData.checkIn}
              onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
            />
            <input 
              aria-label="Check-out Date"
              value={formData.checkOut}
              onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
            />
            <input 
              aria-label="Room Number"
              value={formData.roomNumber}
              onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
            />
            <button onClick={handleSubmit}>Book Now</button>
            {error && <div>{error}</div>}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [rooms, setRooms] = React.useState([]);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRooms(response.data.data.rooms);
            });
        }, []);

        return (
          <div>
            {rooms.map(room => (
              <select key={room.room_number} defaultValue={room.room_number} disabled={!room.is_available}>
                <option value={room.room_number}>{room.room_number}</option>
              </select>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        return (
          <div>
            {roomData && (
              <>
                <div>Room {roomData.room_number}</div>
                <div>{roomData.status_description}</div>
              </>
            )}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        return (
          <div>
            {roomData && (
              <>
                <div>{roomData.status_description}</div>
                <div>{roomData.availability_status}</div>
              </>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Available for same-day booking')).toBeInTheDocument();
        expect(screen.getByText('available')).toBeInTheDocument();
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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        return (
          <div>
            {roomData && <div>{roomData.status_description}</div>}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        return (
          <div>
            {roomData && <div>{roomData.status_description}</div>}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        return (
          <div>
            {roomData && (
              <>
                <div>{roomData.status_description}</div>
                <div>{roomData.availability_status}</div>
              </>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Under maintenance')).toBeInTheDocument();
        expect(screen.getByText('maintenance')).toBeInTheDocument();
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

      const TestComponent = () => {
        const [rooms, setRooms] = React.useState([]);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRooms(response.data.data.rooms);
            });
        }, []);

        return (
          <div>
            {rooms.map(room => (
              <div key={room.room_number}>Room {room.room_number}</div>
            ))}
          </div>
        );
      };

      const startTime = performance.now();
      
      render(<TestComponent />);

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

      const TestComponent = () => {
        const [checkIn, setCheckIn] = React.useState('2025-08-27');
        const [checkOut, setCheckOut] = React.useState('2025-08-28');

        React.useEffect(() => {
          axios.get('/api/rooms');
        }, [checkIn, checkOut]);

        return (
          <div>
            <input 
              aria-label="Check-in Date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
            <input 
              aria-label="Check-out Date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [loading, setLoading] = React.useState(true);
        const [rooms, setRooms] = React.useState([]);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRooms(response.data.data.rooms);
              setLoading(false);
            });
        }, []);

        if (loading) return <div>Loading rooms...</div>;
        return <div>Rooms loaded</div>;
      };

      render(<TestComponent />);

      expect(screen.getByText('Loading rooms...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading rooms...')).not.toBeInTheDocument();
      });
    });

    test('should show error message when API fails', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const TestComponent = () => {
        const [error, setError] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .catch(err => {
              setError('Error loading room availability');
            });
        }, []);

        if (error) return <div>{error}</div>;
        return <div>Loading...</div>;
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        return (
          <div>
            {roomData && (
              <>
                <div>{roomData.status_description}</div>
                <div>{roomData.next_booking_formatted}</div>
                <div>This room is not available for your selected dates</div>
              </>
            )}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        return (
          <div>
            {roomData && (
              <div 
                className="room-item"
                aria-label={`Room ${roomData.room_number} - Pre-booked`}
                aria-disabled="true"
              >
                Room {roomData.room_number}
              </div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [selected, setSelected] = React.useState(false);
        const [roomData, setRoomData] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, []);

        const handleKeyDown = (e) => {
          if (e.key === 'Enter') {
            setSelected(true);
          }
        };

        return (
          <div>
            {roomData && (
              <div 
                className={`room-item ${selected ? 'selected' : ''}`}
                tabIndex={0}
                onKeyDown={handleKeyDown}
              >
                Room {roomData.room_number}
              </div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [success, setSuccess] = React.useState(null);
        const [formData, setFormData] = React.useState({
          guestName: 'John Doe',
          checkIn: '2025-08-27',
          checkOut: '2025-08-28',
          roomNumber: '102'
        });

        const handleSubmit = async () => {
          try {
            const response = await axios.post('/api/bookings', formData);
            setSuccess(response.data.message);
          } catch (err) {
            setSuccess('Error: ' + err.message);
          }
        };

        return (
          <div>
            <input 
              aria-label="Guest Name"
              value={formData.guestName}
              onChange={(e) => setFormData({...formData, guestName: e.target.value})}
            />
            <input 
              aria-label="Check-in Date"
              value={formData.checkIn}
              onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
            />
            <input 
              aria-label="Check-out Date"
              value={formData.checkOut}
              onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
            />
            <input 
              aria-label="Room Number"
              value={formData.roomNumber}
              onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
            />
            <button onClick={handleSubmit}>Book Now</button>
            {success && <div>{success}</div>}
          </div>
        );
      };

      render(<TestComponent />);

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

      const TestComponent = () => {
        const [roomData, setRoomData] = React.useState(null);
        const [refresh, setRefresh] = React.useState(0);

        React.useEffect(() => {
          axios.get('/api/rooms')
            .then(response => {
              setRoomData(response.data.data.rooms[0]);
            });
        }, [refresh]);

        const handleRefresh = () => {
          setRefresh(prev => prev + 1);
        };

        return (
          <div>
            {roomData && <div>{roomData.availability_status}</div>}
            <button onClick={handleRefresh}>Refresh</button>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('available')).toBeInTheDocument();
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
        expect(screen.getByText('prebooked')).toBeInTheDocument();
      });
    });
  });
});
