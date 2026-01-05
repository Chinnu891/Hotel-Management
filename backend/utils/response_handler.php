<?php

class ResponseHandler {
    
    public function success($data = null, $message = 'Success') {
        return [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    public function error($message = 'Error occurred', $code = 400, $data = null) {
        return [
            'success' => false,
            'message' => $message,
            'code' => $code,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    public function validationError($errors, $message = 'Validation failed') {
        return [
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'code' => 422,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    public function notFound($message = 'Resource not found') {
        return $this->error($message, 404);
    }
    
    public function unauthorized($message = 'Unauthorized access') {
        return $this->error($message, 401);
    }
    
    public function forbidden($message = 'Access forbidden') {
        return $this->error($message, 403);
    }
    
    public function badRequest($message = 'Bad request') {
        return $this->error($message, 400);
    }
    
    public function methodNotAllowed($message = 'Method not allowed') {
        return $this->error($message, 405);
    }
    
    public function serverError($message = 'Internal server error') {
        return $this->error($message, 500);
    }
}
?>
