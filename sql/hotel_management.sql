-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 29, 2025 at 07:37 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Use the database
USE `if0_40831329_hotel_management`;

--
-- Database: `if0_40831329_hotel_management`
--



-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(50) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_rate_limits`
--

CREATE TABLE `api_rate_limits` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `request_count` int(11) DEFAULT 1,
  `first_request_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_request_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_blocked` tinyint(1) DEFAULT 0,
  `blocked_until` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `guest_id` int(11) DEFAULT NULL,
  `booking_reference` varchar(20) NOT NULL,
  `room_id` int(11) NOT NULL,
  `room_number` varchar(20) NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `status` enum('pending','confirmed','checked_in','checked_out','cancelled') DEFAULT 'pending',
  `plan_type` enum('EP','CP') DEFAULT 'EP',
  `payment_type` enum('cash','upi','debit_card','credit_card','net_banking') NOT NULL DEFAULT 'cash',
  `tariff` decimal(10,2) DEFAULT 0.00,
  `number_of_days` int(11) DEFAULT 1,
  `adults` int(11) DEFAULT 1,
  `children` int(11) DEFAULT 0,
  `booking_source` varchar(50) DEFAULT 'walk_in',
  `owner_reference` tinyint(1) DEFAULT 0,
  `billing_address` text DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `gst_number` varchar(20) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(11) DEFAULT 1,
  `payment_status` enum('pending','partial','paid','refunded','unpaid','partially_paid','fully_paid','referred by owner') DEFAULT 'pending',
  `referenced_by_owner` tinyint(1) DEFAULT 0,
  `owner_reference_notes` text DEFAULT NULL,
  `owner_referenced` tinyint(1) DEFAULT 0,
  `razorpay_order_id` varchar(255) DEFAULT NULL,
  `razorpay_signature` varchar(255) DEFAULT NULL,
  `razorpay_payment_id` varchar(255) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) DEFAULT 0.00,
  `remaining_amount` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `check_in_time` time DEFAULT '14:00:00',
  `check_in_ampm` enum('AM','PM') DEFAULT 'AM',
  `check_out_time` time DEFAULT '11:00:00',
  `check_out_ampm` enum('AM','PM') DEFAULT 'AM',
  `guest_count` int(11) DEFAULT 1,
  `special_requests` text DEFAULT NULL,
  `is_prebooked` tinyint(1) DEFAULT 0,
  `prebook_date` date DEFAULT NULL,
  `prebook_notes` text DEFAULT NULL,
  `advance_amount` decimal(10,2) DEFAULT 0.00,
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;












-- --------------------------------------------------------

--
-- Stand-in structure for view `booking_payment_summary`
-- (See below for the actual view)
--
CREATE TABLE `booking_payment_summary` (
`id` int(11)
,`booking_reference` varchar(20)
,`guest_id` int(11)
,`room_id` int(11)
,`total_amount` decimal(10,2)
,`paid_amount` decimal(10,2)
,`remaining_amount` decimal(10,2)
,`payment_status` enum('pending','partial','paid','refunded','unpaid','partially_paid','fully_paid','referred by owner')
,`owner_referenced` tinyint(1)
,`payment_type` enum('cash','upi','debit_card','credit_card','net_banking')
,`booking_status` enum('pending','confirmed','checked_in','checked_out','cancelled')
,`first_name` varchar(50)
,`last_name` varchar(50)
,`phone` varchar(20)
,`room_number` varchar(20)
,`room_type_name` varchar(50)
,`payment_summary` varchar(23)
);

-- --------------------------------------------------------

--
-- Table structure for table `booking_services`
--

CREATE TABLE `booking_services` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `total_price` decimal(10,2) NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `booking_summary`
-- (See below for the actual view)
--
CREATE TABLE `booking_summary` (
`id` int(11)
,`booking_reference` varchar(20)
,`guest_name` varchar(101)
,`phone` varchar(20)
,`email` varchar(100)
,`room_number` varchar(20)
,`room_type` varchar(50)
,`check_in_date` date
,`check_out_date` date
,`number_of_days` int(11)
,`tariff` decimal(10,2)
,`total_amount` decimal(10,2)
,`status` enum('pending','confirmed','checked_in','checked_out','cancelled')
,`booking_source` varchar(50)
,`plan_type` enum('EP','CP')
,`created_at` timestamp
,`company_name` varchar(255)
,`gst_number` varchar(50)
);

-- --------------------------------------------------------

--
-- Table structure for table `corporate_bookings`
--

CREATE TABLE `corporate_bookings` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `billing_address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `email_config`
--

CREATE TABLE `email_config` (
  `id` int(11) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` text NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `email_config`
--

INSERT INTO `email_config` (`id`, `config_key`, `config_value`, `updated_at`) VALUES
(1, 'host', 'smtp.gmail.com', '2025-08-13 23:01:34'),
(2, 'username', 'chvamsikrishna577@gmail.com', '2025-08-14 08:34:24'),
(3, 'password', 'eryt ojyx lqum vesa', '2025-08-14 08:34:24'),
(4, 'port', '587', '2025-08-13 23:01:34');

-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int(11) NOT NULL,
  `reference_id` int(11) NOT NULL,
  `email_type` enum('invoice','booking_confirmation','payment_receipt','general') NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `status` enum('success','failed') NOT NULL,
  `error_message` text DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `export_history`
--

CREATE TABLE `export_history` (
  `id` int(11) NOT NULL,
  `export_type` varchar(100) NOT NULL,
  `export_date` datetime NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` varchar(50) DEFAULT NULL,
  `status` enum('pending','completed','failed') DEFAULT 'pending',
  `parameters` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `extra_services`
--

CREATE TABLE `extra_services` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `service_name` varchar(255) DEFAULT NULL,
  `service_price` decimal(10,2) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1,
  `total_price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `extra_services`
--

INSERT INTO `extra_services` (`id`, `booking_id`, `service_name`, `service_price`, `quantity`, `total_price`, `created_at`, `name`, `description`, `price`, `is_active`) VALUES
(1, NULL, NULL, NULL, 1, NULL, '2025-08-28 05:12:44', 'Room Service', 'Food delivery to your room', 25.00, 1),
(2, NULL, NULL, NULL, 1, NULL, '2025-08-28 05:12:44', 'Laundry Service', 'Professional laundry and dry cleaning', 15.00, 1),
(3, NULL, NULL, NULL, 1, NULL, '2025-08-28 05:12:44', 'Airport Transfer', 'Pickup and drop to airport', 50.00, 1),
(4, NULL, NULL, NULL, 1, NULL, '2025-08-28 05:12:44', 'Spa Service', 'Relaxing spa treatments', 80.00, 1),
(5, NULL, NULL, NULL, 1, NULL, '2025-08-28 05:12:44', 'WiFi Premium', 'High-speed internet access', 10.00, 1),
(6, NULL, NULL, NULL, 1, NULL, '2025-08-28 05:12:44', 'Parking', 'Secure parking space', 20.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `guests`
--

CREATE TABLE `guests` (
  `id` int(11) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `id_proof_type` enum('passport','driving_license','national_id','other') NOT NULL,
  `id_proof_number` varchar(100) NOT NULL,
  `id_proof_image` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `customer_photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `check_in_time` time DEFAULT '14:00:00',
  `check_out_time` time DEFAULT '11:00:00',
  `nationality` varchar(50) DEFAULT NULL,
  `passport_number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `guest_booking_view`
-- (See below for the actual view)
--
CREATE TABLE `guest_booking_view` (
`booking_id` int(11)
,`booking_reference` varchar(20)
,`room_number` varchar(20)
,`check_in_date` date
,`check_out_date` date
,`booking_status` enum('pending','confirmed','checked_in','checked_out','cancelled')
,`total_amount` decimal(10,2)
,`paid_amount` decimal(10,2)
,`remaining_amount` decimal(10,2)
,`payment_status` enum('pending','partial','paid','refunded','unpaid','partially_paid','fully_paid','referred by owner')
,`guest_id` int(11)
,`first_name` varchar(50)
,`last_name` varchar(50)
,`full_name` varchar(101)
,`email` varchar(100)
,`phone` varchar(20)
,`address` text
,`id_proof_type` enum('passport','driving_license','national_id','other')
,`id_proof_number` varchar(100)
,`guest_company` varchar(255)
,`guest_gst` varchar(50)
,`booking_company` varchar(255)
,`booking_gst` varchar(50)
,`contact_person` varchar(100)
,`contact_phone` varchar(20)
,`contact_email` varchar(100)
,`billing_address` text
,`booking_created_at` timestamp
,`guest_created_at` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `guest_corporate_view`
-- (See below for the actual view)
--
CREATE TABLE `guest_corporate_view` (
`guest_id` int(11)
,`first_name` varchar(50)
,`last_name` varchar(50)
,`email` varchar(100)
,`phone` varchar(20)
,`address` text
,`id_proof_type` enum('passport','driving_license','national_id','other')
,`id_proof_number` varchar(100)
,`guest_company` varchar(255)
,`guest_gst` varchar(50)
,`booking_company` varchar(255)
,`booking_gst` varchar(50)
,`contact_person` varchar(100)
,`contact_phone` varchar(20)
,`contact_email` varchar(100)
,`billing_address` text
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `guest_documents`
--

CREATE TABLE `guest_documents` (
  `id` int(11) NOT NULL,
  `guest_id` int(11) NOT NULL,
  `document_type` enum('customer_photo','id_proof_photo','other') NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `housekeeping`
--

CREATE TABLE `housekeeping` (
  `id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `task_type` enum('daily_cleaning','deep_cleaning','linen_change','inspection','other') DEFAULT 'daily_cleaning',
  `status` enum('pending','in_progress','completed','verified') DEFAULT 'pending',
  `assigned_to` int(11) DEFAULT NULL,
  `scheduled_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `actual_start_time` timestamp NULL DEFAULT NULL,
  `actual_end_time` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `housekeeping_checklist_items`
--

CREATE TABLE `housekeeping_checklist_items` (
  `id` int(11) NOT NULL,
  `task_type` enum('daily_cleaning','deep_cleaning','turnover_cleaning','inspection') NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `housekeeping_checklist_items`
--

INSERT INTO `housekeeping_checklist_items` (`id`, `task_type`, `item_name`, `description`, `is_required`, `display_order`, `created_at`) VALUES
(1, 'daily_cleaning', 'Make beds', 'Change linens and make beds', 1, 1, '2025-08-13 06:33:20'),
(2, 'daily_cleaning', 'Vacuum floors', 'Vacuum all floor surfaces', 1, 2, '2025-08-13 06:33:20'),
(3, 'daily_cleaning', 'Clean bathroom', 'Clean toilet, sink, and shower', 1, 3, '2025-08-13 06:33:20'),
(4, 'daily_cleaning', 'Empty trash', 'Empty all trash bins', 1, 4, '2025-08-13 06:33:20'),
(5, 'daily_cleaning', 'Restock amenities', 'Restock toiletries and supplies', 1, 5, '2025-08-13 06:33:20'),
(6, 'deep_cleaning', 'Deep clean bathroom', 'Thorough cleaning of all bathroom surfaces', 1, 1, '2025-08-13 06:33:20'),
(7, 'deep_cleaning', 'Clean windows', 'Clean all windows and mirrors', 1, 2, '2025-08-13 06:33:20'),
(8, 'deep_cleaning', 'Clean furniture', 'Clean and polish all furniture', 1, 3, '2025-08-13 06:33:20'),
(9, 'deep_cleaning', 'Clean appliances', 'Clean mini-fridge, coffee maker, etc.', 1, 4, '2025-08-13 06:33:20'),
(10, 'deep_cleaning', 'Clean carpets', 'Deep clean or shampoo carpets', 1, 5, '2025-08-13 06:33:20'),
(11, 'turnover_cleaning', 'Strip beds', 'Remove all bedding for laundry', 1, 1, '2025-08-13 06:33:20'),
(12, 'turnover_cleaning', 'Clean all surfaces', 'Disinfect all high-touch surfaces', 1, 2, '2025-08-13 06:33:20'),
(13, 'turnover_cleaning', 'Check amenities', 'Ensure all amenities are properly stocked', 1, 3, '2025-08-13 06:33:20'),
(14, 'turnover_cleaning', 'Final inspection', 'Conduct final quality check', 1, 4, '2025-08-13 06:33:20'),
(15, 'inspection', 'Overall cleanliness', 'General cleanliness assessment', 1, 1, '2025-08-13 06:33:20'),
(16, 'inspection', 'Bathroom condition', 'Bathroom cleanliness and functionality', 1, 2, '2025-08-13 06:33:20'),
(17, 'inspection', 'Bedding quality', 'Bed linens and mattress condition', 1, 3, '2025-08-13 06:33:20'),
(18, 'inspection', 'Amenities check', 'Verify all amenities are present', 1, 4, '2025-08-13 06:33:20'),
(19, 'inspection', 'Safety check', 'Check for safety hazards', 1, 5, '2025-08-13 06:33:20');

-- --------------------------------------------------------

--
-- Table structure for table `housekeeping_tasks`
--

CREATE TABLE `housekeeping_tasks` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `task_type` enum('daily_cleaning','deep_cleaning','turnover_cleaning','inspection') NOT NULL,
  `scheduled_date` datetime NOT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `assigned_to` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `estimated_duration` int(11) DEFAULT 60,
  `start_time` datetime DEFAULT NULL,
  `completion_time` datetime DEFAULT NULL,
  `completion_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(20) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `guest_id` int(11) NOT NULL,
  `room_number` varchar(20) DEFAULT NULL,
  `room_id` int(11) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) DEFAULT 0.00,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL,
  `invoice_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `due_date` date DEFAULT NULL,
  `status` enum('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
  `notes` text DEFAULT NULL,
  `created_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `item_type` enum('room_charge','service','tax','discount') NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance`
--

CREATE TABLE `maintenance` (
  `id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `room_number` varchar(20) NOT NULL,
  `issue_type` enum('cleaning','repair','inspection') NOT NULL,
  `description` text NOT NULL,
  `status` enum('pending','in_progress','completed') DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `estimated_duration` decimal(5,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `estimated_cost` decimal(10,2) DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `start_time` timestamp NULL DEFAULT NULL,
  `completion_date` timestamp NULL DEFAULT NULL,
  `completion_notes` text DEFAULT NULL,
  `actual_cost` decimal(10,2) DEFAULT NULL,
  `estimated_completion_date` date DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_categories`
--

CREATE TABLE `maintenance_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `color` varchar(7) DEFAULT '#007bff',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `maintenance_categories`
--

INSERT INTO `maintenance_categories` (`id`, `name`, `description`, `color`, `created_at`) VALUES
(1, 'Plumbing', 'Plumbing issues', '#007bff', '2025-08-13 06:24:57'),
(2, 'Electrical', 'Electrical issues', '#ffc107', '2025-08-13 06:24:57'),
(3, 'HVAC', 'Heating, ventilation, and air conditioning', '#28a745', '2025-08-13 06:24:57'),
(4, 'Structural', 'Structural and building issues', '#dc3545', '2025-08-13 06:24:57'),
(5, 'Appliance', 'Room appliance issues', '#6f42c1', '2025-08-13 06:24:57'),
(6, 'General', 'General maintenance issues', '#6c757d', '2025-08-13 06:24:57');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `target_role` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_logs`
--

CREATE TABLE `notification_logs` (
  `id` int(11) NOT NULL,
  `channel` varchar(50) NOT NULL COMMENT 'Channel name (admin, reception, housekeeping, maintenance)',
  `type` varchar(100) NOT NULL COMMENT 'Notification type',
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Notification data payload' CHECK (json_valid(`data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL COMMENT 'When the notification was read',
  `read_by` int(11) DEFAULT NULL COMMENT 'User ID who read the notification'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_preferences`
--

CREATE TABLE `notification_preferences` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'User ID',
  `channel` varchar(50) NOT NULL COMMENT 'Channel name',
  `notification_type` varchar(100) NOT NULL COMMENT 'Type of notification',
  `email_enabled` tinyint(1) DEFAULT 1 COMMENT 'Whether email notifications are enabled',
  `push_enabled` tinyint(1) DEFAULT 1 COMMENT 'Whether push notifications are enabled',
  `sms_enabled` tinyint(1) DEFAULT 0 COMMENT 'Whether SMS notifications are enabled',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_preferences`
--

INSERT INTO `notification_preferences` (`id`, `user_id`, `channel`, `notification_type`, `email_enabled`, `push_enabled`, `sms_enabled`, `created_at`, `updated_at`) VALUES
(1, 1, 'admin', 'maintenance_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(2, 5, 'admin', 'maintenance_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(4, 1, 'admin', 'housekeeping_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(5, 5, 'admin', 'housekeeping_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(7, 1, 'admin', 'room_status_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(8, 5, 'admin', 'room_status_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(10, 1, 'admin', 'booking_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(11, 5, 'admin', 'booking_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(13, 1, 'admin', 'billing_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(14, 5, 'admin', 'billing_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(16, 2, 'reception', 'maintenance_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(17, 4, 'reception', 'maintenance_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(19, 2, 'reception', 'room_status_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(20, 4, 'reception', 'room_status_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(22, 2, 'reception', 'booking_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(23, 4, 'reception', 'booking_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(25, 2, 'reception', 'billing_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(26, 4, 'reception', 'billing_update', 1, 1, 0, '2025-08-13 07:00:19', '2025-08-13 07:00:19');

-- --------------------------------------------------------

--
-- Table structure for table `notification_templates`
--

CREATE TABLE `notification_templates` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL COMMENT 'Template name',
  `type` varchar(100) NOT NULL COMMENT 'Notification type',
  `subject` varchar(255) DEFAULT NULL COMMENT 'Email subject (for email notifications)',
  `body` text NOT NULL COMMENT 'Notification body template',
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Available variables for template' CHECK (json_valid(`variables`)),
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether template is active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_templates`
--

INSERT INTO `notification_templates` (`id`, `name`, `type`, `subject`, `body`, `variables`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'maintenance_created', 'maintenance_update', 'New Maintenance Request', 'A new maintenance request has been created for Room {room_number}. Issue: {issue_type}. Priority: {priority}', '[\"room_number\", \"issue_type\", \"priority\"]', 1, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(2, 'housekeeping_completed', 'housekeeping_update', 'Housekeeping Task Completed', 'Housekeeping task for Room {room_number} has been completed. Rating: {rating}/5', '[\"room_number\", \"rating\"]', 1, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(3, 'room_status_changed', 'room_status_update', 'Room Status Updated', 'Room {room_number} status changed from {old_status} to {new_status}. Reason: {reason}', '[\"room_number\", \"old_status\", \"new_status\", \"reason\"]', 1, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(4, 'booking_updated', 'booking_update', 'Booking Update', 'Booking {booking_id} has been {action}. Room: {room_number}', '[\"booking_id\", \"action\", \"room_number\"]', 1, '2025-08-13 07:00:19', '2025-08-13 07:00:19'),
(5, 'billing_updated', 'billing_update', 'Billing Update', 'Billing record {billing_id} has been {action}. Amount: {amount}', '[\"billing_id\", \"action\", \"amount\"]', 1, '2025-08-13 07:00:19', '2025-08-13 07:00:19');

-- --------------------------------------------------------

--
-- Table structure for table `partial_payments`
--

CREATE TABLE `partial_payments` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','credit_card','debit_card','upi','bank_transfer','cheque','online_wallet') NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `transaction_id` varchar(100) DEFAULT NULL,
  `receipt_number` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `processed_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) DEFAULT NULL,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','credit_card','debit_card','upi','bank_transfer','cheque','online_wallet','razorpay') NOT NULL,
  `payment_type_category` enum('initial','partial','remaining','checkout') DEFAULT 'initial',
  `payment_status` enum('pending','completed','failed','refunded','partially_refunded') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `transaction_id` varchar(100) DEFAULT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `receipt_number` varchar(20) DEFAULT NULL,
  `razorpay_payment_id` varchar(100) DEFAULT NULL,
  `razorpay_order_id` varchar(100) DEFAULT NULL,
  `razorpay_signature` varchar(255) DEFAULT NULL,
  `processed_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--

CREATE TABLE `payment_methods` (
  `id` int(11) NOT NULL,
  `method_name` varchar(50) NOT NULL,
  `method_code` varchar(20) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `processing_fee` decimal(5,2) DEFAULT 0.00,
  `processing_fee_type` enum('percentage','fixed') DEFAULT 'fixed',
  `min_amount` decimal(10,2) DEFAULT 0.00,
  `max_amount` decimal(10,2) DEFAULT 999999.99,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_methods`
--

INSERT INTO `payment_methods` (`id`, `method_name`, `method_code`, `is_active`, `processing_fee`, `processing_fee_type`, `min_amount`, `max_amount`, `description`) VALUES
(9, 'Cash', 'cash', 1, 0.00, 'fixed', 0.00, 999999.99, 'Cash payment at reception'),
(10, 'Credit Card', 'credit_card', 1, 0.00, 'fixed', 0.00, 999999.99, 'Credit card payment'),
(11, 'Debit Card', 'debit_card', 1, 0.00, 'fixed', 0.00, 999999.99, 'Debit card payment'),
(12, 'UPI', 'upi', 1, 0.00, 'fixed', 0.00, 999999.99, 'Unified Payment Interface'),
(13, 'Bank Transfer', 'bank_transfer', 1, 0.00, 'fixed', 0.00, 999999.99, 'Direct bank transfer'),
(14, 'Cheque', 'cheque', 1, 0.00, 'fixed', 0.00, 999999.99, 'Cheque payment'),
(15, 'Online Wallet', 'online_wallet', 1, 0.00, 'fixed', 0.00, 999999.99, 'Digital wallet payment');

-- --------------------------------------------------------

--
-- Table structure for table `payment_reminders`
--

CREATE TABLE `payment_reminders` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `guest_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL,
  `remaining_amount` decimal(10,2) NOT NULL,
  `reminder_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `reminder_type` enum('checkout','daily','weekly') DEFAULT 'daily',
  `status` enum('active','resolved','overdue') DEFAULT 'active',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_sync_log`
--

CREATE TABLE `payment_sync_log` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_paid` decimal(10,2) DEFAULT NULL,
  `new_paid` decimal(10,2) DEFAULT NULL,
  `old_remaining` decimal(10,2) DEFAULT NULL,
  `new_remaining` decimal(10,2) DEFAULT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_sync_log`
--

INSERT INTO `payment_sync_log` (`id`, `booking_id`, `payment_id`, `action`, `old_paid`, `new_paid`, `old_remaining`, `new_remaining`, `old_status`, `new_status`, `created_at`) VALUES
(1, 117, 6, 'UPDATE', 1000.00, 1000.00, NULL, NULL, 'partial', 'partial', '2025-08-17 06:59:22'),
(2, 136, 18, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:00:20'),
(3, 141, 19, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:38:10'),
(4, 140, 20, 'INSERT_WALK_IN', 0.00, 4500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:38:20'),
(5, 139, 21, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:38:31'),
(6, 138, 22, 'INSERT_WALK_IN', 0.00, 4500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:38:34'),
(7, 142, 25, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:42:01'),
(8, 142, 26, 'INSERT_WALK_IN', 0.00, 4000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:42:56'),
(9, 142, 27, 'INSERT_WALK_IN', 0.00, 6000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:43:01'),
(10, 142, 28, 'INSERT_WALK_IN', 0.00, 8500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:44:27'),
(11, 143, 29, 'INSERT_WALK_IN', 0.00, 1500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:45:07'),
(12, 144, 30, 'INSERT_WALK_IN', 0.00, 1500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:45:14'),
(13, 145, 31, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:51:06'),
(14, 135, 32, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:54:57'),
(15, 145, 33, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:56:43'),
(16, 121, 34, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 07:57:21'),
(17, 146, 35, 'INSERT_WALK_IN', 0.00, 1000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:00:31'),
(18, 147, 36, 'INSERT_WALK_IN', 0.00, 1000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:04:57'),
(19, 147, 37, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:05:11'),
(20, 148, 38, 'INSERT_WALK_IN', 0.00, 500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:06:55'),
(21, 149, 39, 'INSERT_WALK_IN', 0.00, 1000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:13:11'),
(22, 149, 40, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:20:22'),
(23, 147, 41, 'INSERT_WALK_IN', 0.00, 3000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:20:36'),
(24, 151, 42, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:27:15'),
(25, 150, 43, 'INSERT_WALK_IN', 0.00, 4500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:27:29'),
(26, 134, 44, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:27:59'),
(27, 152, 45, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:28:07'),
(28, 133, 46, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:28:27'),
(29, 131, 47, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:28:48'),
(30, 120, 48, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:29:02'),
(31, 130, 49, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:29:12'),
(32, 129, 50, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:29:31'),
(33, 123, 51, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:29:53'),
(34, 128, 52, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:30:09'),
(35, 126, 53, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:30:29'),
(36, 125, 54, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:30:45'),
(37, 122, 55, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:31:02'),
(38, 124, 56, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:31:07'),
(39, 148, 57, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:36:52'),
(40, 146, 58, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:37:02'),
(41, 144, 59, 'INSERT_WALK_IN', 0.00, 3500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:38:15'),
(42, 143, 60, 'INSERT_WALK_IN', 0.00, 3500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 08:38:23'),
(43, 163, 61, 'INSERT_WALK_IN', 0.00, 1000.01, NULL, NULL, 'pending', 'partial', '2025-08-17 09:20:26'),
(44, 164, 62, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:22:25'),
(45, 165, 63, 'INSERT_WALK_IN', 0.00, 1500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:28:51'),
(46, 162, 64, 'INSERT_WALK_IN', 0.00, 1000.01, NULL, NULL, 'pending', 'partial', '2025-08-17 09:55:11'),
(47, 169, 65, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:55:18'),
(48, 168, 66, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:55:27'),
(49, 167, 67, 'INSERT_WALK_IN', 0.00, 2500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:55:43'),
(50, 166, 68, 'INSERT_WALK_IN', 0.00, 1500.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:56:02'),
(51, 161, 69, 'INSERT_WALK_IN', 0.00, 1000.01, NULL, NULL, 'pending', 'partial', '2025-08-17 09:56:24'),
(52, 160, 70, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:57:22'),
(53, 159, 71, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:57:46'),
(54, 158, 72, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:57:55'),
(55, 157, 73, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:58:18'),
(56, 156, 74, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:58:39'),
(57, 155, 75, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:58:47'),
(58, 154, 76, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:59:04'),
(59, 153, 77, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 09:59:18'),
(60, 170, 78, 'INSERT_WALK_IN', 0.00, 2000.00, NULL, NULL, 'pending', 'partial', '2025-08-17 10:30:18'),
(61, 173, 35, 'INSERT', 0.00, 1800.00, NULL, NULL, 'pending', 'partial', '2025-08-28 11:01:37'),
(62, 174, 79, 'INSERT_WALK_IN', 0.00, 2200.00, NULL, NULL, 'pending', 'partial', '2025-08-28 11:06:24'),
(63, 177, 36, 'INSERT', 0.00, 1800.00, NULL, NULL, 'pending', 'partial', '2025-08-28 12:15:14'),
(64, 178, 37, 'INSERT', 0.00, 1800.00, NULL, NULL, 'pending', 'partial', '2025-08-28 12:20:59'),
(65, 179, 38, 'INSERT', 0.00, 1800.00, NULL, NULL, 'pending', 'partial', '2025-08-28 12:24:32'),
(66, 211, 80, 'INSERT_WALK_IN', 0.00, 500.00, NULL, NULL, 'pending', 'partial', '2025-08-29 08:29:36');

-- --------------------------------------------------------

--
-- Stand-in structure for view `prebooked_rooms`
-- (See below for the actual view)
--
CREATE TABLE `prebooked_rooms` (
`room_id` int(11)
,`room_number` varchar(20)
,`room_type_id` int(11)
,`room_type_name` varchar(50)
,`floor` int(11)
,`status` enum('available','booked','occupied','maintenance','cleaning')
,`price_per_night` decimal(10,2)
,`is_prebooked` tinyint(1)
,`prebook_date` date
,`prebook_guest_name` varchar(100)
,`prebook_phone` varchar(20)
,`prebook_notes` text
,`booking_id` int(11)
,`check_in_date` date
,`check_out_date` date
,`check_in_time` time
,`check_out_time` time
,`total_amount` decimal(10,2)
,`booking_status` enum('pending','confirmed','checked_in','checked_out','cancelled')
,`first_name` varchar(50)
,`last_name` varchar(50)
,`guest_phone` varchar(20)
,`guest_email` varchar(100)
);

-- --------------------------------------------------------

--
-- Table structure for table `razorpay_orders`
--

CREATE TABLE `razorpay_orders` (
  `id` int(11) NOT NULL,
  `razorpay_order_id` varchar(255) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `guest_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `description` text DEFAULT NULL,
  `status` enum('created','attempted','completed','failed','cancelled') DEFAULT 'created',
  `payment_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `razorpay_payment_links`
--

CREATE TABLE `razorpay_payment_links` (
  `id` int(11) NOT NULL,
  `payment_link_id` varchar(255) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `guest_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'INR',
  `description` text DEFAULT NULL,
  `short_url` varchar(500) NOT NULL,
  `long_url` text NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('active','expired','paid','cancelled') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `razorpay_payment_logs`
--

CREATE TABLE `razorpay_payment_logs` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `payment_id` varchar(255) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `event_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`event_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `realtime_subscriptions`
--

CREATE TABLE `realtime_subscriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL COMMENT 'User ID who is subscribed',
  `channel` varchar(50) NOT NULL COMMENT 'Channel name',
  `connection_id` varchar(255) DEFAULT NULL COMMENT 'WebSocket connection ID',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether subscription is active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `remaining_payments`
--

CREATE TABLE `remaining_payments` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `original_remaining` decimal(10,2) NOT NULL,
  `payment_amount` decimal(10,2) NOT NULL,
  `new_remaining` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','credit_card','debit_card','upi','bank_transfer','cheque','online_wallet') NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `transaction_id` varchar(100) DEFAULT NULL,
  `receipt_number` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `processed_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `remaining_payment_history`
-- (See below for the actual view)
--
CREATE TABLE `remaining_payment_history` (
`id` int(11)
,`booking_id` int(11)
,`booking_reference` varchar(20)
,`first_name` varchar(50)
,`last_name` varchar(50)
,`phone` varchar(20)
,`room_number` varchar(20)
,`original_remaining` decimal(10,2)
,`payment_amount` decimal(10,2)
,`new_remaining` decimal(10,2)
,`payment_method` enum('cash','credit_card','debit_card','upi','bank_transfer','cheque','online_wallet')
,`payment_date` timestamp
,`transaction_id` varchar(100)
,`receipt_number` varchar(20)
,`notes` text
,`processed_by_name` varchar(100)
);

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int(11) NOT NULL,
  `room_number` varchar(20) NOT NULL,
  `room_type_id` int(11) NOT NULL,
  `status` enum('available','booked','occupied','maintenance','cleaning') DEFAULT 'available',
  `floor` int(11) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_prebooked` tinyint(1) DEFAULT 0,
  `prebook_date` date DEFAULT NULL,
  `prebook_guest_name` varchar(100) DEFAULT NULL,
  `prebook_phone` varchar(20) DEFAULT NULL,
  `prebook_notes` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `last_cleaned` timestamp NULL DEFAULT NULL,
  `next_cleaning` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `room_number`, `room_type_id`, `status`, `floor`, `price`, `created_at`, `updated_at`, `is_prebooked`, `prebook_date`, `prebook_guest_name`, `prebook_phone`, `prebook_notes`, `description`, `last_cleaned`, `next_cleaning`) VALUES
(0, '101', 1, 'available', 1, 2500.00, '2025-08-17 03:48:39', '2025-08-29 17:31:14', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '102', 1, 'available', 1, 2500.00, '2025-08-15 09:04:58', '2025-08-29 17:31:14', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '103', 2, 'available', 1, 2000.00, '2025-08-15 09:05:25', '2025-08-29 17:31:14', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '104', 1, 'available', 1, 2500.00, '2025-08-15 09:05:43', '2025-08-29 17:31:14', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '105', 1, 'available', 1, 2500.00, '2025-08-15 09:06:01', '2025-08-29 17:31:14', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '201', 1, 'available', 2, 2500.00, '2025-08-15 09:08:52', '2025-08-29 13:37:33', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '202', 1, 'available', 2, 2500.00, '2025-08-15 09:09:21', '2025-08-29 13:38:09', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '203', 3, 'available', 2, 4500.00, '2025-08-15 09:09:49', '2025-08-29 17:31:14', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '204', 2, 'available', 2, 2000.00, '2025-08-15 18:24:19', '2025-08-29 13:38:37', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '205', 1, 'available', 2, 2500.00, '2025-08-15 09:11:50', '2025-08-29 13:39:11', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '206', 1, 'available', 2, 2500.00, '2025-08-15 09:12:14', '2025-08-29 13:39:27', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '207', 1, 'available', 2, 2500.00, '2025-08-15 09:13:20', '2025-08-29 13:39:57', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '301', 1, 'available', 3, 2000.00, '2025-08-15 09:15:16', '2025-08-28 11:50:30', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '302', 1, 'available', 3, 2000.00, '2025-08-15 09:15:42', '2025-08-28 11:50:30', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '303', 3, 'available', 3, 4500.00, '2025-08-15 09:16:39', '2025-08-28 11:50:30', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '304', 2, 'available', 3, 2500.00, '2025-08-15 09:17:37', '2025-08-28 11:50:31', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '305', 1, 'available', 3, 2000.00, '2025-08-15 09:18:29', '2025-08-28 11:50:30', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '306', 1, 'available', 3, 2000.00, '2025-08-15 09:18:56', '2025-08-28 11:50:30', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(0, '307', 1, 'available', 3, 2500.00, '2025-08-15 09:19:18', '2025-08-29 13:39:41', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `rooms_new`
--

CREATE TABLE `rooms_new` (
  `room_number` varchar(20) NOT NULL,
  `room_type_id` int(11) NOT NULL,
  `status` enum('available','booked','occupied','maintenance','cleaning') DEFAULT 'available',
  `floor` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `room_availability`
-- (See below for the actual view)
--
CREATE TABLE `room_availability` (
`id` int(11)
,`room_number` varchar(20)
,`room_type_id` int(11)
,`room_type` varchar(50)
,`floor` int(11)
,`status` enum('available','booked','occupied','maintenance','cleaning')
,`price` decimal(10,2)
,`is_prebooked` tinyint(1)
,`check_in_date` date
,`check_out_date` date
,`guest_count` int(11)
,`first_name` varchar(50)
,`last_name` varchar(50)
,`phone` varchar(20)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `room_detailed_status`
-- (See below for the actual view)
--
CREATE TABLE `room_detailed_status` (
`id` int(11)
,`room_number` varchar(20)
,`room_status` enum('available','booked','occupied','maintenance','cleaning')
,`room_type` varchar(50)
,`base_price` decimal(10,2)
,`capacity` int(11)
,`description` text
,`floor` int(11)
,`booking_status` varchar(11)
,`booking_reference` varchar(20)
,`check_in_date` date
,`check_out_date` date
,`created_at` timestamp
);

-- --------------------------------------------------------

--
-- Table structure for table `room_inspections`
--

CREATE TABLE `room_inspections` (
  `id` int(11) NOT NULL,
  `room_number` varchar(20) NOT NULL,
  `inspector_id` int(11) NOT NULL,
  `inspection_date` date NOT NULL,
  `cleanliness_score` int(11) DEFAULT NULL CHECK (`cleanliness_score` >= 1 and `cleanliness_score` <= 10),
  `maintenance_score` int(11) DEFAULT NULL CHECK (`maintenance_score` >= 1 and `maintenance_score` <= 10),
  `notes` text DEFAULT NULL,
  `status` enum('pending','completed','failed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `room_types`
--

CREATE TABLE `room_types` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `base_price` decimal(10,2) NOT NULL,
  `custom_price` decimal(10,2) DEFAULT NULL,
  `capacity` int(11) DEFAULT 2,
  `amenities` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `room_types`
--

INSERT INTO `room_types` (`id`, `name`, `description`, `base_price`, `custom_price`, `capacity`, `amenities`, `created_at`) VALUES
(1, 'Executive', 'Premium executive room with luxury features', 2500.00, 2500.00, 2, 'AC, TV, WiFi, Attached Bathroom', '2025-08-12 15:26:17'),
(2, 'Deluxe', 'Spacious deluxe room', 2000.00, 2000.00, 2, 'AC, TV, WiFi, Attached Bathroom', '2025-08-12 15:26:17'),
(3, 'Suite', 'Luxury suite with amenities', 4500.00, 4500.00, 4, 'AC, TV, WiFi, Attached Bathroom', '2025-08-12 15:26:17');

-- --------------------------------------------------------

--
-- Table structure for table `system_health_metrics`
--

CREATE TABLE `system_health_metrics` (
  `id` int(11) NOT NULL,
  `metric_name` varchar(100) NOT NULL,
  `metric_value` decimal(10,2) DEFAULT NULL,
  `metric_unit` varchar(20) DEFAULT NULL,
  `status` enum('healthy','warning','critical') DEFAULT 'healthy',
  `threshold_warning` decimal(10,2) DEFAULT NULL,
  `threshold_critical` decimal(10,2) DEFAULT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_health_metrics`
--

INSERT INTO `system_health_metrics` (`id`, `metric_name`, `metric_value`, `metric_unit`, `status`, `threshold_warning`, `threshold_critical`, `recorded_at`, `details`) VALUES
(1, 'database_size_mb', 0.00, 'MB', 'healthy', 1000.00, 2000.00, '2025-08-15 15:25:11', NULL),
(2, 'active_users', 0.00, 'users', 'healthy', 50.00, 100.00, '2025-08-15 15:25:11', NULL),
(3, 'api_response_time', 0.00, 'ms', 'healthy', 500.00, 1000.00, '2025-08-15 15:25:11', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `system_maintenance`
--

CREATE TABLE `system_maintenance` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_time` timestamp NOT NULL DEFAULT (current_timestamp() + interval 1 hour),
  `status` enum('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `affected_services` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`affected_services`)),
  `maintenance_type` enum('planned','emergency','routine') DEFAULT 'planned',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_notifications`
--

CREATE TABLE `system_notifications` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','error','success') DEFAULT 'info',
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `target_users` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`target_users`)),
  `is_read` tinyint(1) DEFAULT 0,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_notifications`
--

INSERT INTO `system_notifications` (`id`, `title`, `message`, `type`, `priority`, `target_users`, `is_read`, `expires_at`, `created_at`, `created_by`) VALUES
(1, 'Admin Dashboard Updated', 'New admin features have been added to the dashboard', 'info', 'medium', '[\"all\"]', 0, NULL, '2025-08-15 15:25:11', 1);

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general',
  `is_editable` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `description`, `category`, `is_editable`, `created_at`, `updated_at`) VALUES
(1, 'hotel_name', 'SV Royal Hotel', 'Hotel name displayed throughout the system', 'general', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(2, 'hotel_address', '123 Main Street, City, State 12345', 'Hotel physical address', 'general', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(3, 'hotel_phone', '+1-555-123-4567', 'Hotel contact phone number', 'general', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(4, 'hotel_email', 'info@svroyal.com', 'Hotel contact email', 'general', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(5, 'check_in_time', '15:00', 'Standard check-in time', 'operations', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(6, 'check_out_time', '11:00', 'Standard check-out time', 'operations', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(7, 'late_checkout_fee', '50.00', 'Fee for late check-out (per hour)', 'operations', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(8, 'cancellation_policy', 'Free cancellation up to 24 hours before check-in', 'Cancellation policy description', 'operations', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(9, 'tax_rate', '8.5', 'Local tax rate percentage', 'financial', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(10, 'currency', 'INR', 'Default currency for the system', 'financial', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(11, 'maintenance_alert_threshold', '3', 'Number of maintenance issues before alert', 'maintenance', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(12, 'housekeeping_inspection_required', 'true', 'Whether room inspection is required after cleaning', 'housekeeping', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(13, 'email_notifications_enabled', 'true', 'Enable/disable email notifications', 'notifications', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(14, 'sms_notifications_enabled', 'false', 'Enable/disable SMS notifications', 'notifications', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(15, 'backup_frequency', 'daily', 'How often to create system backups', 'system', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(16, 'session_timeout_minutes', '30', 'User session timeout in minutes', 'security', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(17, 'max_login_attempts', '5', 'Maximum failed login attempts before lockout', 'security', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54'),
(18, 'password_expiry_days', '90', 'Password expiry period in days', 'security', 1, '2025-08-15 15:20:38', '2025-08-29 15:59:54');

-- --------------------------------------------------------

--
-- Table structure for table `task_checklist_completion`
--

CREATE TABLE `task_checklist_completion` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `checklist_item_id` int(11) NOT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tax_rates`
--

CREATE TABLE `tax_rates` (
  `id` int(11) NOT NULL,
  `tax_name` varchar(50) NOT NULL,
  `tax_rate` decimal(5,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `applies_to` enum('room_charges','services','all') DEFAULT 'all',
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tax_rates`
--

INSERT INTO `tax_rates` (`id`, `tax_name`, `tax_rate`, `is_active`, `applies_to`, `description`) VALUES
(1, 'GST', 18.00, 1, 'all', 'Goods and Services Tax'),
(2, 'Service Tax', 5.00, 1, 'services', 'Service charge on additional services');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','reception') NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_password_change` timestamp NULL DEFAULT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `account_locked` tinyint(1) DEFAULT 0,
  `lockout_until` timestamp NULL DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `emergency_contact` varchar(100) DEFAULT NULL,
  `emergency_phone` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `full_name`, `email`, `phone`, `created_at`, `last_login`, `is_active`, `last_password_change`, `failed_login_attempts`, `account_locked`, `lockout_until`, `profile_image`, `department`, `employee_id`, `hire_date`, `emergency_contact`, `emergency_phone`, `updated_at`) VALUES
(1, '', '$2y$10$X8ESnRWT87q1Rqaca8q41.HqdOMQD6n6o2PRw022ktsT.XrZt7KdS', 'admin', 'chinnu', 'mrameshmailbox@gmail.com', '9492959926', '2025-08-12 15:26:17', '2025-08-29 15:31:10', 1, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-29 16:14:48'),
(2, 'reception', '$2y$10$YlG5E.yMuGOHN.QKl0W7Gu.n.Fg/xu3GMPzQMkziudqg8VZSSN9sq', 'reception', 'Reception Staff', 'reception@hotel.com', '54365644', '2025-08-12 15:26:17', '2025-08-29 13:21:28', 1, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-12 15:26:17'),
(5, 'system', '', 'admin', 'System User', 'system@hotel.com', NULL, '2025-08-13 05:28:11', NULL, 1, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-13 05:28:11'),
(9, 'jey', '$2y$10$jS5.JxSCLNd7VKjIMscoS.p952kkloEoiF1WHLEzLODrCBVg/0NEi', 'reception', 'jey sankar', 'jey@gmail.com', '', '2025-08-14 12:53:19', '2025-08-14 12:53:44', 1, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-14 12:53:19'),
(10, 'chinnu', '$2y$10$Sbrcn4cn9S9D3GxG7ysPrOdd4a8TJewVUGVGuJ.EsBtO0lISFba9m', 'reception', 'chinnu', 'chinnu@gmail.com', '9550797609', '2025-08-29 16:16:21', '2025-08-29 16:16:50', 1, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-29 16:16:50'),
(11, 'admin', '$2y$10$oUs2nAI5gMc5StNEBzIy2uyMlHYXYLxm4FmHo4C/3rDrW377p0wHu', 'admin', 'System Administrator', 'admin@hotel.com', '+1234567890', '2025-08-29 16:25:34', '2025-08-29 16:25:55', 1, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-29 16:25:55');

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `permission_key` varchar(100) NOT NULL,
  `permission_value` tinyint(1) DEFAULT 1,
  `granted_by` int(11) DEFAULT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_permissions`
--

INSERT INTO `user_permissions` (`id`, `user_id`, `permission_key`, `permission_value`, `granted_by`, `granted_at`) VALUES
(1, 1, 'dashboard_view', 1, NULL, '2025-08-15 15:25:11'),
(2, 5, 'dashboard_view', 1, NULL, '2025-08-15 15:25:11'),
(4, 1, 'users_manage', 1, NULL, '2025-08-15 15:25:11'),
(5, 5, 'users_manage', 1, NULL, '2025-08-15 15:25:11'),
(7, 1, 'system_settings', 1, NULL, '2025-08-15 15:25:11'),
(8, 5, 'system_settings', 1, NULL, '2025-08-15 15:25:11'),
(10, 1, 'audit_logs_view', 1, NULL, '2025-08-15 15:25:11'),
(11, 5, 'audit_logs_view', 1, NULL, '2025-08-15 15:25:11');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `session_token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NOT NULL DEFAULT (current_timestamp() + interval 24 hour),
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `walk_in_payments`
--

CREATE TABLE `walk_in_payments` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('cash','credit_card','debit_card','upi','bank_transfer','cheque','online_wallet') NOT NULL,
  `payment_status` enum('pending','completed','failed') DEFAULT 'completed',
  `transaction_id` varchar(100) DEFAULT NULL,
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `receipt_number` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `processed_by` int(11) NOT NULL,
  `payment_type` enum('initial','partial','final') DEFAULT 'initial'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;




-- --------------------------------------------------------

--
-- Table structure for table `websocket_notifications`
--

CREATE TABLE `websocket_notifications` (
  `id` int(11) NOT NULL,
  `channel` varchar(100) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_processed` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `websocket_notifications`
--

INSERT INTO `websocket_notifications` (`id`, `channel`, `data`, `created_at`, `is_processed`) VALUES
(1, 'reception', '{\"type\":\"booking_updated\",\"data\":{\"booking_id\":109,\"update_type\":\"booking_info\",\"updated_fields\":[\"action\",\"booking_id\",\"check_in_date\",\"check_out_date\",\"adults\",\"children\",\"total_amount\",\"status\",\"booking_source\",\"notes\"],\"timestamp\":\"2025-08-16 14:30:02\",\"message\":\"Booking information has been updated by admin\"},\"timestamp\":\"2025-08-16 14:30:02\"}', '2025-08-16 12:30:02', 0),
(2, 'reception', '{\"type\":\"booking_updated\",\"data\":{\"booking_id\":109,\"update_type\":\"booking_info\",\"updated_fields\":[\"action\",\"booking_id\",\"check_in_date\",\"check_out_date\",\"adults\",\"children\",\"total_amount\",\"status\",\"booking_source\",\"notes\"],\"timestamp\":\"2025-08-16 14:30:29\",\"message\":\"Booking information has been updated by admin\"},\"timestamp\":\"2025-08-16 14:30:29\"}', '2025-08-16 12:30:29', 0),
(3, 'reception', '{\"type\":\"booking_updated\",\"data\":{\"booking_id\":109,\"update_type\":\"booking_info\",\"updated_fields\":[\"action\",\"booking_id\",\"check_in_date\",\"check_out_date\",\"adults\",\"children\",\"total_amount\",\"paid_amount\",\"status\",\"booking_source\",\"notes\"],\"timestamp\":\"2025-08-16 14:44:38\",\"message\":\"Booking information has been updated by admin\"},\"timestamp\":\"2025-08-16 14:44:38\"}', '2025-08-16 12:44:38', 0),
(4, 'reception', '{\"type\":\"booking_updated\",\"data\":{\"booking_id\":110,\"update_type\":\"booking_info\",\"updated_fields\":[\"action\",\"booking_id\",\"check_in_date\",\"check_out_date\",\"adults\",\"children\",\"total_amount\",\"paid_amount\",\"status\",\"booking_source\",\"notes\"],\"timestamp\":\"2025-08-16 14:49:42\",\"message\":\"Booking information has been updated by admin\"},\"timestamp\":\"2025-08-16 14:49:42\"}', '2025-08-16 12:49:42', 0),
(5, 'reception', '{\"type\":\"booking_updated\",\"data\":{\"booking_id\":110,\"update_type\":\"booking_info\",\"updated_fields\":[\"action\",\"booking_id\",\"check_in_date\",\"check_out_date\",\"adults\",\"children\",\"total_amount\",\"paid_amount\",\"status\",\"booking_source\",\"notes\"],\"timestamp\":\"2025-08-16 14:50:25\",\"message\":\"Booking information has been updated by admin\"},\"timestamp\":\"2025-08-16 14:50:25\"}', '2025-08-16 12:50:25', 0);

-- --------------------------------------------------------

--
-- Structure for view `booking_payment_summary`
--
DROP TABLE IF EXISTS `booking_payment_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `booking_payment_summary`  AS SELECT `b`.`id` AS `id`, `b`.`booking_reference` AS `booking_reference`, `b`.`guest_id` AS `guest_id`, `b`.`room_id` AS `room_id`, `b`.`total_amount` AS `total_amount`, `b`.`paid_amount` AS `paid_amount`, `b`.`remaining_amount` AS `remaining_amount`, `b`.`payment_status` AS `payment_status`, `b`.`owner_referenced` AS `owner_referenced`, `b`.`payment_type` AS `payment_type`, `b`.`status` AS `booking_status`, `g`.`first_name` AS `first_name`, `g`.`last_name` AS `last_name`, `g`.`phone` AS `phone`, `b`.`room_number` AS `room_number`, `rt`.`name` AS `room_type_name`, CASE WHEN `b`.`remaining_amount` > 0 THEN 'Has Outstanding Balance' WHEN `b`.`paid_amount` = 0 THEN 'Unpaid' WHEN `b`.`paid_amount` < `b`.`total_amount` THEN 'Partially Paid' ELSE 'Fully Paid' END AS `payment_summary` FROM (((`bookings` `b` join `guests` `g` on(`b`.`guest_id` = `g`.`id`)) join `rooms` `r` on(`b`.`room_id` = `r`.`id`)) join `room_types` `rt` on(`r`.`room_type_id` = `rt`.`id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `booking_summary`
--
DROP TABLE IF EXISTS `booking_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `booking_summary`  AS SELECT `b`.`id` AS `id`, `b`.`booking_reference` AS `booking_reference`, concat(`g`.`first_name`,' ',`g`.`last_name`) AS `guest_name`, `g`.`phone` AS `phone`, `g`.`email` AS `email`, `b`.`room_number` AS `room_number`, `rt`.`name` AS `room_type`, `b`.`check_in_date` AS `check_in_date`, `b`.`check_out_date` AS `check_out_date`, `b`.`number_of_days` AS `number_of_days`, `b`.`tariff` AS `tariff`, `b`.`total_amount` AS `total_amount`, `b`.`status` AS `status`, `b`.`booking_source` AS `booking_source`, `b`.`plan_type` AS `plan_type`, `b`.`created_at` AS `created_at`, `cb`.`company_name` AS `company_name`, `cb`.`gst_number` AS `gst_number` FROM ((((`bookings` `b` join `guests` `g` on(`b`.`guest_id` = `g`.`id`)) join `rooms` `r` on(`b`.`room_number` = `r`.`room_number`)) join `room_types` `rt` on(`r`.`room_type_id` = `rt`.`id`)) left join `corporate_bookings` `cb` on(`b`.`id` = `cb`.`booking_id`)) ORDER BY `b`.`created_at` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `guest_booking_view`
--
DROP TABLE IF EXISTS `guest_booking_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `guest_booking_view`  AS SELECT `b`.`id` AS `booking_id`, `b`.`booking_reference` AS `booking_reference`, `b`.`room_number` AS `room_number`, `b`.`check_in_date` AS `check_in_date`, `b`.`check_out_date` AS `check_out_date`, `b`.`status` AS `booking_status`, `b`.`total_amount` AS `total_amount`, `b`.`paid_amount` AS `paid_amount`, `b`.`remaining_amount` AS `remaining_amount`, `b`.`payment_status` AS `payment_status`, `g`.`id` AS `guest_id`, `g`.`first_name` AS `first_name`, `g`.`last_name` AS `last_name`, concat(`g`.`first_name`,' ',`g`.`last_name`) AS `full_name`, `g`.`email` AS `email`, `g`.`phone` AS `phone`, `g`.`address` AS `address`, `g`.`id_proof_type` AS `id_proof_type`, `g`.`id_proof_number` AS `id_proof_number`, `g`.`company_name` AS `guest_company`, `g`.`gst_number` AS `guest_gst`, `cb`.`company_name` AS `booking_company`, `cb`.`gst_number` AS `booking_gst`, `cb`.`contact_person` AS `contact_person`, `cb`.`contact_phone` AS `contact_phone`, `cb`.`contact_email` AS `contact_email`, `cb`.`billing_address` AS `billing_address`, `b`.`created_at` AS `booking_created_at`, `g`.`created_at` AS `guest_created_at` FROM ((`bookings` `b` left join `guests` `g` on(`b`.`guest_id` = `g`.`id`)) left join `corporate_bookings` `cb` on(`b`.`id` = `cb`.`booking_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `guest_corporate_view`
--
DROP TABLE IF EXISTS `guest_corporate_view`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `guest_corporate_view`  AS SELECT `g`.`id` AS `guest_id`, `g`.`first_name` AS `first_name`, `g`.`last_name` AS `last_name`, `g`.`email` AS `email`, `g`.`phone` AS `phone`, `g`.`address` AS `address`, `g`.`id_proof_type` AS `id_proof_type`, `g`.`id_proof_number` AS `id_proof_number`, `g`.`company_name` AS `guest_company`, `g`.`gst_number` AS `guest_gst`, `cb`.`company_name` AS `booking_company`, `cb`.`gst_number` AS `booking_gst`, `cb`.`contact_person` AS `contact_person`, `cb`.`contact_phone` AS `contact_phone`, `cb`.`contact_email` AS `contact_email`, `cb`.`billing_address` AS `billing_address`, `g`.`created_at` AS `created_at` FROM (`guests` `g` left join `corporate_bookings` `cb` on(`g`.`id` = `cb`.`booking_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `prebooked_rooms`
--
DROP TABLE IF EXISTS `prebooked_rooms`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `prebooked_rooms`  AS SELECT `r`.`id` AS `room_id`, `r`.`room_number` AS `room_number`, `r`.`room_type_id` AS `room_type_id`, `rt`.`name` AS `room_type_name`, `r`.`floor` AS `floor`, `r`.`status` AS `status`, `r`.`price` AS `price_per_night`, `r`.`is_prebooked` AS `is_prebooked`, `r`.`prebook_date` AS `prebook_date`, `r`.`prebook_guest_name` AS `prebook_guest_name`, `r`.`prebook_phone` AS `prebook_phone`, `r`.`prebook_notes` AS `prebook_notes`, `b`.`id` AS `booking_id`, `b`.`check_in_date` AS `check_in_date`, `b`.`check_out_date` AS `check_out_date`, `b`.`check_in_time` AS `check_in_time`, `b`.`check_out_time` AS `check_out_time`, `b`.`total_amount` AS `total_amount`, `b`.`status` AS `booking_status`, `g`.`first_name` AS `first_name`, `g`.`last_name` AS `last_name`, `g`.`phone` AS `guest_phone`, `g`.`email` AS `guest_email` FROM (((`rooms` `r` left join `room_types` `rt` on(`r`.`room_type_id` = `rt`.`id`)) left join `bookings` `b` on(`r`.`id` = `b`.`room_id` and `b`.`status` in ('confirmed','checked_in','booked'))) left join `guests` `g` on(`b`.`guest_id` = `g`.`id`)) WHERE `r`.`is_prebooked` = 1 OR `b`.`id` is not null ORDER BY `r`.`room_number` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `remaining_payment_history`
--
DROP TABLE IF EXISTS `remaining_payment_history`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `remaining_payment_history`  AS SELECT `rp`.`id` AS `id`, `rp`.`booking_id` AS `booking_id`, `b`.`booking_reference` AS `booking_reference`, `g`.`first_name` AS `first_name`, `g`.`last_name` AS `last_name`, `g`.`phone` AS `phone`, `b`.`room_number` AS `room_number`, `rp`.`original_remaining` AS `original_remaining`, `rp`.`payment_amount` AS `payment_amount`, `rp`.`new_remaining` AS `new_remaining`, `rp`.`payment_method` AS `payment_method`, `rp`.`payment_date` AS `payment_date`, `rp`.`transaction_id` AS `transaction_id`, `rp`.`receipt_number` AS `receipt_number`, `rp`.`notes` AS `notes`, `u`.`full_name` AS `processed_by_name` FROM ((((`remaining_payments` `rp` join `bookings` `b` on(`rp`.`booking_id` = `b`.`id`)) join `guests` `g` on(`b`.`guest_id` = `g`.`id`)) join `rooms` `r` on(`b`.`room_id` = `r`.`id`)) join `users` `u` on(`rp`.`processed_by` = `u`.`id`)) ORDER BY `rp`.`payment_date` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `room_availability`
--
DROP TABLE IF EXISTS `room_availability`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `room_availability`  AS SELECT `r`.`id` AS `id`, `r`.`room_number` AS `room_number`, `r`.`room_type_id` AS `room_type_id`, `rt`.`name` AS `room_type`, `r`.`floor` AS `floor`, `r`.`status` AS `status`, `r`.`price` AS `price`, `r`.`is_prebooked` AS `is_prebooked`, `b`.`check_in_date` AS `check_in_date`, `b`.`check_out_date` AS `check_out_date`, `b`.`guest_count` AS `guest_count`, `g`.`first_name` AS `first_name`, `g`.`last_name` AS `last_name`, `g`.`phone` AS `phone` FROM (((`rooms` `r` left join `room_types` `rt` on(`r`.`room_type_id` = `rt`.`id`)) left join `bookings` `b` on(`r`.`id` = `b`.`room_id` and `b`.`status` in ('confirmed','checked_in','booked'))) left join `guests` `g` on(`b`.`guest_id` = `g`.`id`)) ORDER BY `r`.`room_number` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `room_detailed_status`
--
DROP TABLE IF EXISTS `room_detailed_status`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `room_detailed_status`  AS SELECT `r`.`id` AS `id`, `r`.`room_number` AS `room_number`, `r`.`status` AS `room_status`, `rt`.`name` AS `room_type`, `rt`.`base_price` AS `base_price`, `rt`.`capacity` AS `capacity`, `rt`.`description` AS `description`, `r`.`floor` AS `floor`, CASE WHEN `b`.`id` is not null THEN `b`.`status` ELSE 'no_booking' END AS `booking_status`, CASE WHEN `b`.`id` is not null THEN `b`.`booking_reference` ELSE 'N/A' END AS `booking_reference`, CASE WHEN `b`.`id` is not null THEN `b`.`check_in_date` ELSE NULL END AS `check_in_date`, CASE WHEN `b`.`id` is not null THEN `b`.`check_out_date` ELSE NULL END AS `check_out_date`, `r`.`created_at` AS `created_at` FROM ((`rooms` `r` left join `room_types` `rt` on(`r`.`room_type_id` = `rt`.`id`)) left join `bookings` `b` on(`r`.`room_number` = `b`.`room_number` and `b`.`status` in ('confirmed','checked_in'))) ORDER BY `r`.`room_number` ASC ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `api_rate_limits`
--
ALTER TABLE `api_rate_limits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_ip_endpoint` (`ip_address`,`endpoint`),
  ADD KEY `idx_api_rate_limits_ip` (`ip_address`),
  ADD KEY `idx_api_rate_limits_endpoint` (`endpoint`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_logs_user_id` (`user_id`),
  ADD KEY `idx_audit_logs_action` (`action`),
  ADD KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_logs_created_at` (`created_at`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_reference` (`booking_reference`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `idx_booking_dates` (`check_in_date`,`check_out_date`),
  ADD KEY `idx_booking_room_number` (`room_number`),
  ADD KEY `idx_bookings_payment_status` (`payment_status`),
  ADD KEY `idx_bookings_remaining_amount` (`remaining_amount`),
  ADD KEY `idx_booking_payment_status` (`payment_status`),
  ADD KEY `idx_booking_remaining_amount` (`remaining_amount`),
  ADD KEY `fk_booking_guest` (`guest_id`),
  ADD KEY `idx_bookings_owner_reference` (`owner_reference`),
  ADD KEY `idx_room_status_dates` (`room_number`,`status`,`check_in_date`,`check_out_date`),
  ADD KEY `idx_check_in_ampm` (`check_in_ampm`),
  ADD KEY `idx_check_out_ampm` (`check_out_ampm`);

--
-- Indexes for table `booking_services`
--
ALTER TABLE `booking_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `service_id` (`service_id`);

--
-- Indexes for table `corporate_bookings`
--
ALTER TABLE `corporate_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_corporate_company` (`company_name`),
  ADD KEY `idx_corporate_gst` (`gst_number`),
  ADD KEY `idx_corporate_booking` (`booking_id`);

--
-- Indexes for table `email_config`
--
ALTER TABLE `email_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `config_key` (`config_key`),
  ADD KEY `idx_config_key` (`config_key`);

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reference` (`reference_id`),
  ADD KEY `idx_email_type` (`email_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_sent_at` (`sent_at`);

--
-- Indexes for table `export_history`
--
ALTER TABLE `export_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_export_type` (`export_type`),
  ADD KEY `idx_export_date` (`export_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `extra_services`
--
ALTER TABLE `extra_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_extra_services_booking` (`booking_id`);

--
-- Indexes for table `guests`
--
ALTER TABLE `guests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_guests_email` (`email`),
  ADD KEY `idx_guests_phone` (`phone`),
  ADD KEY `idx_guests_id_proof` (`id_proof_number`),
  ADD KEY `idx_guests_company` (`company_name`),
  ADD KEY `idx_updated_at` (`updated_at`);

--
-- Indexes for table `guest_documents`
--
ALTER TABLE `guest_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `guest_id` (`guest_id`),
  ADD KEY `idx_guest_documents_type` (`document_type`);

--
-- Indexes for table `housekeeping`
--
ALTER TABLE `housekeeping`
  ADD PRIMARY KEY (`id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `assigned_to` (`assigned_to`);

--
-- Indexes for table `housekeeping_checklist_items`
--
ALTER TABLE `housekeeping_checklist_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_type` (`task_type`),
  ADD KEY `idx_display_order` (`display_order`);

--
-- Indexes for table `housekeeping_tasks`
--
ALTER TABLE `housekeeping_tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room_id` (`room_id`),
  ADD KEY `idx_task_type` (`task_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_scheduled_date` (`scheduled_date`),
  ADD KEY `idx_assigned_to` (`assigned_to`),
  ADD KEY `idx_housekeeping_tasks_status` (`status`),
  ADD KEY `idx_housekeeping_tasks_date` (`scheduled_date`),
  ADD KEY `idx_housekeeping_tasks_type` (`task_type`),
  ADD KEY `idx_housekeeping_tasks_assigned` (`assigned_to`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `guest_id` (`guest_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Indexes for table `maintenance`
--
ALTER TABLE `maintenance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_maintenance_room` (`room_number`),
  ADD KEY `idx_maintenance_assigned_to` (`assigned_to`),
  ADD KEY `idx_maintenance_created_at` (`created_at`);

--
-- Indexes for table `maintenance_categories`
--
ALTER TABLE `maintenance_categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_target_role` (`target_role`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `notification_logs`
--
ALTER TABLE `notification_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_channel` (`channel`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_read_status` (`read_at`);

--
-- Indexes for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_channel_type` (`user_id`,`channel`,`notification_type`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_channel` (`channel`);

--
-- Indexes for table `notification_templates`
--
ALTER TABLE `notification_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `partial_payments`
--
ALTER TABLE `partial_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `processed_by` (`processed_by`),
  ADD KEY `idx_partial_payments_booking_id` (`booking_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `processed_by` (`processed_by`);

--
-- Indexes for table `payment_methods`
--
ALTER TABLE `payment_methods`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `method_code` (`method_code`);

--
-- Indexes for table `payment_reminders`
--
ALTER TABLE `payment_reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `guest_id` (`guest_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `idx_payment_reminders_booking_id` (`booking_id`);

--
-- Indexes for table `payment_sync_log`
--
ALTER TABLE `payment_sync_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_id` (`booking_id`),
  ADD KEY `idx_payment_id` (`payment_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `razorpay_orders`
--
ALTER TABLE `razorpay_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `razorpay_order_id` (`razorpay_order_id`),
  ADD KEY `guest_id` (`guest_id`),
  ADD KEY `idx_razorpay_orders_booking_id` (`booking_id`),
  ADD KEY `idx_razorpay_orders_status` (`status`),
  ADD KEY `idx_razorpay_orders_created_at` (`created_at`);

--
-- Indexes for table `razorpay_payment_links`
--
ALTER TABLE `razorpay_payment_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_link_id` (`payment_link_id`),
  ADD KEY `guest_id` (`guest_id`),
  ADD KEY `idx_razorpay_payment_links_booking_id` (`booking_id`),
  ADD KEY `idx_razorpay_payment_links_status` (`status`),
  ADD KEY `idx_razorpay_payment_links_expires_at` (`expires_at`);

--
-- Indexes for table `razorpay_payment_logs`
--
ALTER TABLE `razorpay_payment_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_razorpay_payment_logs_order_id` (`order_id`),
  ADD KEY `idx_razorpay_payment_logs_event_type` (`event_type`);

--
-- Indexes for table `realtime_subscriptions`
--
ALTER TABLE `realtime_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_channel` (`user_id`,`channel`),
  ADD KEY `idx_connection` (`connection_id`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `remaining_payments`
--
ALTER TABLE `remaining_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `processed_by` (`processed_by`),
  ADD KEY `idx_remaining_payments_booking_id` (`booking_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`room_number`),
  ADD KEY `idx_room_status` (`status`),
  ADD KEY `idx_room_type` (`room_type_id`),
  ADD KEY `idx_room_floor` (`floor`),
  ADD KEY `idx_rooms_id` (`id`);

--
-- Indexes for table `rooms_new`
--
ALTER TABLE `rooms_new`
  ADD PRIMARY KEY (`room_number`),
  ADD KEY `room_type_id` (`room_type_id`);

--
-- Indexes for table `room_inspections`
--
ALTER TABLE `room_inspections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inspection_room` (`room_number`),
  ADD KEY `idx_room_inspections_date` (`inspection_date`),
  ADD KEY `idx_room_inspections_inspector` (`inspector_id`);

--
-- Indexes for table `room_types`
--
ALTER TABLE `room_types`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `system_health_metrics`
--
ALTER TABLE `system_health_metrics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_system_health_metrics_name` (`metric_name`),
  ADD KEY `idx_system_health_metrics_status` (`status`),
  ADD KEY `idx_system_health_metrics_recorded` (`recorded_at`);

--
-- Indexes for table `system_maintenance`
--
ALTER TABLE `system_maintenance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_system_maintenance_status` (`status`),
  ADD KEY `idx_system_maintenance_start_time` (`start_time`),
  ADD KEY `idx_system_maintenance_type` (`maintenance_type`);

--
-- Indexes for table `system_notifications`
--
ALTER TABLE `system_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_system_notifications_type` (`type`),
  ADD KEY `idx_system_notifications_priority` (`priority`),
  ADD KEY `idx_system_notifications_created_at` (`created_at`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `task_checklist_completion`
--
ALTER TABLE `task_checklist_completion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `completed_by` (`completed_by`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_checklist_item_id` (`checklist_item_id`),
  ADD KEY `idx_completed_at` (`completed_at`),
  ADD KEY `idx_task_checklist_item` (`checklist_item_id`),
  ADD KEY `idx_task_checklist_completed` (`completed_at`);

--
-- Indexes for table `tax_rates`
--
ALTER TABLE `tax_rates`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_permission` (`user_id`,`permission_key`),
  ADD KEY `granted_by` (`granted_by`),
  ADD KEY `idx_user_permissions_user_id` (`user_id`),
  ADD KEY `idx_user_permissions_key` (`permission_key`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token` (`session_token`),
  ADD KEY `idx_user_sessions_user_id` (`user_id`),
  ADD KEY `idx_user_sessions_token` (`session_token`),
  ADD KEY `idx_user_sessions_expires` (`expires_at`);

--
-- Indexes for table `walk_in_payments`
--
ALTER TABLE `walk_in_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_number` (`receipt_number`),
  ADD KEY `processed_by` (`processed_by`),
  ADD KEY `idx_walk_in_payments_booking_id` (`booking_id`);

--
-- Indexes for table `websocket_notifications`
--
ALTER TABLE `websocket_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_channel` (`channel`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_processed` (`is_processed`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=986;

--
-- AUTO_INCREMENT for table `api_rate_limits`
--
ALTER TABLE `api_rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=219;

--
-- AUTO_INCREMENT for table `booking_services`
--
ALTER TABLE `booking_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `corporate_bookings`
--
ALTER TABLE `corporate_bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `email_config`
--
ALTER TABLE `email_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `export_history`
--
ALTER TABLE `export_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `extra_services`
--
ALTER TABLE `extra_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `guests`
--
ALTER TABLE `guests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `guest_documents`
--
ALTER TABLE `guest_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `housekeeping`
--
ALTER TABLE `housekeeping`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `housekeeping_checklist_items`
--
ALTER TABLE `housekeeping_checklist_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `housekeeping_tasks`
--
ALTER TABLE `housekeeping_tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `maintenance`
--
ALTER TABLE `maintenance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `maintenance_categories`
--
ALTER TABLE `maintenance_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `notification_logs`
--
ALTER TABLE `notification_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `notification_preferences`
--
ALTER TABLE `notification_preferences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `notification_templates`
--
ALTER TABLE `notification_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `partial_payments`
--
ALTER TABLE `partial_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `payment_methods`
--
ALTER TABLE `payment_methods`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `payment_reminders`
--
ALTER TABLE `payment_reminders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_sync_log`
--
ALTER TABLE `payment_sync_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT for table `razorpay_orders`
--
ALTER TABLE `razorpay_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `razorpay_payment_links`
--
ALTER TABLE `razorpay_payment_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `razorpay_payment_logs`
--
ALTER TABLE `razorpay_payment_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `realtime_subscriptions`
--
ALTER TABLE `realtime_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `remaining_payments`
--
ALTER TABLE `remaining_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `room_inspections`
--
ALTER TABLE `room_inspections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `room_types`
--
ALTER TABLE `room_types`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `system_health_metrics`
--
ALTER TABLE `system_health_metrics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `system_maintenance`
--
ALTER TABLE `system_maintenance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_notifications`
--
ALTER TABLE `system_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `task_checklist_completion`
--
ALTER TABLE `task_checklist_completion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_rates`
--
ALTER TABLE `tax_rates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `walk_in_payments`
--
ALTER TABLE `walk_in_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81;

--
-- AUTO_INCREMENT for table `websocket_notifications`
--
ALTER TABLE `websocket_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_booking_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`);

--
-- Constraints for table `booking_services`
--
ALTER TABLE `booking_services`
  ADD CONSTRAINT `booking_services_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `booking_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `extra_services` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `corporate_bookings`
--
ALTER TABLE `corporate_bookings`
  ADD CONSTRAINT `corporate_bookings_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `extra_services`
--
ALTER TABLE `extra_services`
  ADD CONSTRAINT `fk_extra_services_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `guest_documents`
--
ALTER TABLE `guest_documents`
  ADD CONSTRAINT `guest_documents_ibfk_1` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `housekeeping`
--
ALTER TABLE `housekeeping`
  ADD CONSTRAINT `housekeeping_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `housekeeping_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `housekeeping_tasks`
--
ALTER TABLE `housekeeping_tasks`
  ADD CONSTRAINT `housekeeping_tasks_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  ADD CONSTRAINT `invoices_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `maintenance`
--
ALTER TABLE `maintenance`
  ADD CONSTRAINT `maintenance_ibfk_1` FOREIGN KEY (`room_number`) REFERENCES `rooms` (`room_number`),
  ADD CONSTRAINT `maintenance_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`);

--
-- Constraints for table `partial_payments`
--
ALTER TABLE `partial_payments`
  ADD CONSTRAINT `partial_payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  ADD CONSTRAINT `partial_payments_ibfk_2` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payment_reminders`
--
ALTER TABLE `payment_reminders`
  ADD CONSTRAINT `payment_reminders_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  ADD CONSTRAINT `payment_reminders_ibfk_3` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`);

--
-- Constraints for table `razorpay_orders`
--
ALTER TABLE `razorpay_orders`
  ADD CONSTRAINT `razorpay_orders_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`);

--
-- Constraints for table `razorpay_payment_links`
--
ALTER TABLE `razorpay_payment_links`
  ADD CONSTRAINT `razorpay_payment_links_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`);

--
-- Constraints for table `razorpay_payment_logs`
--
ALTER TABLE `razorpay_payment_logs`
  ADD CONSTRAINT `razorpay_payment_logs_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `razorpay_orders` (`id`);

--
-- Constraints for table `remaining_payments`
--
ALTER TABLE `remaining_payments`
  ADD CONSTRAINT `remaining_payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  ADD CONSTRAINT `remaining_payments_ibfk_2` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`);

--
-- Constraints for table `rooms_new`
--
ALTER TABLE `rooms_new`
  ADD CONSTRAINT `rooms_new_ibfk_1` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`);

--
-- Constraints for table `room_inspections`
--
ALTER TABLE `room_inspections`
  ADD CONSTRAINT `room_inspections_ibfk_1` FOREIGN KEY (`room_number`) REFERENCES `rooms` (`room_number`),
  ADD CONSTRAINT `room_inspections_ibfk_2` FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `system_maintenance`
--
ALTER TABLE `system_maintenance`
  ADD CONSTRAINT `system_maintenance_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `system_notifications`
--
ALTER TABLE `system_notifications`
  ADD CONSTRAINT `system_notifications_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `task_checklist_completion`
--
ALTER TABLE `task_checklist_completion`
  ADD CONSTRAINT `task_checklist_completion_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `housekeeping_tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_checklist_completion_ibfk_2` FOREIGN KEY (`checklist_item_id`) REFERENCES `housekeeping_checklist_items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_checklist_completion_ibfk_3` FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `walk_in_payments`
--
ALTER TABLE `walk_in_payments`
  ADD CONSTRAINT `walk_in_payments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  ADD CONSTRAINT `walk_in_payments_ibfk_2` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
