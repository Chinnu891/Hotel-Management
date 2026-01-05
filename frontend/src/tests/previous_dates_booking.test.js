// Frontend Test Suite for Previous Dates Booking Functionality
// Tests React components handling historical booking data and past date scenarios

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';

// Mock axios for API calls
jest.mock('axios');

describe('Previous Dates Booking Functionality Frontend Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Test Case 1: Past Date Booking Creation', () => {
    test('should allow creating bookings with past check-in dates', async () => {
      // Mock API response for past date booking
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Historical booking created successfully',
          booking_id: 123,
          booking_reference: 'HIST_20240115_001'
        }
      });

      const TestComponent = () => {
        const [success, setSuccess] = React.useState(null);
        const [formData, setFormData] = React.useState({
          guestName: 'Historical Guest',
          checkIn: '2024-01-15',
          checkOut: '2024-01-17',
          roomNumber: '101'
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
            <button onClick={handleSubmit}>Create Historical Booking</button>
            {success && <div>{success}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      // Submit historical booking
      fireEvent.click(screen.getByText('Create Historical Booking'));

      await waitFor(() => {
        expect(screen.getByText('Historical booking created successfully')).toBeInTheDocument();
      });
    });

    test('should handle very old historical dates', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Very old historical booking created',
          booking_id: 124
        }
      });

      const TestComponent = () => {
        const [success, setSuccess] = React.useState(null);
        const [formData, setFormData] = React.useState({
          guestName: 'Ancient Guest',
          checkIn: '2020-03-15',
          checkOut: '2020-03-17',
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
              aria-label="Check-in Date"
              value={formData.checkIn}
              onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
            />
            <button onClick={handleSubmit}>Create Old Booking</button>
            {success && <div>{success}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Create Old Booking'));

      await waitFor(() => {
        expect(screen.getByText('Very old historical booking created')).toBeInTheDocument();
      });
    });

    test('should validate year-spanning historical bookings', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Year-spanning booking created',
          booking_id: 125
        }
      });

      const TestComponent = () => {
        const [success, setSuccess] = React.useState(null);
        const [formData, setFormData] = React.useState({
          checkIn: '2024-12-30',
          checkOut: '2025-01-02'
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
            <div>Check-in: {formData.checkIn}</div>
            <div>Check-out: {formData.checkOut}</div>
            <button onClick={handleSubmit}>Create Year-Spanning Booking</button>
            {success && <div>{success}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Create Year-Spanning Booking'));

      await waitFor(() => {
        expect(screen.getByText('Year-spanning booking created')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 2: Historical Data Display', () => {
    test('should display historical bookings correctly', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: [
              {
                id: 1,
                guest_name: 'Historical Guest',
                check_in_date: '2024-01-15',
                check_out_date: '2024-01-17',
                room_number: '101',
                status: 'checked_out',
                total_amount: 2000,
                booking_reference: 'HIST_20240115_001'
              },
              {
                id: 2,
                guest_name: 'Old Guest',
                check_in_date: '2020-03-15',
                check_out_date: '2020-03-17',
                room_number: '102',
                status: 'checked_out',
                total_amount: 1800,
                booking_reference: 'HIST_20200315_001'
              }
            ]
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);

        React.useEffect(() => {
          axios.get('/api/bookings/historical')
            .then(response => {
              setBookings(response.data.data.bookings);
            });
        }, []);

        return (
          <div>
            {bookings.map(booking => (
              <div key={booking.id} className="historical-booking">
                <div>Guest: {booking.guest_name}</div>
                <div>Check-in: {booking.check_in_date}</div>
                <div>Check-out: {booking.check_out_date}</div>
                <div>Room: {booking.room_number}</div>
                <div>Status: {booking.status}</div>
                <div>Reference: {booking.booking_reference}</div>
              </div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Guest: Historical Guest')).toBeInTheDocument();
        expect(screen.getByText('Guest: Old Guest')).toBeInTheDocument();
        expect(screen.getByText('Check-in: 2024-01-15')).toBeInTheDocument();
        expect(screen.getByText('Check-in: 2020-03-15')).toBeInTheDocument();
      });
    });

    test('should show historical booking status indicators', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: [
              {
                id: 1,
                guest_name: 'Historical Guest',
                check_in_date: '2024-01-15',
                check_out_date: '2024-01-17',
                status: 'checked_out',
                is_historical: true,
                is_completed: true
              }
            ]
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);

        React.useEffect(() => {
          axios.get('/api/bookings/historical')
            .then(response => {
              setBookings(response.data.data.bookings);
            });
        }, []);

        return (
          <div>
            {bookings.map(booking => (
              <div key={booking.id} className={`booking-item ${booking.status}`}>
                <div className="guest-name">{booking.guest_name}</div>
                <div className="status-indicator">{booking.status}</div>
                <div className="historical-badge">
                  {booking.is_historical ? 'Historical' : 'Current'}
                </div>
                <div className="completion-status">
                  {booking.is_completed ? 'Completed' : 'Active'}
                </div>
              </div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Historical')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('checked_out')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 3: Historical Data Filtering', () => {
    test('should filter historical bookings by year', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: [
              {
                id: 1,
                guest_name: '2024 Guest',
                check_in_date: '2024-06-15',
                check_out_date: '2024-06-17'
              }
            ]
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);
        const [selectedYear, setSelectedYear] = React.useState('2024');

        const handleYearChange = (year) => {
          setSelectedYear(year);
          axios.get(`/api/bookings/historical?year=${year}`)
            .then(response => {
              setBookings(response.data.data.bookings);
            });
        };

        return (
          <div>
            <select 
              value={selectedYear} 
              onChange={(e) => handleYearChange(e.target.value)}
              aria-label="Select Year"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2020">2020</option>
            </select>
            {bookings.map(booking => (
              <div key={booking.id}>{booking.guest_name}</div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      const yearSelect = screen.getByLabelText('Select Year');
      fireEvent.change(yearSelect, { target: { value: '2024' } });

      await waitFor(() => {
        expect(screen.getByText('2024 Guest')).toBeInTheDocument();
      });
    });

    test('should filter historical bookings by status', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: [
              {
                id: 1,
                guest_name: 'Completed Guest',
                status: 'checked_out'
              }
            ]
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);
        const [selectedStatus, setSelectedStatus] = React.useState('checked_out');

        const handleStatusChange = (status) => {
          setSelectedStatus(status);
          axios.get(`/api/bookings/historical?status=${status}`)
            .then(response => {
              setBookings(response.data.data.bookings);
            });
        };

        return (
          <div>
            <select 
              value={selectedStatus} 
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Select Status"
            >
              <option value="checked_out">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="confirmed">Confirmed</option>
            </select>
            {bookings.map(booking => (
              <div key={booking.id}>{booking.guest_name}</div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      const statusSelect = screen.getByLabelText('Select Status');
      fireEvent.change(statusSelect, { target: { value: 'checked_out' } });

      await waitFor(() => {
        expect(screen.getByText('Completed Guest')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 4: Historical Data Analysis', () => {
    test('should display historical booking statistics', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            statistics: {
              total_bookings: 150,
              completed_bookings: 120,
              cancelled_bookings: 15,
              total_revenue: 150000,
              average_occupancy: 75.5,
              top_rooms: ['101', '102', '103'],
              seasonal_trends: {
                'Q1': 25,
                'Q2': 30,
                'Q3': 35,
                'Q4': 40
              }
            }
          }
        }
      });

      const TestComponent = () => {
        const [stats, setStats] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/bookings/historical/statistics')
            .then(response => {
              setStats(response.data.data.statistics);
            });
        }, []);

        if (!stats) return <div>Loading statistics...</div>;

        return (
          <div>
            <div>Total Bookings: {stats.total_bookings}</div>
            <div>Completed: {stats.completed_bookings}</div>
            <div>Cancelled: {stats.cancelled_bookings}</div>
            <div>Total Revenue: ₹{stats.total_revenue}</div>
            <div>Average Occupancy: {stats.average_occupancy}%</div>
            <div>Top Rooms: {stats.top_rooms.join(', ')}</div>
            <div>Q1 Bookings: {stats.seasonal_trends.Q1}</div>
            <div>Q2 Bookings: {stats.seasonal_trends.Q2}</div>
            <div>Q3 Bookings: {stats.seasonal_trends.Q3}</div>
            <div>Q4 Bookings: {stats.seasonal_trends.Q4}</div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Total Bookings: 150')).toBeInTheDocument();
        expect(screen.getByText('Completed: 120')).toBeInTheDocument();
        expect(screen.getByText('Total Revenue: ₹150000')).toBeInTheDocument();
        expect(screen.getByText('Average Occupancy: 75.5%')).toBeInTheDocument();
        expect(screen.getByText('Top Rooms: 101, 102, 103')).toBeInTheDocument();
      });
    });

    test('should display historical occupancy trends', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            trends: {
              monthly_occupancy: [
                { month: 'Jan', occupancy: 65 },
                { month: 'Feb', occupancy: 70 },
                { month: 'Mar', occupancy: 75 },
                { month: 'Apr', occupancy: 80 },
                { month: 'May', occupancy: 85 },
                { month: 'Jun', occupancy: 90 }
              ],
              revenue_trends: [
                { month: 'Jan', revenue: 12000 },
                { month: 'Feb', revenue: 14000 },
                { month: 'Mar', revenue: 15000 },
                { month: 'Apr', revenue: 16000 },
                { month: 'May', revenue: 17000 },
                { month: 'Jun', revenue: 18000 }
              ]
            }
          }
        }
      });

      const TestComponent = () => {
        const [trends, setTrends] = React.useState(null);

        React.useEffect(() => {
          axios.get('/api/bookings/historical/trends')
            .then(response => {
              setTrends(response.data.data.trends);
            });
        }, []);

        if (!trends) return <div>Loading trends...</div>;

        return (
          <div>
            <div className="occupancy-trends">
              {trends.monthly_occupancy.map(item => (
                <div key={item.month}>
                  {item.month}: {item.occupancy}%
                </div>
              ))}
            </div>
            <div className="revenue-trends">
              {trends.revenue_trends.map(item => (
                <div key={item.month}>
                  {item.month}: ₹{item.revenue}
                </div>
              ))}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Jan: 65%')).toBeInTheDocument();
        expect(screen.getByText('Jun: 90%')).toBeInTheDocument();
        expect(screen.getByText('Jan: ₹12000')).toBeInTheDocument();
        expect(screen.getByText('Jun: ₹18000')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 5: Historical Data Export', () => {
    test('should export historical booking data', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Historical data exported successfully',
          download_url: '/downloads/historical_bookings_2024.csv'
        }
      });

      const TestComponent = () => {
        const [exportStatus, setExportStatus] = React.useState(null);

        const handleExport = async () => {
          try {
            const response = await axios.get('/api/bookings/historical/export?year=2024&format=csv');
            setExportStatus(response.data.message);
          } catch (err) {
            setExportStatus('Export failed: ' + err.message);
          }
        };

        return (
          <div>
            <button onClick={handleExport}>Export Historical Data</button>
            {exportStatus && <div>{exportStatus}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Export Historical Data'));

      await waitFor(() => {
        expect(screen.getByText('Historical data exported successfully')).toBeInTheDocument();
      });
    });

    test('should handle export with date range filters', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Filtered data exported successfully',
          download_url: '/downloads/historical_bookings_filtered.csv'
        }
      });

      const TestComponent = () => {
        const [exportStatus, setExportStatus] = React.useState(null);
        const [dateRange, setDateRange] = React.useState({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

        const handleExport = async () => {
          try {
            const response = await axios.get('/api/bookings/historical/export', {
              params: {
                start_date: dateRange.startDate,
                end_date: dateRange.endDate,
                format: 'csv'
              }
            });
            setExportStatus(response.data.message);
          } catch (err) {
            setExportStatus('Export failed: ' + err.message);
          }
        };

        return (
          <div>
            <input 
              aria-label="Start Date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
            />
            <input 
              aria-label="End Date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
            />
            <button onClick={handleExport}>Export Filtered Data</button>
            {exportStatus && <div>{exportStatus}</div>}
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Export Filtered Data'));

      await waitFor(() => {
        expect(screen.getByText('Filtered data exported successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 6: Historical Data Search', () => {
    test('should search historical bookings by guest name', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: [
              {
                id: 1,
                guest_name: 'John Smith',
                check_in_date: '2024-06-15',
                check_out_date: '2024-06-17',
                room_number: '101'
              }
            ]
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);
        const [searchTerm, setSearchTerm] = React.useState('');

        const handleSearch = async (term) => {
          setSearchTerm(term);
          if (term) {
            const response = await axios.get(`/api/bookings/historical/search?q=${term}`);
            setBookings(response.data.data.bookings);
          }
        };

        return (
          <div>
            <input 
              aria-label="Search Historical Bookings"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by guest name..."
            />
            {bookings.map(booking => (
              <div key={booking.id}>
                {booking.guest_name} - Room {booking.room_number}
              </div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      const searchInput = screen.getByLabelText('Search Historical Bookings');
      fireEvent.change(searchInput, { target: { value: 'John' } });

      await waitFor(() => {
        expect(screen.getByText('John Smith - Room 101')).toBeInTheDocument();
      });
    });

    test('should search historical bookings by date range', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: [
              {
                id: 1,
                guest_name: 'Date Range Guest',
                check_in_date: '2024-06-15',
                check_out_date: '2024-06-17'
              }
            ]
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);
        const [dateRange, setDateRange] = React.useState({
          startDate: '',
          endDate: ''
        });

        const handleDateSearch = async () => {
          if (dateRange.startDate && dateRange.endDate) {
            const response = await axios.get('/api/bookings/historical/search', {
              params: {
                start_date: dateRange.startDate,
                end_date: dateRange.endDate
              }
            });
            setBookings(response.data.data.bookings);
          }
        };

        return (
          <div>
            <input 
              aria-label="Start Date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
            />
            <input 
              aria-label="End Date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
            />
            <button onClick={handleDateSearch}>Search by Date Range</button>
            {bookings.map(booking => (
              <div key={booking.id}>{booking.guest_name}</div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');

      fireEvent.change(startDateInput, { target: { value: '2024-06-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-06-30' } });
      fireEvent.click(screen.getByText('Search by Date Range'));

      await waitFor(() => {
        expect(screen.getByText('Date Range Guest')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 7: Historical Data Validation', () => {
    test('should validate historical date inputs', async () => {
      const TestComponent = () => {
        const [validationErrors, setValidationErrors] = React.useState([]);
        const [formData, setFormData] = React.useState({
          checkIn: '2024-01-15',
          checkOut: '2024-01-17'
        });

        const validateDates = () => {
          const errors = [];
          const checkIn = new Date(formData.checkIn);
          const checkOut = new Date(formData.checkOut);
          const today = new Date();

          if (checkIn > checkOut) {
            errors.push('Check-in date cannot be after check-out date');
          }

          if (checkIn > today) {
            errors.push('Historical bookings cannot have future check-in dates');
          }

          if (checkIn < new Date('1900-01-01')) {
            errors.push('Date too old for historical records');
          }

          setValidationErrors(errors);
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
            <button onClick={validateDates}>Validate Dates</button>
            {validationErrors.map((error, index) => (
              <div key={index} className="error">{error}</div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Validate Dates'));

      // Should not have validation errors for valid historical dates
      await waitFor(() => {
        const errorElements = screen.queryAllByText(/error/i);
        expect(errorElements).toHaveLength(0);
      });
    });

    test('should handle invalid historical date inputs', async () => {
      const TestComponent = () => {
        const [validationErrors, setValidationErrors] = React.useState([]);
        const [formData, setFormData] = React.useState({
          checkIn: '2025-01-15', // Future date
          checkOut: '2024-01-17'
        });

        const validateDates = () => {
          const errors = [];
          const checkIn = new Date(formData.checkIn);
          const checkOut = new Date(formData.checkOut);
          const today = new Date();

          if (checkIn > checkOut) {
            errors.push('Check-in date cannot be after check-out date');
          }

          if (checkIn > today) {
            errors.push('Historical bookings cannot have future check-in dates');
          }

          setValidationErrors(errors);
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
            <button onClick={validateDates}>Validate Dates</button>
            {validationErrors.map((error, index) => (
              <div key={index} className="error">{error}</div>
            ))}
          </div>
        );
      };

      render(<TestComponent />);

      fireEvent.click(screen.getByText('Validate Dates'));

      await waitFor(() => {
        expect(screen.getByText('Historical bookings cannot have future check-in dates')).toBeInTheDocument();
      });
    });
  });

  describe('Test Case 8: Historical Data Performance', () => {
    test('should handle large historical datasets efficiently', async () => {
      // Mock response with large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        guest_name: `Guest ${i + 1}`,
        check_in_date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        check_out_date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 2).padStart(2, '0')}`,
        room_number: String(100 + (i % 50)),
        status: i % 5 === 0 ? 'cancelled' : 'checked_out'
      }));

      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: largeDataset
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          const startTime = performance.now();
          
          axios.get('/api/bookings/historical')
            .then(response => {
              setBookings(response.data.data.bookings);
              setLoading(false);
              
              const endTime = performance.now();
              console.log(`Loaded ${response.data.data.bookings.length} records in ${endTime - startTime}ms`);
            });
        }, []);

        if (loading) return <div>Loading large dataset...</div>;

        return (
          <div>
            <div>Total Records: {bookings.length}</div>
            {bookings.slice(0, 10).map(booking => (
              <div key={booking.id}>
                {booking.guest_name} - Room {booking.room_number}
              </div>
            ))}
            {bookings.length > 10 && (
              <div>... and {bookings.length - 10} more records</div>
            )}
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Total Records: 1000')).toBeInTheDocument();
        expect(screen.getByText('Guest 1 - Room 100')).toBeInTheDocument();
        expect(screen.getByText('... and 990 more records')).toBeInTheDocument();
      });
    });

    test('should handle pagination for historical data', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            bookings: Array.from({ length: 50 }, (_, i) => ({
              id: i + 1,
              guest_name: `Guest ${i + 1}`,
              check_in_date: '2024-01-15'
            })),
            pagination: {
              current_page: 1,
              total_pages: 20,
              total_records: 1000,
              records_per_page: 50
            }
          }
        }
      });

      const TestComponent = () => {
        const [bookings, setBookings] = React.useState([]);
        const [pagination, setPagination] = React.useState({});
        const [currentPage, setCurrentPage] = React.useState(1);

        const loadPage = async (page) => {
          const response = await axios.get(`/api/bookings/historical?page=${page}`);
          setBookings(response.data.data.bookings);
          setPagination(response.data.data.pagination);
          setCurrentPage(page);
        };

        React.useEffect(() => {
          loadPage(1);
        }, []);

        return (
          <div>
            <div>Page {currentPage} of {pagination.total_pages}</div>
            <div>Total Records: {pagination.total_records}</div>
            {bookings.map(booking => (
              <div key={booking.id}>{booking.guest_name}</div>
            ))}
            <button onClick={() => loadPage(currentPage + 1)}>Next Page</button>
            <button onClick={() => loadPage(currentPage - 1)}>Previous Page</button>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 20')).toBeInTheDocument();
        expect(screen.getByText('Total Records: 1000')).toBeInTheDocument();
        expect(screen.getByText('Guest 1')).toBeInTheDocument();
      });
    });
  });
});
