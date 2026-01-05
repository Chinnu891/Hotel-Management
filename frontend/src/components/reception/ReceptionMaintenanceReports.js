import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { FaChartBar, FaDownload, FaFilter, FaCalendarAlt, FaTools, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';
import './ReceptionMaintenanceReports.css';

const ReceptionMaintenanceReports = () => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    priority: 'all',
    issueType: 'all'
  });
  const [reportType, setReportType] = useState('summary');
  const [chartData, setChartData] = useState({});

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [maintenanceData, filters]);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_GET_ALL));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceData(data.data.maintenance_items || []);
        generateChartData(data.data.maintenance_items || []);
      } else {
        setError(data.message || 'Failed to fetch maintenance data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (data) => {
    // Status distribution
    const statusCounts = data.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    // Priority distribution
    const priorityCounts = data.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {});

    // Issue type distribution
    const issueTypeCounts = data.reduce((acc, item) => {
      acc[item.issue_type] = (acc[item.issue_type] || 0) + 1;
      return acc;
    }, {});

    // Monthly trends
    const monthlyTrends = data.reduce((acc, item) => {
      const month = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    setChartData({
      statusCounts,
      priorityCounts,
      issueTypeCounts,
      monthlyTrends
    });
  };

  const applyFilters = () => {
    let filtered = [...maintenanceData];

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(item => 
        new Date(item.created_at) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(item => 
        new Date(item.created_at) <= new Date(filters.dateTo)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(item => item.priority === filters.priority);
    }

    // Issue type filter
    if (filters.issueType !== 'all') {
      filtered = filtered.filter(item => item.issue_type === filters.issueType);
    }

    setFilteredData(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportReport = (format = 'csv') => {
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'pdf') {
      exportToPDF();
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Room', 'Issue Type', 'Description', 'Priority', 'Status', 
      'Created Date', 'Assigned To', 'Estimated Duration', 'Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.id,
        `Room ${item.room_number}`,
        item.issue_type,
        `"${item.description}"`,
        item.priority,
        item.status,
        new Date(item.created_at).toLocaleDateString(),
        item.assigned_to_name || 'Unassigned',
        item.estimated_duration || 'N/A',
        `"${item.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // Simple PDF generation using browser print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Maintenance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Maintenance Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p>Total Requests: ${filteredData.length}</p>
            <p>Date Range: ${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Room</th>
                <th>Issue Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.id}</td>
                  <td>Room ${item.room_number}</td>
                  <td>${item.issue_type}</td>
                  <td>${item.priority}</td>
                  <td>${item.status}</td>
                  <td>${new Date(item.created_at).toLocaleDateString()}</td>
                  <td>${item.assigned_to_name || 'Unassigned'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      assigned: 'text-blue-600 bg-blue-100',
      in_progress: 'text-orange-600 bg-orange-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || colors.pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-green-600 bg-green-100'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <FaExclamationTriangle className="text-red-400 text-xl" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="maintenance-reports-container">
      {/* Header */}
      <div className="reports-header">
        <div className="header-content">
          <h1 className="reports-title">
            <FaChartBar className="title-icon" />
            Maintenance Reports & Analytics
          </h1>
          <p className="reports-subtitle">
            Generate comprehensive reports and analyze maintenance trends
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => exportReport('csv')}
            className="btn btn-secondary"
          >
            <FaDownload className="btn-icon" />
            Export CSV
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="btn btn-primary"
          >
            <FaDownload className="btn-icon" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>Filters</h3>
          <FaFilter className="filter-icon" />
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Issue Type</label>
            <select
              value={filters.issueType}
              onChange={(e) => handleFilterChange('issueType', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="repair">Repair</option>
              <option value="cleaning">Cleaning</option>
              <option value="inspection">Inspection</option>
              <option value="upgrade">Upgrade</option>
              <option value="replacement">Replacement</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="report-tabs">
        <button
          onClick={() => setReportType('summary')}
          className={`tab-btn ${reportType === 'summary' ? 'active' : ''}`}
        >
          <FaChartBar className="tab-icon" />
          Summary
        </button>
        <button
          onClick={() => setReportType('detailed')}
          className={`tab-btn ${reportType === 'detailed' ? 'active' : ''}`}
        >
          <FaTools className="tab-icon" />
          Detailed Report
        </button>
        <button
          onClick={() => setReportType('analytics')}
          className={`tab-btn ${reportType === 'analytics' ? 'active' : ''}`}
        >
          <FaExclamationTriangle className="tab-icon" />
          Analytics
        </button>
      </div>

      {/* Summary Report */}
      {reportType === 'summary' && (
        <div className="summary-report">
          <div className="summary-stats">
            <div className="stat-card">
              <div className="stat-icon total">
                <FaTools />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">{filteredData.length}</h3>
                <p className="stat-label">Total Requests</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon pending">
                <FaClock />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">
                  {filteredData.filter(item => item.status === 'pending').length}
                </h3>
                <p className="stat-label">Pending</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon in-progress">
                <FaTools />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">
                  {filteredData.filter(item => item.status === 'in_progress').length}
                </h3>
                <p className="stat-label">In Progress</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon completed">
                <FaCheckCircle />
              </div>
              <div className="stat-content">
                <h3 className="stat-number">
                  {filteredData.filter(item => item.status === 'completed').length}
                </h3>
                <p className="stat-label">Completed</p>
              </div>
            </div>
          </div>

          <div className="summary-charts">
            <div className="chart-container">
              <h4>Status Distribution</h4>
              <div className="chart-content">
                {Object.entries(chartData.statusCounts || {}).map(([status, count]) => (
                  <div key={status} className="chart-item">
                    <div className="chart-label">{status.replace('_', ' ')}</div>
                    <div className="chart-bar">
                      <div 
                        className="chart-fill"
                        style={{ 
                          width: `${(count / filteredData.length) * 100}%`,
                          backgroundColor: getStatusColor(status).includes('yellow') ? '#f59e0b' :
                                         getStatusColor(status).includes('blue') ? '#3b82f6' :
                                         getStatusColor(status).includes('orange') ? '#f97316' :
                                         getStatusColor(status).includes('green') ? '#10b981' : '#6b7280'
                        }}
                      ></div>
                    </div>
                    <div className="chart-value">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-container">
              <h4>Priority Distribution</h4>
              <div className="chart-content">
                {Object.entries(chartData.priorityCounts || {}).map(([priority, count]) => (
                  <div key={priority} className="chart-item">
                    <div className="chart-label">{priority}</div>
                    <div className="chart-bar">
                      <div 
                        className="chart-fill"
                        style={{ 
                          width: `${(count / filteredData.length) * 100}%`,
                          backgroundColor: getPriorityColor(priority).includes('red') ? '#ef4444' :
                                         getPriorityColor(priority).includes('orange') ? '#f97316' :
                                         getPriorityColor(priority).includes('yellow') ? '#f59e0b' : '#10b981'
                        }}
                      ></div>
                    </div>
                    <div className="chart-value">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Report */}
      {reportType === 'detailed' && (
        <div className="detailed-report">
          <div className="report-header">
            <h3>Detailed Maintenance Report</h3>
            <p>Showing {filteredData.length} maintenance requests</p>
          </div>
          
          <div className="report-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Room</th>
                  <th>Issue Type</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td>Room {item.room_number}</td>
                    <td>{item.issue_type}</td>
                    <td className="description-cell">
                      {item.description.length > 50 
                        ? `${item.description.substring(0, 50)}...` 
                        : item.description
                      }
                    </td>
                    <td>
                      <span className={`priority-badge ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{item.assigned_to_name || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Report */}
      {reportType === 'analytics' && (
        <div className="analytics-report">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>Monthly Trends</h4>
              <div className="trend-chart">
                {Object.entries(chartData.monthlyTrends || {}).map(([month, count]) => (
                  <div key={month} className="trend-item">
                    <div className="trend-month">{month}</div>
                    <div className="trend-bar">
                      <div 
                        className="trend-fill"
                        style={{ height: `${(count / Math.max(...Object.values(chartData.monthlyTrends || {}))) * 100}%` }}
                      ></div>
                    </div>
                    <div className="trend-count">{count}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h4>Issue Type Analysis</h4>
              <div className="issue-analysis">
                {Object.entries(chartData.issueTypeCounts || {}).map(([type, count]) => (
                  <div key={type} className="issue-item">
                    <div className="issue-type">{type}</div>
                    <div className="issue-count">{count}</div>
                    <div className="issue-percentage">
                      {((count / filteredData.length) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analytics-card">
              <h4>Performance Metrics</h4>
              <div className="metrics-list">
                <div className="metric-item">
                  <div className="metric-label">Average Response Time</div>
                  <div className="metric-value">
                    {filteredData.length > 0 
                      ? `${Math.round(filteredData.reduce((acc, item) => {
                          if (item.status === 'completed' && item.start_time) {
                            const start = new Date(item.start_time);
                            const created = new Date(item.created_at);
                            return acc + (start - created);
                          }
                          return acc;
                        }, 0) / filteredData.filter(item => item.status === 'completed' && item.start_time).length / (1000 * 60 * 60))} hours`
                      : 'N/A'
                    }
                  </div>
                </div>
                
                <div className="metric-item">
                  <div className="metric-label">Completion Rate</div>
                  <div className="metric-value">
                    {filteredData.length > 0 
                      ? `${((filteredData.filter(item => item.status === 'completed').length / filteredData.length) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                </div>
                
                <div className="metric-item">
                  <div className="metric-label">Urgent Requests</div>
                  <div className="metric-value">
                    {filteredData.filter(item => item.priority === 'urgent').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionMaintenanceReports;
