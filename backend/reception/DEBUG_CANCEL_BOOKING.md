# 🔧 Cancel Booking Debugging Guide

## 🚨 **Problem**: Cancel booking button not working
When clicking "Yes, Cancel Booking" in the confirmation modal, the booking is not being cancelled.

## 🔍 **Step-by-Step Debugging**

### **Step 1: Check Browser Console**
1. Open browser developer tools (F12)
2. Go to Console tab
3. Click the cancel button and look for:
   - `Starting cancellation process...`
   - `Calling API: ...`
   - `Request body: ...`
   - `Response status: ...`
   - `Cancellation API response: ...`

### **Step 2: Check Network Tab**
1. In developer tools, go to Network tab
2. Click the cancel button
3. Look for the API call to `comprehensive_billing_api.php`
4. Check:
   - Request URL
   - Request method (should be POST)
   - Request payload
   - Response status code
   - Response body

### **Step 3: Test Database Connection**
Run this script to verify database connectivity:
```bash
php backend/reception/test_cancel_booking.php
```

**Expected Output:**
- ✅ Found X confirmed bookings
- ✅ Table 'bookings' exists with X records
- ✅ Table 'rooms' exists with X records
- ✅ Successfully updated booking status to cancelled
- ✅ Successfully updated room status to available

### **Step 4: Test API Endpoint**
Run this script to test the API directly:
```bash
php backend/reception/test_cancel_booking_api.php
```

**Expected Output:**
- ✅ API call successful!
- ✅ Response shows success: true

### **Step 5: Check Server Error Logs**
Look for error logs in:
- XAMPP error logs: `C:\xampp\apache\logs\error.log`
- PHP error logs: Check your PHP configuration
- Look for "CancelBooking:" log entries

### **Step 6: Verify Database Tables**
Run this SQL query to check if required tables exist:
```sql
SHOW TABLES LIKE '%booking%';
SHOW TABLES LIKE '%payment%';
SHOW TABLES LIKE '%room%';
SHOW TABLES LIKE '%guest%';
```

### **Step 7: Check Booking Status**
Verify the booking you're trying to cancel:
```sql
SELECT b.id, b.status, b.booking_reference, 
       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
       r.room_number
FROM bookings b
JOIN guests g ON b.guest_id = g.id
JOIN rooms r ON b.room_id = r.id
WHERE b.id = [YOUR_BOOKING_ID];
```

**Only bookings with status = 'confirmed' can be cancelled!**

## 🐛 **Common Issues & Solutions**

### **Issue 1: "Booking not found"**
- **Cause**: Invalid booking ID or database connection issue
- **Solution**: Check database connection and verify booking exists

### **Issue 2: "Only confirmed bookings can be cancelled"**
- **Cause**: Booking status is not 'confirmed'
- **Solution**: Check current booking status in database

### **Issue 3: "Refund amount exceeds paid amount"**
- **Cause**: Refund amount is higher than what was paid
- **Solution**: Check payments table for actual paid amount

### **Issue 4: API endpoint not accessible**
- **Cause**: Wrong URL or server configuration issue
- **Solution**: Verify API endpoint URL and server setup

### **Issue 5: Database transaction fails**
- **Cause**: Missing tables or permission issues
- **Solution**: Check database schema and user permissions

## 🔧 **Quick Fixes to Try**

### **Fix 1: Clear Browser Cache**
1. Hard refresh: Ctrl+F5
2. Clear browser cache and cookies
3. Try in incognito/private mode

### **Fix 2: Check API URL**
Verify the API endpoint is correct:
```
http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=cancel_booking
```

### **Fix 3: Verify Database**
Ensure these tables exist and have data:
- `bookings`
- `rooms`
- `guests`
- `payments`

### **Fix 4: Check File Permissions**
Ensure PHP files are readable by the web server.

## 📋 **Debugging Checklist**

- [ ] Browser console shows cancellation process logs
- [ ] Network tab shows API call being made
- [ ] API endpoint is accessible (test with curl/Postman)
- [ ] Database connection works
- [ ] Required tables exist
- [ ] Booking status is 'confirmed'
- [ ] Server error logs show no errors
- [ ] PHP has permission to write to database

## 🆘 **If Still Not Working**

1. **Run both test scripts** and share the output
2. **Check browser console** for any error messages
3. **Check network tab** for failed API calls
4. **Check server error logs** for PHP/database errors
5. **Verify database schema** matches expected structure

## 📞 **Support Information**

- **Test Scripts**: `test_cancel_booking.php` and `test_cancel_booking_api.php`
- **API Endpoint**: `comprehensive_billing_api.php?action=cancel_booking`
- **Database**: `hotel_management`
- **Required Status**: `confirmed`

---

**Last Updated**: January 2025  
**Version**: 1.0
