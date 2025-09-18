
/**
 * @fileOverview Centralized error handling and logging utilities for AI flows
 */

export enum FlowErrorType {
    FIREBASE_ERROR = 'FIREBASE_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AI_MODEL_ERROR = 'AI_MODEL_ERROR',
    DATA_NOT_FOUND = 'DATA_NOT_FOUND',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface FlowError {
    type: FlowErrorType;
    message: string;
    flowName: string;
    originalError?: Error;
    context?: Record<string, any>;
    timestamp: string;
}

export class FlowErrorHandler {
    static createError(
        type: FlowErrorType,
        message: string,
        flowName: string,
        originalError?: Error,
        context?: Record<string, any>
    ): FlowError {
        return {
            type,
            message,
            flowName,
            originalError,
            context,
            timestamp: new Date().toISOString()
        };
    }

    static logError(error: FlowError): void {
        const logData = {
            level: 'ERROR',
            flowName: error.flowName,
            errorType: error.type,
            message: error.message,
            context: error.context,
            stack: error.originalError?.stack,
            timestamp: error.timestamp
        };

        console.error(`[${error.type}] ${error.flowName}:`, logData);
        
        // In production, you might want to send this to a logging service
        // like Cloud Logging, Sentry, or similar
    }

    static handleFirebaseError(error: any, flowName: string, context?: Record<string, any>): never {
        let message = 'Firebase operation failed';
        let type = FlowErrorType.FIREBASE_ERROR;

        if (error.code === 'permission-denied' || error.code === 'firestore/permission-denied') {
            message = 'Permission denied accessing Firebase';
            type = FlowErrorType.PERMISSION_ERROR;
        } else if (error.code === 'not-found' || error.code === 'firestore/not-found') {
            message = 'Requested document not found';
            type = FlowErrorType.DATA_NOT_FOUND;
        } else if (error.code === 'unavailable' || error.code === 'firestore/unavailable') {
            message = 'Firebase service temporarily unavailable';
            type = FlowErrorType.NETWORK_ERROR;
        }

        const flowError = this.createError(type, message, flowName, error, context);
        this.logError(flowError);
        throw new Error(flowError.message);
    }

    static handleValidationError(error: any, flowName: string, context?: Record<string, any>): never {
        const message = `Validation failed: ${error.message || 'Invalid input data'}`;
        const flowError = this.createError(FlowErrorType.VALIDATION_ERROR, message, flowName, error, context);
        this.logError(flowError);
        throw new Error(flowError.message);
    }

    static handleAIModelError(error: any, flowName: string, context?: Record<string, any>): never {
        let message = 'AI model request failed';
        
        if (error.message?.includes('quota')) {
            message = 'AI model quota exceeded';
        } else if (error.message?.includes('timeout')) {
            message = 'AI model request timed out';
        } else if (error.message?.includes('content')) {
            message = 'AI model content policy violation';
        }

        const flowError = this.createError(FlowErrorType.AI_MODEL_ERROR, message, flowName, error, context);
        this.logError(flowError);
        throw new Error(flowError.message);
    }

    static handleGenericError(error: any, flowName: string, context?: Record<string, any>): never {
        const message = error.message || 'An unexpected error occurred';
        const flowError = this.createError(FlowErrorType.UNKNOWN_ERROR, message, flowName, error, context);
        this.logError(flowError);
        throw new Error(flowError.message);
    }
}

// Usage example for your existing flows:
export function withErrorHandling<T extends any[], R>(
    flowName: string,
    fn: (...args: T) => Promise<R>
) {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args);
        } catch (error: any) {
            // Determine error type and handle appropriately
            if (error.code && typeof error.code === 'string' && error.code.startsWith('firestore/')) {
                FlowErrorHandler.handleFirebaseError(error, flowName, { args });
            } else if (error.name === 'ValidationError' || error.issues) {
                FlowErrorHandler.handleValidationError(error, flowName, { args });
            } else if (error.message?.includes('AI') || error.message?.includes('model')) {
                FlowErrorHandler.handleAIModelError(error, flowName, { args });
            } else {
                FlowErrorHandler.handleGenericError(error, flowName, { args });
            }
        }
    };
}
