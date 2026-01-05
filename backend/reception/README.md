# Reception Module - Check In/Out System

## Overview
The Reception Module provides comprehensive functionality for managing guest check-ins, check-outs, room status management, and guest search operations in the Hotel Management System.

## Features

### 1. Guest Check-In
- Verify guest identity using booking ID
- Assign room keys with tracking numbers
- Record check-in time and notes
- Update room status to occupied
- Log all activities for audit trail

### 2. Guest Check-Out
- Process check-out with payment collection
- Collect guest feedback and ratings
- Update room status to cleaning
- Record payment transactions
- Generate activity logs

### 3. Guest Search
- Search by multiple criteria (name, phone, ID proof, booking reference, room number)
- Filter results by booking status
- Display comprehensive guest information
- Show payment history and extra services

### 4. Room Status Management
- Visual room status display
- Logical status workflow enforcement
- Maintenance request creation
- Real-time status updates

### 5. Pending Operations Dashboard
- Today's scheduled check-ins
- Today's scheduled check-outs
- Overdue check-outs tracking
- Upcoming check-ins preview

## API Endpoints

### Check-In
```
POST /backend/reception/check_in.php
```
**Required Fields:**
- `booking_id`: The booking ID to check in
- `check_in_time`: Check-in time (HH:MM format)
- `room_key_number`: Room key number assigned
- `notes`: Optional notes about the check-in

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Guest checked in successfully",
  "data": {
    "booking_id": "123",
    "guest_name": "John Doe",
    "room_number": "101",
    "room_type": "Single",
    "check_in_time": "14:30",
    "room_key_number": "K101",
    "check_out_date": "2024-01-15",
    "total_amount": "150.00"
  }
}
```

### Check-Out
```
POST /backend/reception/check_out.php
```
**Required Fields:**
- `booking_id`: The booking ID to check out
- `check_out_time`: Check-out time (HH:MM format)
- `payment_method`: Payment method (cash, card, upi, bank_transfer)
- `final_amount`: Final amount to be paid
- `feedback_rating`: Guest rating (1-5)

**Optional Fields:**
- `feedback_comment`: Guest feedback comment
- `notes`: Additional notes

### Guest Search
```
GET /backend/reception/search_guest.php?type=name&term=John&status=all
```
**Query Parameters:**
- `type`: Search type (name, phone, id_proof, booking_ref, room_number)
- `term`: Search term
- `status`: Status filter (all, confirmed, checked_in, checked_out, cancelled)

### Pending Operations
```
GET /backend/reception/get_pending_operations.php
```
Returns summary of pending check-ins, check-outs, and upcoming operations.

### Room Status Update
```
POST /backend/reception/update_room_status.php
```
**Required Fields:**
- `room_id`: Room ID to update
- `new_status`: New status (available, cleaning, maintenance)
- `reason`: Reason for status change

## Database Requirements

### Required Tables
- `users` - Staff authentication and roles
- `guests` - Guest information
- `rooms` - Room inventory and status
- `room_types` - Room categories
- `bookings` - Booking records
- `payments` - Payment transactions
- `extra_services` - Additional services
- `booking_services` - Service bookings
- `maintenance` - Maintenance records
- `activity_logs` - System activity tracking

### Key Status Values
- **Booking Status**: `confirmed`, `checked_in`, `checked_out`, `cancelled`
- **Room Status**: `available`, `occupied`, `cleaning`, `maintenance`
- **Payment Status**: `pending`, `completed`, `failed`

## Setup Instructions

### 1. Database Setup
Ensure the database schema is properly set up with all required tables:
```sql
-- Run the hotel_management.sql script
mysql -u username -p database_name < hotel_management.sql
```

### 2. User Creation
Create a reception user account:
```sql
INSERT INTO users (username, password, role, full_name, email) 
VALUES ('reception', '$2y$10$...', 'reception', 'Reception Staff', 'reception@hotel.com');
```

### 3. File Permissions
Ensure the PHP files have proper read permissions:
```bash
chmod 644 *.php
```

### 4. Testing
Run the test script to verify everything is working:
```bash
php test_apis.php
```

## Usage Examples

### Check-In a Guest
```javascript
const checkInData = {
  booking_id: "123",
  check_in_time: "14:30",
  room_key_number: "K101",
  notes: "Guest arrived early, room ready"
};

const response = await fetch('/backend/reception/check_in.php', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(checkInData)
});
```

### Search for a Guest
```javascript
const searchUrl = '/backend/reception/search_guest.php?type=name&term=John&status=all';
const response = await fetch(searchUrl, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Update Room Status
```javascript
const statusData = {
  room_id: "5",
  new_status: "cleaning",
  reason: "Regular housekeeping after check-out"
};

const response = await fetch('/backend/reception/update_room_status.php', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(statusData)
});
```

## Security Features

### Authentication
- JWT token-based authentication
- Role-based access control (reception role required)
- Secure session management

### Data Validation
- Input sanitization and validation
- Business rule enforcement
- SQL injection prevention
- XSS protection

### Audit Trail
- Complete activity logging
- User action tracking
- IP address recording
- Timestamp logging

## Error Handling

### Common Error Responses
```json
{
  "status": 422,
  "success": false,
  "message": "Validation failed",
  "errors": ["booking_id is required", "check_in_time is required"]
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check JWT token validity
   - Verify user has reception role
   - Ensure token is included in Authorization header

2. **Database Connection Error**
   - Verify database credentials
   - Check database server status
   - Ensure required tables exist

3. **Validation Errors**
   - Check required field values
   - Verify data format (dates, times)
   - Ensure business rule compliance

4. **Permission Denied**
   - Verify file permissions
   - Check web server configuration
   - Ensure proper file ownership

### Debug Mode
Enable error logging in PHP:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## Support

For technical support or questions about the Reception Module:
- Check the activity logs for error details
- Verify database connectivity and permissions
- Test with the provided test script
- Review the comprehensive documentation

## Version History

- **v1.0.0** - Initial release with basic check-in/out functionality
- **v1.1.0** - Added guest search and room status management
- **v1.2.0** - Enhanced security and error handling
- **v1.3.0** - Added pending operations dashboard
