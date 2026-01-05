# 🏨 Hotel Check-In/Check-Out System

## 📋 Overview

This system provides comprehensive guest management with automatic room status updates based on booking statuses. The system ensures that room availability is always synchronized with guest check-in/check-out states.

## 🚀 Features

### ✅ **Automatic Room Status Management**
- **Confirmed Booking** → Room Status: `Booked` (Orange)
- **Checked In** → Room Status: `Occupied` (Blue)  
- **Checked Out** → Room Status: `Available` (Green)

### ✅ **Smart Button Rendering**
- **View Details**: Always visible and enabled
- **Check In**: Only shows for `confirmed` bookings
- **Check Out**: Only shows for `checked_in` guests

### ✅ **Real-time Status Updates**
- Immediate UI updates for better user experience
- Automatic refresh of search results
- Live statistics updates

## 🏗️ System Architecture

### **Backend APIs**
1. **`guest_search_api.php`** - Main guest management API
2. **`room_status_api.php`** - Room status management API

### **Frontend Components**
1. **`GuestSearch.js`** - Main guest search and management interface
2. **`RoomStatusManager.js`** - Room status oversight and management

## 📁 File Structure

```
backend/reception/
├── guest_search_api.php          # Main guest API
├── room_status_api.php           # Room status API
├── test_complete_system.php      # System test script
├── test_frontend_integration.html # Frontend test page
└── README_CHECKIN_SYSTEM.md      # This documentation

frontend/src/components/reception/
├── GuestSearch.js                # Main guest interface
├── RoomStatusManager.js          # Room management interface
└── GuestHistory.css              # Shared styling
```

## 🔧 API Endpoints

### **Guest Search API** (`guest_search_api.php`)

#### **GET Requests**
- `?action=stats` - Get guest statistics
- `?action=search&type=all&status=all` - Search all guests
- `?action=search&type=name&term=john&status=confirmed` - Search by name

#### **POST Requests**
- `?action=checkin` - Check-in a guest
  ```json
  {
    "booking_id": 25,
    "room_number": "102"
  }
  ```
- `?action=checkout` - Check-out a guest
  ```json
  {
    "booking_id": 25,
    "room_number": "102"
  }
  ```

### **Room Status API** (`room_status_api.php`)

#### **GET Requests**
- `?action=room_statuses` - Get all room statuses
- `?action=available_rooms` - Get available rooms for new bookings

#### **POST Requests**
- `?action=update_room_status` - Manually update room status
  ```json
  {
    "room_number": "101",
    "status": "cleaning",
    "reason": "Room needs cleaning"
  }
  ```
- `?action=sync_room_statuses` - Sync room statuses with bookings

## 🎯 How to Use

### **1. Guest Check-In Process**

1. **Search for Guest**: Use the search interface to find a confirmed booking
2. **Verify Status**: Ensure the guest has a `confirmed` booking status
3. **Click Check In**: The system will:
   - Update booking status to `checked_in`
   - Update room status to `occupied`
   - Log the activity
   - Show success message

### **2. Guest Check-Out Process**

1. **Find Checked-In Guest**: Search for guests with `checked_in` status
2. **Click Check Out**: The system will:
   - Update booking status to `checked_out`
   - Update room status to `available`
   - Log the activity
   - Show success message

### **3. Room Status Management**

1. **Monitor Statuses**: Use `RoomStatusManager` to view all room statuses
2. **Sync Statuses**: Click "Sync Room Statuses" to ensure consistency
3. **Manual Updates**: Set rooms to cleaning/maintenance as needed

## 🔄 Status Flow

```
┌─────────────┐    Check-In    ┌─────────────┐    Check-Out    ┌─────────────┐
│ Confirmed   │ ──────────────► │ Checked In  │ ──────────────► │ Checked Out │
│ (Booked)    │                 │ (Occupied)  │                 │ (Available) │
└─────────────┘                 └─────────────┘                 └─────────────┘
```

## 🧪 Testing the System

### **Backend Testing**
```bash
# Test complete system
php test_complete_system.php

# Test individual components
php test_checkin.php
php test_checkout.php
php debug_checkin.php
```

### **Frontend Testing**
1. Open `test_frontend_integration.html` in browser
2. Test each API endpoint
3. Verify check-in/check-out functionality

## 🚨 Error Handling

### **Common Issues & Solutions**

1. **"Guest is already checked in"**
   - Solution: Guest is already checked in, cannot check in again

2. **"Room is not available for check-in"**
   - Solution: Room status must be `booked` or `available`

3. **"Guest must be checked in before checkout"**
   - Solution: Only checked-in guests can be checked out

4. **"Room is not occupied"**
   - Solution: Room must be `occupied` for check-out

### **Validation Rules**

- **Check-In**: Only `confirmed` bookings can be checked in
- **Check-Out**: Only `checked_in` guests can be checked out
- **Room Status**: Automatically managed based on booking status
- **Transactions**: All operations use database transactions for data integrity

## 📊 Activity Logging

All check-in/check-out operations are logged in the `activity_logs` table with:
- User ID (default: 1)
- Action type (`check_in` or `check_out`)
- Table name (`bookings`)
- Record ID (booking ID)
- Details (description of the action)
- IP address

## 🔒 Security Features

- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Protection**: Uses prepared statements
- **Transaction Management**: Ensures data consistency
- **Error Logging**: Comprehensive error tracking

## 🚀 Performance Optimizations

- **Efficient Queries**: Optimized SQL with proper JOINs
- **Indexed Fields**: Key fields are indexed for fast searches
- **Lazy Loading**: Data loaded only when needed
- **Real-time Updates**: Immediate UI feedback

## 📱 Frontend Features

### **GuestSearch Component**
- **Search Types**: Name, Email, Phone, Room, Booking Reference, All
- **Status Filters**: All, Confirmed, Checked In, Checked Out, Cancelled, Pending
- **Real-time Updates**: Immediate status changes
- **Responsive Design**: Works on all device sizes

### **RoomStatusManager Component**
- **Status Overview**: View all room statuses at a glance
- **Manual Updates**: Set rooms to cleaning/maintenance
- **Sync Function**: Ensure consistency between bookings and rooms
- **Guest Information**: See current guest in each room

## 🔧 Configuration

### **Database Requirements**
- `bookings` table with status field
- `rooms` table with status field
- `guests` table for guest information
- `activity_logs` table for operation tracking

### **Environment Setup**
- PHP 7.4+ with PDO extension
- MySQL/MariaDB database
- CORS headers configured
- Proper file permissions

## 📈 Monitoring & Maintenance

### **Regular Tasks**
1. **Sync Room Statuses**: Daily to ensure consistency
2. **Check Activity Logs**: Monitor for unusual patterns
3. **Verify Data Integrity**: Ensure booking-room relationships are correct

### **Performance Monitoring**
- Monitor API response times
- Check database query performance
- Review error logs for issues

## 🆘 Troubleshooting

### **System Not Working?**
1. **Check Database Connection**: Verify database credentials
2. **Verify Tables**: Ensure all required tables exist
3. **Check Permissions**: Verify file and database permissions
4. **Review Logs**: Check error logs for specific issues

### **Frontend Issues?**
1. **Check Console**: Look for JavaScript errors
2. **Verify API Endpoints**: Test backend APIs directly
3. **Check Network**: Ensure API calls are reaching the backend
4. **CORS Issues**: Verify CORS headers are properly configured

## 🎉 Success Indicators

✅ **System Working When:**
- Check-in button appears for confirmed bookings
- Check-out button appears for checked-in guests
- Room statuses update automatically
- Success messages appear after operations
- Activity logs show all operations
- Statistics update in real-time

## 📞 Support

For issues or questions:
1. Check this documentation first
2. Review error logs
3. Test individual components
4. Verify database state

---

**🎯 The system is now fully functional and ready for production use!**
