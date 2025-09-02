
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { uploadFile } from '@/lib/storage-service';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { verifySession, getClientIP } from '@/lib/auth-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// File upload configuration
const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.csv', '.xlsx', '.xls'],
  uploadLimits: {
    perUser: 50, // 50 files per user per day
    perIP: 100,  // 100 files per IP per day
  }
} as const;

// In-memory rate limiting for uploads (should be replaced with Redis in production)
const uploadCounts = new Map<string, { count: number; resetTime: number }>();

class UploadRateLimiter {
  private static cleanup() {
    const now = Date.now();
    for (const [key, data] of uploadCounts.entries()) {
      if (now > data.resetTime) {
        uploadCounts.delete(key);
      }
    }
  }

  static check(key: string, limit: number): boolean {
    this.cleanup();
    
    const now = Date.now();
    const resetTime = new Date().setHours(24, 0, 0, 0); // Reset at midnight
    const existing = uploadCounts.get(key);

    if (!existing || now > existing.resetTime) {
      uploadCounts.set(key, { count: 1, resetTime });
      return true;
    }

    if (existing.count >= limit) {
      return false;
    }

    existing.count++;
    return true;
  }
}

// File validation functions
function validateFileType(file: File): { valid: boolean; error?: string } {
  // Check MIME type
  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Allowed types: ${UPLOAD_CONFIG.allowedMimeTypes.join(', ')}`
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} not allowed. Allowed extensions: ${UPLOAD_CONFIG.allowedExtensions.join(', ')}`
    };
  }

  return { valid: true };
}

function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    const maxSizeMB = UPLOAD_CONFIG.maxFileSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size of ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

function validateFileName(fileName: string): { valid: boolean; error?: string } {
  // Check for potentially dangerous file names
  const dangerousPatterns = [
    /\.\./,           // Directory traversal
    /[<>:"|?*]/,      // Invalid characters
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Reserved names
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(fileName)) {
      return {
        valid: false,
        error: 'File name contains invalid characters or patterns'
      };
    }
  }

  if (fileName.length > 255) {
    return {
      valid: false,
      error: 'File name too long (maximum 255 characters)'
    };
  }

  return { valid: true };
}

// Enhanced file validation with magic number checking
async function validateFileContent(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));

    // Magic number validation for common file types
    const magicNumbers: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    };

    const expectedMagic = magicNumbers[file.type];
    if (expectedMagic) {
      const actualMagic = Array.from(bytes);
      const isValid = expectedMagic.some(magic => 
        magic.every((byte, index) => actualMagic[index] === byte)
      );

      if (!isValid) {
        return {
          valid: false,
          error: 'File content does not match the declared file type'
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate file content'
    };
  }
}

// Create standardized error response
function createErrorResponse(
  error: string,
  status: number,
  code?: string,
  details?: any
): NextResponse {
  return NextResponse.json({
    error,
    code,
    details,
    timestamp: new Date().toISOString(),
  }, { status });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const ip = getClientIP(req);

  // Check if Firebase Admin is initialized
  if (!isFirebaseAdminInitialized) {
    console.error(`[ERROR: /api/upload][${requestId}] Firebase Admin not initialized`);
    return createErrorResponse(
      'File upload service temporarily unavailable',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  // Verify user authentication
  const decodedToken = await verifySession(req);
  if (!decodedToken) {
    console.warn(`[WARN: /api/upload][${requestId}] Unauthorized upload attempt from ${ip}`);
    return createErrorResponse(
      'Authentication required to upload files',
      401,
      'UNAUTHORIZED'
    );
  }

  const userId = decodedToken.uid;

  try {
    // Apply rate limiting
    const userKey = `upload_user:${userId}`;
    const ipKey = `upload_ip:${ip}`;

    if (!UploadRateLimiter.check(userKey, UPLOAD_CONFIG.uploadLimits.perUser)) {
      console.warn(`[WARN: /api/upload][${requestId}] User ${userId} exceeded daily upload limit`);
      return createErrorResponse(
        'Daily upload limit exceeded. Please try again tomorrow.',
        429,
        'USER_UPLOAD_LIMIT_EXCEEDED'
      );
    }

    if (!UploadRateLimiter.check(ipKey, UPLOAD_CONFIG.uploadLimits.perIP)) {
      console.warn(`[WARN: /api/upload][${requestId}] IP ${ip} exceeded daily upload limit`);
      return createErrorResponse(
        'Daily upload limit exceeded for this IP address',
        429,
        'IP_UPLOAD_LIMIT_EXCEEDED'
      );
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      return createErrorResponse(
        'Invalid form data',
        400,
        'INVALID_FORM_DATA'
      );
    }

    const file = formData.get('file') as File;
    const uploadType = formData.get('type') as string; // e.g., 'property-image', 'document'

    if (!file) {
      return createErrorResponse(
        'No file provided',
        400,
        'NO_FILE_PROVIDED'
      );
    }

    // Validate file name
    const fileNameValidation = validateFileName(file.name);
    if (!fileNameValidation.valid) {
      return createErrorResponse(
        fileNameValidation.error!,
        400,
        'INVALID_FILE_NAME'
      );
    }

    // Validate file size
    const fileSizeValidation = validateFileSize(file);
    if (!fileSizeValidation.valid) {
      return createErrorResponse(
        fileSizeValidation.error!,
        400,
        'FILE_TOO_LARGE'
      );
    }

    // Validate file type
    const fileTypeValidation = validateFileType(file);
    if (!fileTypeValidation.valid) {
      return createErrorResponse(
        fileTypeValidation.error!,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Validate file content (magic numbers)
    const contentValidation = await validateFileContent(file);
    if (!contentValidation.valid) {
      console.warn(`[WARN: /api/upload][${requestId}] File content validation failed for ${file.name}`);
      return createErrorResponse(
        contentValidation.error!,
        400,
        'INVALID_FILE_CONTENT'
      );
    }

    // Generate safe file name
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const safeFileName = `${userId}_${timestamp}_${randomSuffix}${fileExtension}`;

    console.info(`[INFO: /api/upload][${requestId}] Starting upload for user ${userId}: ${file.name} -> ${safeFileName}`);

    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload file with metadata
    const uploadMetadata = {
      originalName: file.name,
      uploadedBy: userId,
      uploadType: uploadType || 'general',
      uploadDate: new Date().toISOString(),
      fileSize: String(file.size),
      mimeType: file.type,
    };

    const url = await uploadFile(
      arrayBuffer, 
      file.type, 
      safeFileName,
      uploadMetadata
    );

    console.info(`[INFO: /api/upload][${requestId}] Upload successful: ${url}`);

    // Return success response with file details
    return NextResponse.json({
      success: true,
      url,
      filename: safeFileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    }, { status: 200 });

  } catch (error: any) {
    console.error(`[ERROR: /api/upload][${requestId}]`, {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      userId,
      ip
    });

    // Handle specific error types from storage service if available
    if (error.code === 'storage/unauthorized') {
      return createErrorResponse(
        'Storage access denied',
        403,
        'STORAGE_UNAUTHORIZED'
      );
    }

    if (error.code === 'storage/quota-exceeded') {
      return createErrorResponse(
        'Storage quota exceeded',
        507,
        'STORAGE_QUOTA_EXCEEDED'
      );
    }

    if (error.code === 'storage/canceled') {
      return createErrorResponse(
        'Upload was cancelled',
        408,
        'UPLOAD_CANCELLED'
      );
    }

    // Generic error response
    return createErrorResponse(
      'File upload failed due to an internal error',
      500,
      'INTERNAL_UPLOAD_ERROR'
    );
  }
}

// Optional: Add a GET endpoint to retrieve upload statistics (for admin/monitoring)
export async function GET(req: NextRequest) {
  const decodedToken = await verifySession(req);
  
  if (!decodedToken || decodedToken.role !== 'admin') {
    return createErrorResponse(
      'Admin access required',
      403,
      'ADMIN_REQUIRED'
    );
  }

  const stats = {
    totalUploads: uploadCounts.size,
    uploadsByUser: Array.from(uploadCounts.entries())
      .filter(([key]) => key.startsWith('upload_user:'))
      .map(([key, data]) => ({
        userId: key.replace('upload_user:', ''),
        count: data.count,
        resetTime: new Date(data.resetTime).toISOString()
      })),
    uploadsByIP: Array.from(uploadCounts.entries())
      .filter(([key]) => key.startsWith('upload_ip:'))
      .map(([key, data]) => ({
        ip: key.replace('upload_ip:', ''),
        count: data.count,
        resetTime: new Date(data.resetTime).toISOString()
      })),
  };

  return NextResponse.json(stats);
}
