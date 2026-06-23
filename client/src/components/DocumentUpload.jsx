import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const DocumentUpload = ({ onFileSelect, required = false, error = null }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024;          

    const validateFile = (file) => {
        if (!file) return 'Please select a file';

        if (!allowedTypes.includes(file.type)) {
            return 'Invalid file type. Only PDF, JPG, and PNG are allowed.';
        }

        if (file.size > maxSize) {
            return 'File size exceeds 5MB limit.';
        }

        return null;
    };

    const handleFile = (selectedFile) => {
        const validationError = validateFile(selectedFile);

        if (validationError) {
            alert(validationError);
            return;
        }

        setFile(selectedFile);
        onFileSelect(selectedFile);

        // Create preview for images
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            setPreview(null);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
        onFileSelect(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="w-full">
            <label className="block text-red-600 font-semibold mb-2">
                Registration Document {required && <span className="text-red-500">*</span>
                }
            </label>

            {!file ? (
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                            ? 'border-red-500 bg-red-50'
                            : error
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 hover:border-red-400'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        id="document-upload"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleChange}
                    />

                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

                    <p className="text-gray-700 font-medium mb-2">
                        Drop your document here or{' '}
                        <label
                            htmlFor="document-upload"
                            className="text-red-600 hover:text-red-700 cursor-pointer underline"
                        >
                            browse
                        </label>
                    </p>

                    <p className="text-sm text-gray-500 mb-4">
                        PDF, JPG, PNG (Max 5MB)
                    </p>

                    {error && (
                        <div className="flex items-center justify-center text-red-600 text-sm mt-2">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="w-16 h-16 object-cover rounded border"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
                                    <FileText className="w-8 h-8 text-red-600" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center mb-1">
                                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                                    <p className="font-medium text-gray-800 truncate">
                                        {file.name}
                                    </p>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {formatFileSize(file.size)}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    ✓ File ready to upload
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={removeFile}
                            className="ml-2 p-1 hover:bg-red-100 rounded-full transition"
                            title="Remove file"
                        >
                            <X className="w-5 h-5 text-red-600" />
                        </button>
                    </div>
                </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
                📄 Upload your registration certificate, license, or official document
            </p>
        </div>
    );
};

export default DocumentUpload;