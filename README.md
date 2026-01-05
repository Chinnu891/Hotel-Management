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
- XAMPP (or similar) with PHP 7.4+
- MySQL/MariaDB
- Node.js and npm
- Composer (for PHP dependencies)

### Backend Setup

1. Ensure the root folder is named `hotel-management`
2. Place the project in your web server root (e.g., `C:\xampp\htdocs\hotel-management`)
3. Install PHP dependencies:
   ```bash
   cd backend
   composer install
   ```
4. Configure database connection in `backend/config/database.php`
5. Import the database schema from `sql/hotel_management.sql`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Configuration

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

