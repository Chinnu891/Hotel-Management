<?php
require_once '../utils/cors_headers.php';

header('Content-Type: application/json');

require_once '../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $guestId = $_GET['guest_id'] ?? '';
        
        if (empty($guestId)) {
            echo json_encode([
                'success' => false,
                'message' => 'Guest ID is required'
            ]);
            exit;
        }

        // Get guest file information
        $sql = "SELECT 
                    id_proof_image,
                    customer_photo
                FROM guests 
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$guestId]);
        $guest = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$guest) {
            echo json_encode([
                'success' => false,
                'message' => 'Guest not found'
            ]);
            exit;
        }

        $files = [];
        
        // Check if ID proof image exists
        if (!empty($guest['id_proof_image'])) {
            $idProofPath = '../uploads/' . $guest['id_proof_image'];
            if (file_exists($idProofPath)) {
                // Build the correct URL
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'];
                $baseUrl = $protocol . '://' . $host;
                $imageUrl = $baseUrl . '/hotel-management/backend/uploads/' . $guest['id_proof_image'];
                
                $files['id_proof'] = [
                    'filename' => $guest['id_proof_image'],
                    'url' => $imageUrl,
                    'type' => 'ID Proof',
                    'exists' => true
                ];
            } else {
                $files['id_proof'] = [
                    'filename' => $guest['id_proof_image'],
                    'type' => 'ID Proof',
                    'exists' => false,
                    'message' => 'File not found on server'
                ];
            }
        } else {
            $files['id_proof'] = [
                'type' => 'ID Proof',
                'exists' => false,
                'message' => 'No ID proof uploaded'
            ];
        }

        // Check if customer photo exists
        if (!empty($guest['customer_photo'])) {
            $customerPhotoPath = '../uploads/' . $guest['customer_photo'];
            if (file_exists($customerPhotoPath)) {
                // Build the correct URL
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'];
                $baseUrl = $protocol . '://' . $host;
                $imageUrl = $baseUrl . '/hotel-management/backend/uploads/' . $guest['customer_photo'];
                
                $files['customer_photo'] = [
                    'filename' => $guest['customer_photo'],
                    'url' => $imageUrl,
                    'type' => 'Customer Photo',
                    'exists' => true
                ];
            } else {
                $files['customer_photo'] = [
                    'filename' => $guest['customer_photo'],
                    'type' => 'Customer Photo',
                    'exists' => false,
                    'message' => 'File not found on server'
                ];
            }
        } else {
            $files['customer_photo'] = [
                'type' => 'Customer Photo',
                'exists' => false,
                'message' => 'No customer photo uploaded'
            ];
        }

        echo json_encode([
            'success' => true,
            'files' => $files
        ]);

    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
