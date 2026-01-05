// API Configuration for Hostinger Deployment
const getBackendBaseUrl = () => {
  // Check if we're accessing from localhost or production
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development - use the correct backend path
    return 'http://localhost/hotel-management/backend';
  } else if (hostname === 'app.svroyalhotel.in') {
    // Hostinger production - use the subdomain
    return 'https://app.svroyalhotel.in/backend';
  } else {
    // Network access - use the current hostname
    return `http://${hostname}/hotel-management/backend`;
  }
};

export const API_BASE = getBackendBaseUrl();

// Alternative: Use unencoded URL if needed
export const API_BASE_UNENCODED = getBackendBaseUrl();

// Helper function to get the correct API base URL
export const getApiBase = () => {
  // Use the absolute URL
  return API_BASE;
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
    return `${getApiBase()}/${endpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
    // Admin endpoints
    ADMIN_DASHBOARD: 'admin/reports_analytics.php?action=dashboard',
    ADMIN_ACTIVITY_LOGS: 'admin/activity_logs.php?action=recent&limit=5',
    ADMIN_CUSTOM_REPORT: 'admin/reports_analytics.php?action=custom',
    ADMIN_GUEST_HISTORY: 'admin/guest_history_api.php',
    ADMIN_CURRENT_GUESTS: 'admin/current_guests_api.php',
    
    // Reception endpoints
    ROOMS_GET_ALL: 'rooms/getAll.php',
    RECEPTION_UPDATE_ROOM_STATUS: 'reception/update_room_status.php',
    RECEPTION_CHECK_IN: 'reception/check_in.php',
    RECEPTION_CHECK_OUT: 'reception/check_out.php',
    RECEPTION_SEARCH_GUEST: 'reception/search_guest.php',
    RECEPTION_DASHBOARD_STATS: 'reception/dashboard_stats.php',
    RECEPTION_GUEST_HISTORY: 'reception/guest_history_api.php',
    
    // Maintenance endpoints
    MAINTENANCE_CREATE: 'maintenance/create_maintenance.php',
    MAINTENANCE_GET_ALL: 'maintenance/get_maintenance.php',
    MAINTENANCE_UPDATE: 'maintenance/update_maintenance.php',
    MAINTENANCE_DELETE: 'maintenance/delete_maintenance.php',
    MAINTENANCE_ASSIGN: 'maintenance/assign_maintenance.php',
    
    // Reception Maintenance endpoints
    RECEPTION_MAINTENANCE_LIST: 'reception/reception_maintenance_api.php?action=list',
    RECEPTION_MAINTENANCE_DETAILS: 'reception/reception_maintenance_api.php?action=details',
    RECEPTION_MAINTENANCE_STATISTICS: 'reception/reception_maintenance_api.php?action=statistics',
    RECEPTION_MAINTENANCE_REPORTS: 'reception/reception_maintenance_api.php?action=reports',
    RECEPTION_MAINTENANCE_STATUS_SUMMARY: 'reception/reception_maintenance_api.php?action=status_summary',
    RECEPTION_MAINTENANCE_CREATE: 'reception/reception_maintenance_api.php?action=create',
    RECEPTION_MAINTENANCE_UPDATE: 'reception/reception_maintenance_api.php?action=update',
    RECEPTION_MAINTENANCE_UPDATE_STATUS: 'reception/reception_maintenance_api.php?action=update_status',
    RECEPTION_MAINTENANCE_ASSIGN: 'reception/reception_maintenance_api.php?action=assign',
    RECEPTION_MAINTENANCE_DELETE: 'reception/reception_maintenance_api.php?action=delete',
    RECEPTION_MAINTENANCE_BULK_UPDATE: 'reception/reception_maintenance_api.php?action=bulk_update',
    RECEPTION_MAINTENANCE_BULK_DELETE: 'reception/reception_maintenance_api.php?action=bulk_delete',
    
    // Housekeeping endpoints
    HOUSEKEEPING_CREATE_TASK: 'housekeeping/create_task.php',
    HOUSEKEEPING_GET_TASKS: 'housekeeping/get_tasks.php',
    HOUSEKEEPING_UPDATE_TASK: 'housekeeping/update_task.php',
    HOUSEKEEPING_ROOM_INSPECTION: 'housekeeping/room_inspection.php',
    
    // API endpoints (already using absolute URLs)
    BILLING_PAYMENT_HISTORY: 'api/billing/payment_history',
    BILLING_BILLING_STATS: 'reception/billing_api_endpoint.php?action=billing_stats',
    BILLING_INVOICES: 'api/billing/invoices',
    BILLING_PAYMENT_METHODS: 'api/billing/payment_methods',
    BILLING_PROCESS_PAYMENT: 'api/billing/process_payment',
    BILLING_GENERATE_INVOICE: 'api/billing/generate_invoice',
    BILLING_INVOICE_DETAILS: 'api/billing/invoice_details',
    BOOKINGS_CHECKED_IN: 'api/bookings?status=checked_in',
    
    // Comprehensive Billing API endpoints
    COMPREHENSIVE_BILLING: 'api/comprehensive_billing_api.php',
    COMPREHENSIVE_BILLING_CANCEL_BOOKING: 'api/comprehensive_billing_api.php?action=cancel_booking'
};
