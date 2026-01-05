<?php
/**
 * SV ROYAL LUXURY ROOMS - Admin Dashboard
 * 
 * This is the main admin dashboard where administrators can manage
 * all aspects of the hotel management system.
 */

// Start session
session_start();

// Check if user is authenticated
if (!isset($_SESSION['user_id']) && !isset($_COOKIE['auth_token'])) {
    header("Location: ../../login.html");
    exit();
}

// Verify JWT token if using cookies
if (isset($_COOKIE['auth_token']) && !isset($_SESSION['user_id'])) {
    require_once '../utils/simple_jwt_helper.php';
    try {
        $decoded = SimpleJWTHelper::verifyToken($_COOKIE['auth_token']);
        if (!$decoded || $decoded->role !== 'admin') {
            header("Location: ../../login.html");
            exit();
        }
        // Set session data
        $_SESSION['user_id'] = $decoded->id;
        $_SESSION['user_role'] = $decoded->role;
        $_SESSION['username'] = $decoded->username;
    } catch (Exception $e) {
        header("Location: ../../login.html");
        exit();
    }
}

// Check if user has admin role
if ($_SESSION['user_role'] !== 'admin') {
    header("Location: ../../login.html");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SV ROYAL - Admin Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .logo {
            font-size: 2rem;
            font-weight: bold;
            background: linear-gradient(45deg, #ffd700, #ffed4e, #fff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .user-info {
            color: white;
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .logout-btn {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            color: #333;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .logout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
        }

        .main-content {
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .welcome-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
        }

        .welcome-card h1 {
            color: white;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .welcome-card p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.2rem;
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }

        .dashboard-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 15px;
            padding: 30px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .dashboard-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }

        .dashboard-card h3 {
            color: #ffd700;
            font-size: 1.5rem;
            margin-bottom: 15px;
        }

        .dashboard-card p {
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
        }

        .card-icon {
            font-size: 3rem;
            margin-bottom: 20px;
            color: #ffd700;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">SV ROYAL</div>
        <div class="user-info">
            <span>Welcome, <?php echo htmlspecialchars($_SESSION['username'] ?? 'Admin'); ?></span>
            <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
    </div>

    <div class="main-content">
        <div class="welcome-card">
            <h1>Admin Dashboard</h1>
            <p>Welcome to SV ROYAL LUXURY ROOMS Management System</p>
        </div>

        <div class="dashboard-grid">
            <div class="dashboard-card" onclick="location.href='guest_history_notify.php'">
                <div class="card-icon">👥</div>
                <h3>Guest Management</h3>
                <p>Manage guest bookings, check-ins, check-outs, and guest history notifications.</p>
            </div>

            <div class="dashboard-card" onclick="location.href='../rooms/'">
                <div class="card-icon">🏨</div>
                <h3>Room Management</h3>
                <p>Manage room availability, status, and room-related operations.</p>
            </div>

            <div class="dashboard-card" onclick="location.href='../booking/'">
                <div class="card-icon">📅</div>
                <h3>Booking System</h3>
                <p>Handle reservations, manage bookings, and track room occupancy.</p>
            </div>

            <div class="dashboard-card" onclick="location.href='../reception/'">
                <div class="card-icon">🔄</div>
                <h3>Reception Dashboard</h3>
                <p>Access reception tools and guest service management.</p>
            </div>

            <div class="dashboard-card" onclick="location.href='../housekeeping/'">
                <div class="card-icon">🧹</div>
                <h3>Housekeeping</h3>
                <p>Manage room maintenance, cleaning schedules, and housekeeping tasks.</p>
            </div>

            <div class="dashboard-card" onclick="location.href='../maintenance/'">
                <div class="card-icon">🔧</div>
                <h3>Maintenance</h3>
                <p>Track maintenance requests, repairs, and facility management.</p>
            </div>
        </div>
    </div>

    <script>
        async function logout() {
            try {
                const response = await fetch('../auth/logout.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    window.location.href = '../../login.html';
                } else {
                    // Force logout
                    window.location.href = '../../login.html';
                }
            } catch (error) {
                console.error('Logout error:', error);
                // Force logout
                window.location.href = '../../login.html';
            }
        }
    </script>
</body>
</html>
