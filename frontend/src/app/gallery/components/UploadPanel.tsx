import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadItem {
  id: number;
  file: File;
  name: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error: string | null;
}

function UploadPanel() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files).filter(file => 
      file.type.startsWith('image/')
    ) : [];
    
    if (files.length > 0) {
      uploadFiles(files);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const uploadFiles = async (files: File[]) => {
    // Get auth token - adjust based on your auth implementation
    const token = localStorage.getItem('accessToken');
    console.log(token)
    
    if (!token) {
      alert('Authentication required. Please log in.');
      return;
    }

    // Create upload entries for each file
    const newUploads: UploadItem[] = files.map((file, index) => ({
      id: Date.now() + index,
      file,
      name: file.name,
      status: 'uploading' as const,
      progress: 0,
      error: null
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Upload each file
    for (const upload of newUploads) {
      try {
        const formData = new FormData();
        formData.append('file', upload.file);

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
        
        const response = await fetch(`${apiBaseUrl}/api/v1/storage/upload/photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Upload failed');
        }

        const result = await response.json();
        
        // Update upload status to success
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'success' as const, progress: 100 }
            : u
        ));

      } catch (error) {
        console.error('Upload error:', error);
        
        // Update upload status to error
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
            : u
        ));
      }
    }
  };

  const removeUpload = (id: number) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-4">
      <div 
        className={`rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-sm transition-colors ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-gray-100">
          <Upload size={20} />
        </div>
        <p className="text-sm text-gray-700">Drag & drop photos here, or</p>
        <div className="mt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            Choose files
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          EXIF data and thumbnails will be extracted automatically
        </p>
      </div>

      {/* Upload Status List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Uploads</h3>
          {uploads.map(upload => (
            <div 
              key={upload.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {upload.status === 'uploading' && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                )}
                {upload.status === 'success' && (
                  <CheckCircle size={20} className="text-green-600" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle size={20} className="text-red-600" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.name}
                </p>
                {upload.status === 'uploading' && (
                  <p className="text-xs text-gray-500">Uploading...</p>
                )}
                {upload.status === 'success' && (
                  <p className="text-xs text-green-600">Upload complete</p>
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-red-600">{upload.error}</p>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeUpload(upload.id)}
                className="flex-shrink-0 rounded-lg p-1 hover:bg-gray-100"
                aria-label="Remove"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadPanel;