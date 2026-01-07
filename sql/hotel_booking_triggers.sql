-- Hotel Booking System Triggers
-- Database: if0_40831329_hotel_management
-- 
-- IMPORTANT: Triggers are commented out by default to avoid permission errors
-- If you have CREATE TRIGGER privileges, uncomment the triggers below
-- 
-- NOTE: Triggers are OPTIONAL - the application code handles all logic
-- The system will work perfectly fine without triggers
--
-- IMPORTANT: Run sql/hotel_management.sql first to create tables and structure
-- Then run this file (uncommented) to create all triggers if you have privileges

USE `if0_40831329_hotel_management`;

/*
-- ============================================================
-- TRIGGERS SECTION - Uncomment if you have CREATE TRIGGER privileges
-- ============================================================

-- Trigger 1: Calculate remaining amount on insert
DROP TRIGGER IF EXISTS `calculate_remaining_amount_on_insert`;
CREATE TRIGGER `calculate_remaining_amount_on_insert` BEFORE INSERT ON `bookings`
 FOR EACH ROW SET NEW.remaining_amount = NEW.total_amount - COALESCE(NEW.paid_amount, 0);

-- Trigger 2: Calculate remaining amount on update
DROP TRIGGER IF EXISTS `calculate_remaining_amount_on_update`;
CREATE TRIGGER `calculate_remaining_amount_on_update` BEFORE UPDATE ON `bookings`
 FOR EACH ROW SET NEW.remaining_amount = NEW.total_amount - COALESCE(NEW.paid_amount, 0);

-- Trigger 3: Check booking overlap on insert
DROP TRIGGER IF EXISTS `check_booking_overlap`;
CREATE TRIGGER `check_booking_overlap` BEFORE INSERT ON `bookings`
 FOR EACH ROW BEGIN
    DECLARE overlap_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO overlap_count
    FROM bookings
    WHERE room_number = NEW.room_number
    AND status IN ('pending', 'confirmed', 'checked_in')
    AND (
        (check_in_date < NEW.check_out_date AND check_out_date > NEW.check_in_date)
        OR (check_in_date = NEW.check_in_date)
        OR (check_out_date = NEW.check_out_date)
        OR (check_in_date <= NEW.check_in_date AND check_out_date >= NEW.check_out_date)
    );
    
    IF overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Room is not available for the selected dates due to existing bookings';
    END IF;
END;

-- Trigger 4: Check booking overlap on update
DROP TRIGGER IF EXISTS `check_booking_overlap_update`;
CREATE TRIGGER `check_booking_overlap_update` BEFORE UPDATE ON `bookings`
 FOR EACH ROW BEGIN
    DECLARE overlap_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO overlap_count
    FROM bookings
    WHERE room_number = NEW.room_number
    AND id != NEW.id
    AND status IN ('pending', 'confirmed', 'checked_in')
    AND (
        (check_in_date < NEW.check_out_date AND check_out_date > NEW.check_in_date)
        OR (check_in_date = NEW.check_in_date)
        OR (check_out_date = NEW.check_out_date)
        OR (check_in_date <= NEW.check_in_date AND check_out_date >= NEW.check_out_date)
    );
    
    IF overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Room is not available for the selected dates due to existing bookings';
    END IF;
END;

-- Trigger 5: Sync payments to bookings on insert
DROP TRIGGER IF EXISTS `sync_payments_to_bookings`;
CREATE TRIGGER `sync_payments_to_bookings` AFTER INSERT ON `payments`
 FOR EACH ROW BEGIN
    DECLARE total_paid DECIMAL(10,2);
    DECLARE total_amount DECIMAL(10,2);
    DECLARE new_remaining DECIMAL(10,2);
    DECLARE new_payment_status VARCHAR(50);
    
    SELECT total_amount INTO total_amount FROM bookings WHERE id = NEW.booking_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO total_paid 
    FROM payments 
    WHERE booking_id = NEW.booking_id;
    
    SET new_remaining = total_amount - total_paid;
    
    IF total_paid >= total_amount THEN
        SET new_payment_status = 'completed';
    ELSEIF total_paid > 0 THEN
        SET new_payment_status = 'partial';
    ELSE
        SET new_payment_status = 'pending';
    END IF;
    
    UPDATE bookings 
    SET paid_amount = total_paid,
        remaining_amount = new_remaining,
        payment_status = new_payment_status,
        updated_at = NOW()
    WHERE id = NEW.booking_id;
    
    INSERT INTO payment_sync_log (booking_id, payment_id, action, old_paid, new_paid, old_remaining, new_remaining, old_status, new_status, created_at)
    VALUES (NEW.booking_id, NEW.id, 'INSERT', 0, total_paid, total_amount, new_remaining, 'pending', new_payment_status, NOW());
END;

-- Trigger 6: Sync payments to bookings on update
DROP TRIGGER IF EXISTS `sync_payments_to_bookings_update`;
CREATE TRIGGER `sync_payments_to_bookings_update` AFTER UPDATE ON `payments`
 FOR EACH ROW BEGIN
    DECLARE total_paid DECIMAL(10,2);
    DECLARE total_amount DECIMAL(10,2);
    DECLARE new_remaining DECIMAL(10,2);
    DECLARE new_payment_status VARCHAR(50);
    
    SELECT total_amount INTO total_amount FROM bookings WHERE id = NEW.booking_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO total_paid 
    FROM payments 
    WHERE booking_id = NEW.booking_id;
    
    SET new_remaining = total_amount - total_paid;
    
    IF total_paid >= total_amount THEN
        SET new_payment_status = 'completed';
    ELSEIF total_paid > 0 THEN
        SET new_payment_status = 'partial';
    ELSE
        SET new_payment_status = 'pending';
    END IF;
    
    UPDATE bookings 
    SET paid_amount = total_paid,
        remaining_amount = new_remaining,
        payment_status = new_payment_status,
        updated_at = NOW()
    WHERE id = NEW.booking_id;
    
    INSERT INTO payment_sync_log (booking_id, payment_id, action, old_paid, new_paid, old_remaining, new_remaining, old_status, new_status, created_at)
    VALUES (NEW.booking_id, NEW.id, 'UPDATE', OLD.amount, total_paid, total_amount, new_remaining, 'partial', new_payment_status, NOW());
END;

-- Trigger 7: Sync walk-in payments to bookings on insert
DROP TRIGGER IF EXISTS `sync_walk_in_payments_to_bookings`;
CREATE TRIGGER `sync_walk_in_payments_to_bookings` AFTER INSERT ON `walk_in_payments`
 FOR EACH ROW BEGIN
    DECLARE total_paid DECIMAL(10,2);
    DECLARE total_amount DECIMAL(10,2);
    DECLARE new_remaining DECIMAL(10,2);
    DECLARE new_payment_status VARCHAR(50);
    DECLARE payments_total DECIMAL(10,2);
    DECLARE walk_in_total DECIMAL(10,2);
    
    SELECT total_amount INTO total_amount FROM bookings WHERE id = NEW.booking_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO payments_total 
    FROM payments 
    WHERE booking_id = NEW.booking_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO walk_in_total 
    FROM walk_in_payments 
    WHERE booking_id = NEW.booking_id;
    
    SET total_paid = payments_total + walk_in_total;
    
    SET new_remaining = total_amount - total_paid;
    
    IF total_paid >= total_amount THEN
        SET new_payment_status = 'completed';
    ELSEIF total_paid > 0 THEN
        SET new_payment_status = 'partial';
    ELSE
        SET new_payment_status = 'pending';
    END IF;
    
    UPDATE bookings 
    SET paid_amount = total_paid,
        remaining_amount = new_remaining,
        payment_status = new_payment_status,
        updated_at = NOW()
    WHERE id = NEW.booking_id;
    
    INSERT INTO payment_sync_log (booking_id, payment_id, action, old_paid, new_paid, old_remaining, new_remaining, old_status, new_status, created_at)
    VALUES (NEW.booking_id, NEW.id, 'INSERT_WALK_IN', 0, total_paid, total_amount, new_remaining, 'pending', new_payment_status, NOW());
END;

-- Trigger 8: Sync walk-in payments to bookings on update
DROP TRIGGER IF EXISTS `sync_walk_in_payments_to_bookings_update`;
CREATE TRIGGER `sync_walk_in_payments_to_bookings_update` AFTER UPDATE ON `walk_in_payments`
 FOR EACH ROW BEGIN
    DECLARE total_paid DECIMAL(10,2);
    DECLARE total_amount DECIMAL(10,2);
    DECLARE new_remaining DECIMAL(10,2);
    DECLARE new_payment_status VARCHAR(50);
    DECLARE payments_total DECIMAL(10,2);
    DECLARE walk_in_total DECIMAL(10,2);
    
    SELECT total_amount INTO total_amount FROM bookings WHERE id = NEW.booking_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO payments_total 
    FROM payments 
    WHERE booking_id = NEW.booking_id;
    
    SELECT COALESCE(SUM(amount), 0) INTO walk_in_total 
    FROM walk_in_payments 
    WHERE booking_id = NEW.booking_id;
    
    SET total_paid = payments_total + walk_in_total;
    
    SET new_remaining = total_amount - total_paid;
    
    IF total_paid >= total_amount THEN
        SET new_payment_status = 'completed';
    ELSEIF total_paid > 0 THEN
        SET new_payment_status = 'partial';
    ELSE
        SET new_payment_status = 'pending';
    END IF;
    
    UPDATE bookings 
    SET paid_amount = total_paid,
        remaining_amount = new_remaining,
        payment_status = new_payment_status,
        updated_at = NOW()
    WHERE id = NEW.booking_id;
    
    INSERT INTO payment_sync_log (booking_id, payment_id, action, old_paid, new_paid, old_remaining, new_remaining, old_status, new_status, created_at)
    VALUES (NEW.booking_id, NEW.id, 'UPDATE_WALK_IN', OLD.amount, total_paid, total_amount, new_remaining, 'partial', new_payment_status, NOW());
END;

-- Trigger 9: Update room status on booking delete
DROP TRIGGER IF EXISTS `update_room_status_on_booking_delete`;
CREATE TRIGGER `update_room_status_on_booking_delete` AFTER DELETE ON `bookings`
 FOR EACH ROW BEGIN
    DECLARE active_bookings INT DEFAULT 0;
    
    SELECT COUNT(*) INTO active_bookings 
    FROM bookings 
    WHERE room_number = OLD.room_number 
    AND status IN ('confirmed', 'checked_in');
    
    IF active_bookings = 0 THEN
        UPDATE rooms SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE room_number = OLD.room_number;
    END IF;
END;

-- Trigger 10: Update room status on booking insert
DROP TRIGGER IF EXISTS `update_room_status_on_booking_insert`;
CREATE TRIGGER `update_room_status_on_booking_insert` AFTER INSERT ON `bookings`
 FOR EACH ROW BEGIN
    DECLARE room_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO room_exists FROM rooms WHERE room_number = NEW.room_number;
    
    IF room_exists > 0 THEN
        IF NEW.status = 'confirmed' THEN
            UPDATE rooms SET status = 'booked', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
        ELSEIF NEW.status = 'checked_in' THEN
            UPDATE rooms SET status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
        END IF;
    END IF;
END;

-- Trigger 11: Update room status on booking update
DROP TRIGGER IF EXISTS `update_room_status_on_booking_update`;
CREATE TRIGGER `update_room_status_on_booking_update` AFTER UPDATE ON `bookings`
 FOR EACH ROW BEGIN
    DECLARE room_exists INT DEFAULT 0;
    DECLARE active_bookings INT DEFAULT 0;
    
    SELECT COUNT(*) INTO room_exists FROM rooms WHERE room_number = NEW.room_number;
    
    IF room_exists > 0 THEN
        SELECT COUNT(*) INTO active_bookings 
        FROM bookings 
        WHERE room_number = NEW.room_number 
        AND id != NEW.id 
        AND status IN ('confirmed', 'checked_in');
        
        IF NEW.status = 'cancelled' OR NEW.status = 'checked_out' THEN
            IF active_bookings = 0 THEN
                UPDATE rooms SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
            ELSE
                SET @other_status = (
                    SELECT status FROM bookings 
                    WHERE room_number = NEW.room_number 
                    AND id != NEW.id 
                    AND status IN ('confirmed', 'checked_in')
                    LIMIT 1
                );
                
                IF @other_status = 'checked_in' THEN
                    UPDATE rooms SET status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
                ELSE
                    UPDATE rooms SET status = 'booked', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
                END IF;
            END IF;
        ELSEIF NEW.status = 'checked_in' THEN
            UPDATE rooms SET status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
        ELSEIF NEW.status = 'confirmed' THEN
            UPDATE rooms SET status = 'booked', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
        END IF;
    END IF;
END;

-- Trigger 12: Update room status on check-in
DROP TRIGGER IF EXISTS `update_room_status_on_checkin`;
CREATE TRIGGER `update_room_status_on_checkin` AFTER UPDATE ON `bookings`
 FOR EACH ROW BEGIN
    IF OLD.status != 'checked_in' AND NEW.status = 'checked_in' THEN
        UPDATE rooms SET status = 'occupied', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
    END IF;
END;

-- Trigger 13: Update room status on check-out
DROP TRIGGER IF EXISTS `update_room_status_on_checkout`;
CREATE TRIGGER `update_room_status_on_checkout` AFTER UPDATE ON `bookings`
 FOR EACH ROW BEGIN
    DECLARE active_bookings INT DEFAULT 0;
    
    IF OLD.status = 'checked_in' AND NEW.status = 'checked_out' THEN
        SELECT COUNT(*) INTO active_bookings 
        FROM bookings 
        WHERE room_number = NEW.room_number 
        AND id != NEW.id 
        AND status IN ('confirmed', 'checked_in');
        
        IF active_bookings = 0 THEN
            UPDATE rooms SET status = 'cleaning', updated_at = CURRENT_TIMESTAMP WHERE room_number = NEW.room_number;
        END IF;
    END IF;
END;

-- ============================================================
-- END OF TRIGGERS SECTION
-- ============================================================
*/
