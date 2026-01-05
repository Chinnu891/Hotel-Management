# Hotel Management System

A comprehensive hotel management system with frontend and backend components for managing bookings, guests, rooms, billing, and more.

## Repository
GitHub: https://github.com/Chinnu891/Hotel-Management.git

## ⚠️ IMPORTANT: Root Folder Name Requirement

**The root folder MUST be named `hotel-management` for the backend API calls to work correctly.**

The application is configured to use the following backend path:
- Local development: `http://localhost/hotel-management/backend`
- Network access: `http://{hostname}/hotel-management/backend`

If you clone or download this repository, ensure the root folder is named exactly `hotel-management`. If you rename it, you will need to update the API configuration files:
- `frontend/src/config/api.js`
- `frontend/src/config/backend.js`
- `frontend/src/setupProxy.js`

## Project Structure

```
hotel-management/
├── backend/          # PHP backend API
├── frontend/         # React frontend application
├── database/         # Database setup files
└── sql/             # SQL schema files
```

## Setup Instructions

### Prerequisites
- **XAMPP** (or similar) with PHP 7.4+
- MySQL/MariaDB
- Node.js and npm
- Composer (for PHP dependencies)

### Step 1: Install XAMPP

1. Download XAMPP from [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. Install XAMPP to your desired location (default: `C:\xampp`)
3. During installation, make sure to select **Apache** and **MySQL** components

### Step 2: Start Apache and MySQL

1. Open **XAMPP Control Panel**
2. Click **Start** button next to **Apache**
3. Click **Start** button next to **MySQL**
4. Both services should show **Running** status (green)

### Step 3: Setup Database

1. **Open phpMyAdmin:**
   - In XAMPP Control Panel, click **Admin** button next to MySQL
   - OR open your browser and go to: `http://localhost/phpmyadmin`

2. **Create/Rename Database:**
   - The SQL files use the database name: `if0_40831329_hotel_management`
   - **If you already have a database with a different name, you MUST rename it to match:**
     - Click on your existing database in the left sidebar
     - Go to **Operations** tab
     - In **Rename database to:** field, enter: `if0_40831329_hotel_management`
     - Click **Go**
   - **OR create a new database:**
     - Click **New** in the left sidebar
     - Enter database name: `if0_40831329_hotel_management`
     - Choose collation: `utf8mb4_general_ci` (or `utf8mb4_unicode_ci`)
     - Click **Create**

3. **Import SQL Files:**
   - Select the database `if0_40831329_hotel_management` from the left sidebar
   - Click on **Import** tab at the top
   - **Import First File:**
     - Click **Choose File** button
     - Navigate to: `sql/hotel_management.sql`
     - Click **Go** button at the bottom
     - Wait for the import to complete (you should see a success message)
   - **Import Second File:**
     - Click **Import** tab again
     - Click **Choose File** button
     - Navigate to: `sql/hotel_booking_triggers.sql`
     - Click **Go** button at the bottom
     - Wait for the import to complete (you should see a success message)

   **⚠️ Important:** Import `hotel_management.sql` FIRST, then `hotel_booking_triggers.sql`

### Step 4: Backend Setup

1. **Ensure the root folder is named `hotel-management`**
   - Place the project in your web server root: `C:\xampp\htdocs\hotel-management`
   - If you have a different folder name, rename it to `hotel-management`

2. **Install PHP dependencies:**
   ```bash
   cd backend
   composer install
   ```

3. **Configure database connection:**
   - Open `backend/config/database.php`
   - Update the database credentials if needed:
     - Database name: `if0_40831329_hotel_management`
     - Username: `root` (default XAMPP)
     - Password: `` (empty by default in XAMPP)
     - Host: `localhost`

### Step 5: Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```
   - The frontend will open at `http://localhost:3000`
   - Make sure Apache and MySQL are running in XAMPP Control Panel

## Configuration

### Database Configuration

**⚠️ CRITICAL:** The database name in your SQL files is `if0_40831329_hotel_management`. 

- **If you create a database with a different name**, you MUST rename it to `if0_40831329_hotel_management` before importing the SQL files
- **OR** you can modify the SQL files to use your preferred database name, but you'll need to:
  1. Replace all occurrences of `if0_40831329_hotel_management` in both SQL files
  2. Update the database name in `backend/config/database.php`

### API Configuration

The API base URL is automatically configured based on the environment:
- **Localhost**: `http://localhost/hotel-management/backend`
- **Production**: `https://app.svroyalhotel.in/backend`
- **Network**: `http://{hostname}/hotel-management/backend`

## Features

- Room Management
- Booking System
- Guest Management
- Billing & Invoicing
- Payment Processing
- Housekeeping Management
- Maintenance Tracking
- Reports & Analytics
- Tally Integration

## License

[Add your license information here]

## Contributing

[Add contribution guidelines if needed]

