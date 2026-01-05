import React, { useState, useEffect } from 'react';
import { FaTimes, FaEye, FaDownload, FaFileImage } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const FileViewerModal = ({ guest, isOpen, onClose }) => {
    const [files, setFiles] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && guest?.guest_id) {
            fetchGuestFiles();
        }
    }, [isOpen, guest]);

    const fetchGuestFiles = async () => {
        setLoading(true);
        setError('');
        
        try {
            const response = await fetch(`${buildApiUrl('api/get_guest_files.php')}?guest_id=${guest.guest_id}`);
            
            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Check content type to ensure we're getting JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Response is not JSON');
            }
            
            const data = await response.json();
            
            if (data.success) {
                console.log('Files data received:', data.files);
                setFiles(data.files);
            } else {
                setError(data.message || 'Failed to fetch files');
            }
        } catch (err) {
            if (err.message.includes('Response is not JSON')) {
                setError('Server returned invalid response. Please try again.');
            } else if (err.message.includes('HTTP error')) {
                setError('Server error. Please try again later.');
            } else {
                setError('Network error while fetching files');
            }
            console.error('Error fetching guest files:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (fileUrl, filename) => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const hasAnyFiles = () => {
        return Object.values(files).some(file => file.exists);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        📄 Uploaded Files - {guest?.full_name || guest?.guest_name || 'Guest'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading files...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="text-red-500 mb-2">⚠️</div>
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : !hasAnyFiles() ? (
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-2">📁</div>
                            <p className="text-gray-600">No files uploaded for this guest</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* ID Proof Section */}
                            {files.id_proof && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                                        <FaFileImage className="mr-2 text-blue-600" />
                                        ID Proof Document
                                    </h4>
                                    
                                    {files.id_proof.exists ? (
                                        <div className="space-y-3">
                                                                                         <div className="relative">
                                                 <img
                                                     src={files.id_proof.url}
                                                     alt="ID Proof"
                                                     className="w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200"
                                                     style={{ maxHeight: '300px', objectFit: 'contain' }}
                                                     onError={(e) => {
                                                         console.error('Failed to load ID proof image:', files.id_proof.url);
                                                         e.target.style.display = 'none';
                                                         e.target.nextSibling.style.display = 'block';
                                                     }}
                                                 />
                                                 <div 
                                                     className="w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200 bg-gray-100 flex items-center justify-center"
                                                     style={{ 
                                                         maxHeight: '300px', 
                                                         minHeight: '200px',
                                                         display: 'none'
                                                     }}
                                                 >
                                                     <div className="text-center">
                                                         <div className="text-gray-400 mb-2">🖼️</div>
                                                         <p className="text-gray-600 text-sm">Image not available</p>
                                                         <p className="text-gray-500 text-xs">File: {files.id_proof.filename}</p>
                                                     </div>
                                                 </div>
                                             </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    File: {files.id_proof.filename}
                                                </span>
                                                <button
                                                    onClick={() => handleDownload(files.id_proof.url, files.id_proof.filename)}
                                                    className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                                                >
                                                    <FaDownload className="mr-1" />
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-sm">{files.id_proof.message}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Customer Photo Section */}
                            {files.customer_photo && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                                        <FaFileImage className="mr-2 text-green-600" />
                                        Customer Photo
                                    </h4>
                                    
                                    {files.customer_photo.exists ? (
                                        <div className="space-y-3">
                                                                                         <div className="relative">
                                                 <img
                                                     src={files.customer_photo.url}
                                                     alt="Customer Photo"
                                                     className="w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200"
                                                     style={{ maxHeight: '300px', objectFit: 'contain' }}
                                                     onError={(e) => {
                                                         console.error('Failed to load customer photo:', files.customer_photo.url);
                                                         e.target.style.display = 'none';
                                                         e.target.nextSibling.style.display = 'block';
                                                     }}
                                                 />
                                                 <div 
                                                     className="w-full max-w-md mx-auto rounded-lg shadow-md border border-gray-200 bg-gray-100 flex items-center justify-center"
                                                     style={{ 
                                                         maxHeight: '300px', 
                                                         minHeight: '200px',
                                                         display: 'none'
                                                     }}
                                                 >
                                                     <div className="text-center">
                                                         <div className="text-gray-400 mb-2">🖼️</div>
                                                         <p className="text-gray-600 text-sm">Image not available</p>
                                                         <p className="text-gray-500 text-xs">File: {files.customer_photo.filename}</p>
                                                     </div>
                                                 </div>
                                             </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    File: {files.customer_photo.filename}
                                                </span>
                                                <button
                                                    onClick={() => handleDownload(files.customer_photo.url, files.customer_photo.filename)}
                                                    className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 transition-colors"
                                                >
                                                    <FaDownload className="mr-1" />
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-gray-500 text-sm">{files.customer_photo.message}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileViewerModal;
