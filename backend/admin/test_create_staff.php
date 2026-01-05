<?php
// Simple test for staff creation - NO JWT AUTH
// Remove this file in production

echo "<h1>Testing Staff Creation (No JWT)</h1>";

try {
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    echo "✅ Database connection successful<br>";
    
    // Test data
    $test_username = 'testuser_' . time(); // Unique username
    $test_password = 'password123';
    $test_full_name = 'Test User ' . time();
    $test_email = 'test' . time() . '@hotel.com';
    $test_phone = '1234567890';
    
    echo "✅ Test data prepared:<br>";
    echo "- Username: $test_username<br>";
    echo "- Password: $test_password<br>";
    echo "- Full Name: $test_full_name<br>";
    echo "- Email: $test_email<br>";
    echo "- Phone: $test_phone<br><br>";
    
    // Check if username already exists
    $check_query = "SELECT id FROM users WHERE username = :username";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":username", $test_username);
    $check_stmt->execute();

    if ($check_stmt->rowCount() > 0) {
        echo "❌ Username already exists<br>";
        exit();
    }
    
    echo "✅ Username is available<br>";

    // Hash password
    $hashed_password = password_hash($test_password, PASSWORD_DEFAULT);
    echo "✅ Password hashed successfully<br>";

    // Insert new reception user
    $query = "INSERT INTO users (username, password, role, full_name, email, phone) VALUES (:username, :password, 'reception', :full_name, :email, :phone)";
    $stmt = $db->prepare($query);
    
    $stmt->bindParam(":username", $test_username);
    $stmt->bindParam(":password", $hashed_password);
    $stmt->bindParam(":full_name", $test_full_name);
    $stmt->bindParam(":email", $test_email);
    $stmt->bindParam(":phone", $test_phone);

    if ($stmt->execute()) {
        $user_id = $db->lastInsertId();
        echo "✅ Staff member created successfully!<br>";
        echo "✅ New user ID: $user_id<br>";
        
        // Verify the user was created
        $verify_query = "SELECT id, username, role, full_name, email, phone FROM users WHERE id = :user_id";
        $verify_stmt = $db->prepare($verify_query);
        $verify_stmt->bindParam(":user_id", $user_id);
        $verify_stmt->execute();
        
        $user = $verify_stmt->fetch(PDO::FETCH_ASSOC);
        echo "<br><h3>Created User Details:</h3>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Field</th><th>Value</th></tr>";
        echo "<tr><td>ID</td><td>" . $user['id'] . "</td></tr>";
        echo "<tr><td>Username</td><td>" . $user['username'] . "</td></tr>";
        echo "<tr><td>Role</td><td>" . $user['role'] . "</td></tr>";
        echo "<tr><td>Full Name</td><td>" . $user['full_name'] . "</td></tr>";
        echo "<tr><td>Email</td><td>" . $user['email'] . "</td></tr>";
        echo "<tr><td>Phone</td><td>" . $user['phone'] . "</td></tr>";
        echo "</table>";
        
    } else {
        echo "❌ Failed to create staff member<br>";
        echo "❌ Database error: " . implode(", ", $stmt->errorInfo()) . "<br>";
    }
    
} catch (PDOException $e) {
    echo "❌ PDO Error: " . $e->getMessage() . "<br>";
} catch (Exception $e) {
    echo "❌ General Error: " . $e->getMessage() . "<br>";
}
?>
