/**
 * @fileOverview Comprehensive monitoring and analytics system for AI flows
 */

import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { FlowErrorType } from './flow-errors';

export interface FlowMetrics {
    flowName: string;
    executionId: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    status: 'started' | 'completed' | 'failed';
    inputSize?: number;
    outputSize?: number;
    errorType?: FlowErrorType | string;
    errorMessage?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}

export interface FlowAnalytics {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    errorBreakdown: Record<string, number>;
    performanceTrends: Array<{
        date: string;
        avgDuration: number;
        executions: number;
        errors: number;
    }>;
}

export class FlowMonitor {
    private static instance: FlowMonitor;
    private metrics: Map<string, FlowMetrics> = new Map();

    static getInstance(): FlowMonitor {
        if (!FlowMonitor.instance) {
            FlowMonitor.instance = new FlowMonitor();
        }
        return FlowMonitor.instance;
    }

    /**
     * Start monitoring a flow execution
     */
    startExecution(flowName: string, userId?: string, metadata?: Record<string, unknown>): string {
        const executionId = this.generateExecutionId(flowName);
        const metrics: FlowMetrics = {
            flowName,
            executionId,
            startTime: Date.now(),
            status: 'started',
            userId,
            metadata
        };

        this.metrics.set(executionId, metrics);
        
        console.log(`[FLOW_START] ${flowName} (${executionId})`);
        
        return executionId;
    }

    /**
     * Record successful completion of a flow
     */
    completeExecution(
        executionId: string, 
        outputData?: unknown,
        additionalMetadata?: Record<string, unknown>
    ): void {
        const metrics = this.metrics.get(executionId);
        if (!metrics) {
            console.warn(`No metrics found for execution ${executionId}`);
            return;
        }

        const endTime = Date.now();
        const updatedMetrics: FlowMetrics = {
            ...metrics,
            endTime,
            duration: endTime - metrics.startTime,
            status: 'completed',
            outputSize: outputData ? JSON.stringify(outputData).length : undefined,
            metadata: { ...metrics.metadata, ...additionalMetadata }
        };

        this.metrics.set(executionId, updatedMetrics);
        
        console.log(`[FLOW_COMPLETE] ${metrics.flowName} (${executionId}) - ${updatedMetrics.duration}ms`);
        
        // Store in Firebase for persistence (async, don't wait)
        this.persistMetrics(updatedMetrics).catch(console.error);
    }

    /**
     * Record flow execution failure
     */
    failExecution(
        executionId: string, 
        error: unknown, 
        errorType?: FlowErrorType | string,
        additionalMetadata?: Record<string, unknown>
    ): void {
        const metrics = this.metrics.get(executionId);
        if (!metrics) {
            console.warn(`No metrics found for execution ${executionId}`);
            return;
        }
        
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        const errorName = error instanceof Error ? error.constructor.name : 'UnknownError';

        const endTime = Date.now();
        const updatedMetrics: FlowMetrics = {
            ...metrics,
            endTime,
            duration: endTime - metrics.startTime,
            status: 'failed',
            errorType: errorType || errorName,
            errorMessage: errorMessage,
            metadata: { ...metrics.metadata, ...additionalMetadata }
        };

        this.metrics.set(executionId, updatedMetrics);
        
        console.error(`[FLOW_FAILED] ${metrics.flowName} (${executionId}) - ${errorMessage}`);
        
        // Store in Firebase for persistence (async, don't wait)
        this.persistMetrics(updatedMetrics).catch(console.error);
    }

    /**
     * Get analytics for a specific flow
     */
    async getFlowAnalytics(flowName: string, days = 30): Promise<FlowAnalytics> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const snapshot = await firestore
            .collection('flow_metrics')
            .where('flowName', '==', flowName)
            .where('startTime', '>=', startDate.getTime())
            .where('startTime', '<=', endDate.getTime())
            .get();

        const executions = snapshot.docs.map(doc => doc.data() as FlowMetrics);
        
        return this.calculateAnalytics(executions, days);
    }

    /**
     * Get system-wide analytics
     */
    async getSystemAnalytics(days = 30): Promise<Record<string, FlowAnalytics>> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const snapshot = await firestore
            .collection('flow_metrics')
            .where('startTime', '>=', startDate.getTime())
            .where('startTime', '<=', endDate.getTime())
            .get();

        const executions = snapshot.docs.map(doc => doc.data() as FlowMetrics);
        const grouped = this.groupExecutionsByFlow(executions);
        
        const analytics: Record<string, FlowAnalytics> = {};
        for (const [flowName, flowExecutions] of Object.entries(grouped)) {
            analytics[flowName] = this.calculateAnalytics(flowExecutions, days);
        }
        
        return analytics;
    }

    /**
     * Get real-time performance dashboard data
     */
    getRealtimeMetrics(): {
        activeExecutions: number;
        recentCompletions: FlowMetrics[];
        recentFailures: FlowMetrics[];
        averageResponseTime: number;
    } {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        const allMetrics = Array.from(this.metrics.values());

        const activeExecutions = allMetrics.filter(m => m.status === 'started').length;
        
        const recentMetrics = allMetrics.filter(m => m.startTime >= fiveMinutesAgo);
        const recentCompletions = recentMetrics.filter(m => m.status === 'completed');
        const recentFailures = recentMetrics.filter(m => m.status === 'failed');
        
        const averageResponseTime = recentCompletions.length > 0
            ? recentCompletions.reduce((sum, m) => sum + (m.duration || 0), 0) / recentCompletions.length
            : 0;

        return {
            activeExecutions,
            recentCompletions,
            recentFailures,
            averageResponseTime
        };
    }

    private generateExecutionId(flowName: string): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${flowName}_${timestamp}_${random}`;
    }

    private async persistMetrics(metrics: FlowMetrics): Promise<void> {
        if (!isFirebaseAdminInitialized) {
            console.warn("[FLOW_MONITOR] Firebase not initialized. Skipping metric persistence.");
            return;
        }
        try {
            await firestore
                .collection('flow_metrics')
                .doc(metrics.executionId)
                .set({
                    ...metrics,
                    createdAt: new Date()
                });
        } catch (error: unknown) {
            console.error('Failed to persist flow metrics:', error);
        }
    }

    private calculateAnalytics(executions: FlowMetrics[], days: number): FlowAnalytics {
        const totalExecutions = executions.length;
        const successfulExecutions = executions.filter(e => e.status === 'completed');
        const failedExecutions = executions.filter(e => e.status === 'failed');
        
        const successRate = totalExecutions > 0 
            ? (successfulExecutions.length / totalExecutions) * 100 
            : 0;

        const averageDuration = successfulExecutions.length > 0
            ? successfulExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / successfulExecutions.length
            : 0;

        const errorBreakdown: Record<string, number> = {};
        failedExecutions.forEach(e => {
            const errorType = e.errorType || 'Unknown';
            errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
        });

        const dailyMetrics = this.aggregateByDay(executions, days);

        return {
            totalExecutions,
            successRate,
            averageDuration,
            errorBreakdown,
            performanceTrends: dailyMetrics
        };
    }

    private groupExecutionsByFlow(executions: FlowMetrics[]): Record<string, FlowMetrics[]> {
        return executions.reduce((acc, execution) => {
            if (!acc[execution.flowName]) {
                acc[execution.flowName] = [];
            }
            acc[execution.flowName].push(execution);
            return acc;
        }, {} as Record<string, FlowMetrics[]>);
    }

    private aggregateByDay(executions: FlowMetrics[], days: number) {
        const dailyData: Record<string, { executions: number; totalDuration: number; errors: number; completedCount: number }> = {};
        
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dailyData[dateKey] = { executions: 0, totalDuration: 0, errors: 0, completedCount: 0 };
        }

        executions.forEach(execution => {
            const date = new Date(execution.startTime).toISOString().split('T')[0];
            if (dailyData[date]) {
                dailyData[date].executions++;
                if (execution.status === 'completed' && execution.duration) {
                    dailyData[date].totalDuration += execution.duration;
                    dailyData[date].completedCount++;
                } else if (execution.status === 'failed') {
                    dailyData[date].errors++;
                }
            }
        });

        return Object.entries(dailyData)
            .map(([date, data]) => ({
                date,
                avgDuration: data.completedCount > 0 ? data.totalDuration / data.completedCount : 0,
                executions: data.executions,
                errors: data.errors
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
}

/**
 * Decorator function to automatically monitor flow executions
 */
export function withMonitoring<T extends unknown[], R>(
    flowName: string,
    fn: (...args: T) => Promise<R>
) {
    return async (...args: T): Promise<R> => {
        const monitor = FlowMonitor.getInstance();
        const executionId = monitor.startExecution(flowName, undefined, {
            inputArgs: args.length,
            inputSize: JSON.stringify(args).length
        });

        try {
            const result = await fn(...args);
            monitor.completeExecution(executionId, result);
            return result;
        } catch (error: unknown) {
            monitor.failExecution(executionId, error);
            throw error;
        }
    };
}


/**
 * Health check endpoint data
 */
export async function getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
    timestamp: string;
}> {
    const monitor = FlowMonitor.getInstance();
    const realtimeMetrics = monitor.getRealtimeMetrics();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (realtimeMetrics.recentFailures.length > 5) {
        status = 'unhealthy';
    } else if (realtimeMetrics.recentFailures.length > 2 || realtimeMetrics.averageResponseTime > 10000) {
        status = 'degraded';
    }

    return {
        status,
        details: {
            activeExecutions: realtimeMetrics.activeExecutions,
            recentFailures: realtimeMetrics.recentFailures.length,
            averageResponseTime: Math.round(realtimeMetrics.averageResponseTime),
            uptime: typeof process !== 'undefined' ? process.uptime() : 0,
        },
        timestamp: new Date().toISOString()
    };
}
