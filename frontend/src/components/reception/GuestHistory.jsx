import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, buildApiUrl } from '../../config/api';
import './GuestHistory.css';

const GuestHistory = () => {
  const [searchType, setSearchType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [corporateOnly, setCorporateOnly] = useState(false);
  const [dueAmount, setDueAmount] = useState('All');
  const [showCheckedOut, setShowCheckedOut] = useState(false);
  const [guestHistory, setGuestHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(20);
  
  // Date filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Auto-search on component mount
  useEffect(() => {
    handleSearch(1);
  }, []);

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

  const handleSearch = async (page = 1) => {
    setLoading(true);
    try {
      // API call to fetch guest history based on filters
      const response = await fetch(buildApiUrl(API_ENDPOINTS.RECEPTION_GUEST_HISTORY), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchType,
          searchTerm,
          statusFilter,
          corporateOnly,
          dueAmount,
          showCheckedOut,
          dateFrom,
          dateTo,
          page,
          limit: itemsPerPage
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        if (data.success) {
          setGuestHistory(data.data);
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
          // Don't override the page if we're explicitly navigating
          if (page === 1) {
            setCurrentPage(1);
          }
          console.log('Updated state - totalPages:', data.pagination.totalPages, 'totalCount:', data.pagination.totalCount, 'currentPage:', page);
        } else {
          console.error('API Error:', data.message);
          setGuestHistory([]);
          setTotalPages(1);
          setTotalCount(0);
          setCurrentPage(1);
        }
      } else {
        console.error('HTTP Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching guest history:', error);
      setGuestHistory([]);
      setTotalPages(1);
      setTotalCount(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchType('All');
    setSearchTerm('');
    setStatusFilter('All Status');
    setCorporateOnly(false);
    setDueAmount('All');
    setShowCheckedOut(false);
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    setGuestHistory([]);
    setTotalPages(1);
    setTotalCount(0);
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      
      // Create a form to submit the export request
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = buildApiUrl(API_ENDPOINTS.RECEPTION_GUEST_HISTORY);
      form.target = '_blank';
      
      // Add all the current filter parameters
      const formData = {
        searchType,
        searchTerm,
        statusFilter,
        corporateOnly,
        dueAmount,
        showCheckedOut,
        dateFrom,
        dateTo,
        exportFormat: 'csv'
      };
      
      // Create hidden inputs for each parameter
      Object.keys(formData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = typeof formData[key] === 'boolean' ? formData[key].toString() : formData[key];
        form.appendChild(input);
      });
      
      // Submit the form to trigger CSV download
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (newPage) => {
    console.log('handlePageChange called with page:', newPage, 'totalPages:', totalPages);
    if (newPage >= 1 && newPage <= totalPages) {
      console.log('Setting current page to:', newPage);
      setCurrentPage(newPage);
      await handleSearch(newPage);
    } else {
      console.log('Invalid page number:', newPage);
    }
  };

  const handleNextPage = () => {
    console.log('handleNextPage called. currentPage:', currentPage, 'totalPages:', totalPages);
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      console.log('Navigating to next page:', nextPage);
      handlePageChange(nextPage);
    } else {
      console.log('Already on last page');
    }
  };

  const handlePrevPage = () => {
    console.log('handlePrevPage called. currentPage:', currentPage);
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      console.log('Navigating to previous page:', prevPage);
      handlePageChange(prevPage);
    } else {
      console.log('Already on first page');
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="guest-history-container">
      <div className="guest-history-header">
        <h2>Guest Search & Management</h2>
        <p>Search and manage guest information across all bookings</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-number">{totalCount}</div>
          <div className="stat-label">TOTAL GUESTS</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">0</div>
          <div className="stat-label">BOOKED</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">0</div>
          <div className="stat-label">CHECKED IN</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">0</div>
          <div className="stat-label">CHECKED OUT</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">₹0</div>
          <div className="stat-label">TOTAL DUE AMOUNT</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">0</div>
          <div className="stat-label">OWNER REFERENCE</div>
        </div>
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
            <label htmlFor="dateFrom">Date From</label>
            <input
              type="date"
              id="dateFrom"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="dateTo">Date To</label>
            <input
              type="date"
              id="dateTo"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
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

          <div className="filter-group">
            <label>Items Per Page</label>
            <div className="items-per-page">
              <span>{itemsPerPage} per page</span>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button className="btn-search" onClick={() => handleSearch(1)} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button 
            className="btn-export" 
            onClick={handleExportCSV} 
            disabled={loading}
            style={{backgroundColor: '#28a745', color: 'white'}}
          >
            📊 Export CSV
          </button>
          <button 
            className="btn-search" 
            onClick={() => {
              console.log('Debug: Testing pagination');
              console.log('Current state:', { currentPage, totalPages, totalCount });
              if (totalPages > 1) {
                console.log('Testing next page...');
                handleNextPage();
              } else {
                console.log('No pagination needed - only 1 page');
              }
            }}
            style={{backgroundColor: '#28a745'}}
          >
            Test Next
          </button>
        </div>
      </div>

      {/* Results Section */}
      {guestHistory.length > 0 && (
        <div className="results-section">
          <h3>Search Results ({totalCount} total, showing {guestHistory.length} on page {currentPage})</h3>
          <div className="guest-history-table">
            <table>
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Room Number</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Plan Type</th>
                  <th>Owner Reference</th>
                  <th>Due Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guestHistory.map((guest, index) => (
                  <tr key={index}>
                    <td>{guest.guestName}</td>
                    <td>{guest.roomNumber}</td>
                    <td>{guest.checkIn}</td>
                    <td>{guest.checkOut}</td>
                    <td>
                      <span className={`status-badge ${guest.booking_status.toLowerCase()}`}>
                        {guest.booking_status}
                      </span>
                    </td>
                    <td>
                      <span className="plan-type">
                        {(() => {
                          const planType = guest.plan_type;
                          if (planType === 'EP') return 'European Plan (Room Only)';
                          if (planType === 'CP') return 'Continental Plan (With Breakfast)';
                          if (planType === 'AP') return 'American Plan (With All Meals)';
                          if (planType === 'MAP') return 'Modified American Plan (With Breakfast & Dinner)';
                          return planType || 'N/A';
                        })()}
                      </span>
                    </td>
                    <td>
                      {guest.ownerReference ? (
                        <span className="owner-reference-badge">
                          ✅ Referenced by Owner
                        </span>
                      ) : (
                        <span className="no-owner-reference">
                          Regular Booking
                        </span>
                      )}
                    </td>
                    <td>
                      {guest.ownerReference ? (
                        <span className="no-payment-required">
                          No Payment Required
                        </span>
                      ) : (
                        <span className={guest.dueAmount > 0 ? 'due-amount' : 'no-due'}>
                          ₹{guest.dueAmount || 0}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="btn-view">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <div className="pagination-info">
                <span>Page {currentPage} of {totalPages}</span>
                <span>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results</span>
              </div>
              
              <div className="pagination-buttons">
                <button 
                  className="pagination-btn prev-btn"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                
                {getPageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    className={`pagination-btn page-btn ${
                      pageNum === currentPage ? 'active' : ''
                    } ${pageNum === '...' ? 'disabled' : ''}`}
                    onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                    disabled={pageNum === '...'}
                  >
                    {pageNum}
                  </button>
                ))}
                
                <button 
                  className="pagination-btn next-btn"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
              
              {/* Debug information */}
              <div style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>
                Debug: currentPage={currentPage}, totalPages={totalPages}, totalCount={totalCount}
              </div>
            </div>
          )}
        </div>
      )}

      {guestHistory.length === 0 && !loading && (
        <div className="no-results">
          <p>No guest history records found. Use the filters above to search for specific records.</p>
        </div>
      )}

      {/* Footer/Sync Information */}
      <div className="footer-sync">
        <div className="sync-info">
          <span className="sync-icon">🔄</span>
          <span>Auto-sync active</span>
          <span className="sync-time">Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="sync-details">
          <span>Data automatically syncs with admin dashboard every 10 seconds.</span>
          <button className="sync-refresh">Refresh Now</button>
        </div>
      </div>
    </div>
  );
};

export default GuestHistory;
