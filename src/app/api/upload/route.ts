
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
    timestamp: new Date().toISOString()
  }, { status });
}


export async function POST(req: NextRequest) {
    if (!isFirebaseAdminInitialized) {
        return createErrorResponse('Backend services are not configured. Please contact support.', 503, 'SERVICE_UNAVAILABLE');
    }
    
    // 1. Authentication
    const decodedToken = await verifySession(req);
    if (!decodedToken) {
        return createErrorResponse('Unauthorized: You must be logged in to upload files.', 401, 'UNAUTHORIZED');
    }

    // 2. Rate Limiting
    const ip = getClientIP(req);
    if (!UploadRateLimiter.check(`ip:${ip}`, UPLOAD_CONFIG.uploadLimits.perIP) || 
        !UploadRateLimiter.check(`user:${decodedToken.uid}`, UPLOAD_CONFIG.uploadLimits.perUser)) {
        return createErrorResponse('Too many uploads. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }
    
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return createErrorResponse('No file provided.', 400, 'BAD_REQUEST');
        }

        // 3. Validation Chain
        const validations = [
            validateFileName(file.name),
            validateFileSize(file),
            validateFileType(file),
        ];

        for (const validation of validations) {
            if (!validation.valid) {
                return createErrorResponse(validation.error!, 400, 'VALIDATION_FAILED', { detail: validation.error });
            }
        }
        
        // Content validation (magic number check)
        const contentValidation = await validateFileContent(file);
        if (!contentValidation.valid) {
            return createErrorResponse(contentValidation.error!, 400, 'VALIDATION_FAILED', { detail: contentValidation.error });
        }

        // 4. Upload to Storage
        const arrayBuffer = await file.arrayBuffer();
        const url = await uploadFile(arrayBuffer, file.type, file.name);
        
        return NextResponse.json({ url });
    } catch (error: any) {
        console.error('[ERROR: /api/upload]', error);
        return createErrorResponse('An internal server error occurred during file upload.', 500, 'INTERNAL_SERVER_ERROR');
    }
}
