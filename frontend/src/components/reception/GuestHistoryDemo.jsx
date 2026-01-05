import React, { useState } from 'react';
import './GuestHistory.css';

const GuestHistoryDemo = () => {
  const [searchType, setSearchType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [corporateOnly, setCorporateOnly] = useState(false);
  const [dueAmount, setDueAmount] = useState('All');
  const [showCheckedOut, setShowCheckedOut] = useState(false);
  const [guestHistory, setGuestHistory] = useState([]);

  // Sample data for demonstration
  const sampleGuestHistory = [
    {
      id: 1,
      guestName: 'John Smith',
      phone: '+91 98765 43210',
      email: 'john.smith@email.com',
      roomNumber: '101',
      roomType: 'Deluxe',
      checkIn: '2024-01-15',
      checkOut: '2024-01-18',
      status: 'Checked Out',
      ratePerNight: 2500,
      totalAmount: 7500,
      paidAmount: 7500,
      dueAmount: 0,
      bookingReference: 'BK001',
      corporateName: 'Tech Corp',
      corporateId: 'TC001',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    },
    {
      id: 2,
      guestName: 'Sarah Johnson',
      phone: '+91 87654 32109',
      email: 'sarah.j@email.com',
      roomNumber: '205',
      roomType: 'Premium',
      checkIn: '2024-01-16',
      checkOut: '2024-01-20',
      status: 'Checked In',
      ratePerNight: 3500,
      totalAmount: 14000,
      paidAmount: 10000,
      dueAmount: 4000,
      bookingReference: 'BK002',
      corporateName: null,
      corporateId: null,
      address: '456 Park Ave',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001'
    },
    {
      id: 3,
      guestName: 'Michael Brown',
      phone: '+91 76543 21098',
      email: 'michael.b@email.com',
      roomNumber: '308',
      roomType: 'Suite',
      checkIn: '2024-01-17',
      checkOut: '2024-01-19',
      status: 'Pending',
      ratePerNight: 5000,
      totalAmount: 10000,
      paidAmount: 0,
      dueAmount: 10000,
      bookingReference: 'BK003',
      corporateName: 'Business Inc',
      corporateId: 'BI002',
      address: '789 Business Rd',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    }
  ];

  const searchTypes = [
    'All',
    'Guest Name',
    'Room Number',
    'Phone Number',
    'Email',
    'Booking ID'
  ];

  const statusOptions = [
    'All Status',
    'Checked In',
    'Checked Out',
    'Pending',
    'Cancelled',
    'No Show'
  ];

  const dueAmountOptions = [
    'All',
    'No Due',
    'Less than ₹1000',
    '₹1000 - ₹5000',
    'More than ₹5000'
  ];

  const handleSearch = () => {
    // Simulate search with filters
    let filteredResults = [...sampleGuestHistory];

    // Apply search filters
    if (searchType !== 'All' && searchTerm) {
      filteredResults = filteredResults.filter(guest => {
        switch (searchType) {
          case 'Guest Name':
            return guest.guestName.toLowerCase().includes(searchTerm.toLowerCase());
          case 'Room Number':
            return guest.roomNumber.includes(searchTerm);
          case 'Phone Number':
            return guest.phone.includes(searchTerm);
          case 'Email':
            return guest.email.toLowerCase().includes(searchTerm.toLowerCase());
          case 'Booking ID':
            return guest.bookingReference.toLowerCase().includes(searchTerm.toLowerCase());
          default:
            return true;
        }
      });
    }

    // Apply status filter
    if (statusFilter !== 'All Status') {
      filteredResults = filteredResults.filter(guest => guest.status === statusFilter);
    }

    // Apply corporate filter
    if (corporateOnly) {
      filteredResults = filteredResults.filter(guest => guest.corporateName);
    }

    // Apply due amount filter
    if (dueAmount !== 'All') {
      filteredResults = filteredResults.filter(guest => {
        switch (dueAmount) {
          case 'No Due':
            return guest.dueAmount === 0;
          case 'Less than ₹1000':
            return guest.dueAmount > 0 && guest.dueAmount < 1000;
          case '₹1000 - ₹5000':
            return guest.dueAmount >= 1000 && guest.dueAmount <= 5000;
          case 'More than ₹5000':
            return guest.dueAmount > 5000;
          default:
            return true;
        }
      });
    }

    // Apply checked out filter
    if (!showCheckedOut) {
      filteredResults = filteredResults.filter(guest => guest.status !== 'Checked Out');
    }

    setGuestHistory(filteredResults);
  };

  const handleReset = () => {
    setSearchType('All');
    setSearchTerm('');
    setStatusFilter('All Status');
    setCorporateOnly(false);
    setDueAmount('All');
    setShowCheckedOut(false);
    setGuestHistory([]);
  };

  return (
    <div className="guest-history-container">
      <div className="guest-history-header">
        <h2>Guest History (Demo Mode)</h2>
        <p>Search and filter guest history records - Using sample data for demonstration</p>
      </div>

      {/* Search and Filter Form */}
      <div className="search-filter-card">
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="searchType">Search Type</label>
            <select
              id="searchType"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              {searchTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="searchTerm">Search Term</label>
            <input
              type="text"
              id="searchTerm"
              placeholder="Enter search term..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="statusFilter">Status Filter</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Corporate Filter</label>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="corporateOnly"
                checked={corporateOnly}
                onChange={(e) => setCorporateOnly(e.target.checked)}
              />
              <label htmlFor="corporateOnly">Corporate Only</label>
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="dueAmount">Due Amount</label>
            <select
              id="dueAmount"
              value={dueAmount}
              onChange={(e) => setDueAmount(e.target.value)}
            >
              {dueAmountOptions.map(amount => (
                <option key={amount} value={amount}>{amount}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Include Checked Out</label>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="showCheckedOut"
                checked={showCheckedOut}
                onChange={(e) => setShowCheckedOut(e.target.checked)}
              />
              <label htmlFor="showCheckedOut">Show Checked Out</label>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button className="btn-search" onClick={handleSearch}>
            Search
          </button>
        </div>
      </div>

      {/* Results Section */}
      {guestHistory.length > 0 && (
        <div className="results-section">
          <h3>Search Results ({guestHistory.length})</h3>
          <div className="guest-history-table">
            <table>
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Room Number</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Due Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guestHistory.map((guest) => (
                  <tr key={guest.id}>
                    <td>{guest.guestName}</td>
                    <td>{guest.roomNumber}</td>
                    <td>{guest.checkIn}</td>
                    <td>{guest.checkOut}</td>
                    <td>
                      <span className={`status-badge status-${guest.status.toLowerCase().replace(' ', '-')}`}>
                        {guest.status}
                      </span>
                    </td>
                    <td>₹{guest.dueAmount}</td>
                    <td>
                      <button className="btn-view">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {guestHistory.length === 0 && (
        <div className="no-results">
          <p>No guest history records found. Use the filters above to search for specific records.</p>
        </div>
      )}
    </div>
  );
};

export default GuestHistoryDemo;
