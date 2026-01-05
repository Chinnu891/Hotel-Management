<?php
class Response {
    public function success($data = null, $message = 'Success') {
        return [
            'status' => 200,
            'success' => true,
            'message' => $message,
            'data' => $data
        ];
    }

    public function error($message = 'Error occurred', $status = 400, $errors = null) {
        return [
            'status' => $status,
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ];
    }

    public function validationError($errors, $message = 'Validation failed') {
        return [
            'status' => 422,
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ];
    }

    public function notFound($message = 'Resource not found') {
        return [
            'status' => 404,
            'success' => false,
            'message' => $message
        ];
    }

    public function unauthorized($message = 'Unauthorized access') {
        return [
            'status' => 401,
            'success' => false,
            'message' => $message
        ];
    }

    public function forbidden($message = 'Access forbidden') {
        return [
            'status' => 403,
            'success' => false,
            'message' => $message
        ];
    }
}
?>
