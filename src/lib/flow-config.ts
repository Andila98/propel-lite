/**
 * @fileOverview Configuration management system for AI flows
 */

export interface FlowConfig {
    enabled: boolean;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    rateLimitPerMinute: number;
    cacheEnabled: boolean;
    cacheTTL: number;
    aiModelConfig: {
        temperature: number;
        maxTokens: number;
        model: string;
    };
    validationEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SystemConfig {
    flows: Record<string, FlowConfig>;
    global: {
        environment: 'development' | 'staging' | 'production';
        enableMetrics: boolean;
        enableCaching: boolean;
        defaultTimeout: number;
        maxConcurrentExecutions: number;
    };
    ai: {
        defaultModel: string;
        fallbackModel: string;
        maxRetries: number;
        requestTimeout: number;
    };
    firebase: {
        enableOfflineSupport: boolean;
        cacheSize: number;
    };
}

class ConfigManager {
    private static instance: ConfigManager;
    private config: SystemConfig;
    private configCache = new Map<string, any>();
    private lastUpdate = 0;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private constructor() {
        this.config = this.getDefaultConfig();
        this.loadConfig();
    }

    static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Get configuration for a specific flow
     */
    getFlowConfig(flowName: string): FlowConfig {
        this.refreshConfigIfNeeded();
        return this.config.flows[flowName] || this.getDefaultFlowConfig();
    }

    /**
     * Get system-wide configuration
     */
    getSystemConfig(): SystemConfig {
        this.refreshConfigIfNeeded();
        return this.config;
    }

    /**
     * Update configuration (useful for runtime updates)
     */
    async updateFlowConfig(flowName: string, updates: Partial<FlowConfig>): Promise<void> {
        const currentConfig = this.getFlowConfig(flowName);
        const newConfig = { ...currentConfig, ...updates };
        
        this.config.flows[flowName] = newConfig;
        
        // In production, you'd save this to Firebase or another config store
        await this.saveConfig();
        
        // Clear cache
        this.configCache.clear();
        this.lastUpdate = Date.now();
    }

    /**
     * Check if a flow is enabled and should execute
     */
    shouldExecuteFlow(flowName: string): boolean {
        const config = this.getFlowConfig(flowName);
        return config.enabled;
    }

    /**
     * Get cached value with TTL support
     */
    getCachedValue<T>(key: string): T | null {
        const cached = this.configCache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.configCache.delete(key);
            return null;
        }
        
        return cached.value;
    }

    /**
     * Set cached value with timestamp
     */
    setCachedValue<T>(key: string, value: T): void {
        this.configCache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Get feature flags for experimental features
     */
    getFeatureFlag(flagName: string): boolean {
        this.refreshConfigIfNeeded();
        const flags = this.getCachedValue<Record<string, boolean>>('feature_flags') || {};
        return flags[flagName] || false;
    }

    private getDefaultConfig(): SystemConfig {
        return {
            flows: {
                generateReport: this.getDefaultFlowConfig(),
                predictPayment: {
                    ...this.getDefaultFlowConfig(),
                    aiModelConfig: {
                        temperature: 0.1, // Lower temperature for predictions
                        maxTokens: 500,
                        model: 'gemini-pro'
                    }
                },
                generateReceipt: this.getDefaultFlowConfig(),
                analyzeDamage: {
                    ...this.getDefaultFlowConfig(),
                    aiModelConfig: {
                        temperature: 0.2,
                        maxTokens: 800,
                        model: 'gemini-pro-vision'
                    },
                    timeout: 30000 // Longer timeout for vision tasks
                },
                generateInvoice: this.getDefaultFlowConfig(),
                generateMessage: this.getDefaultFlowConfig(),
                prioritizeMaintenance: {
                    ...this.getDefaultFlowConfig(),
                    aiModelConfig: {
                        temperature: 0.0, // Very deterministic for priority assignment
                        maxTokens: 200,
                        model: 'gemini-pro'
                    }
                },
                suggestPrice: {
                    ...this.getDefaultFlowConfig(),
                    aiModelConfig: {
                        temperature: 0.3,
                        maxTokens: 600,
                        model: 'gemini-pro'
                    }
                },
                generateDashboardInsights: this.getDefaultFlowConfig()
            },
            global: {
                environment: (process.env.NODE_ENV as any) || 'development',
                enableMetrics: true,
                enableCaching: true,
                defaultTimeout: 15000,
                maxConcurrentExecutions: 10
            },
            ai: {
                defaultModel: 'gemini-pro',
                fallbackModel: 'gemini-pro',
                maxRetries: 2,
                requestTimeout: 30000
            },
            firebase: {
                enableOfflineSupport: false,
                cacheSize: 100 * 1024 * 1024 // 100MB
            }
        };
    }

    private getDefaultFlowConfig(): FlowConfig {
        return {
            enabled: true,
            timeout: 15000,
            retryAttempts: 2,
            retryDelay: 1000,
            rateLimitPerMinute: 60,
            cacheEnabled: true,
            cacheTTL: 300000, // 5 minutes
            aiModelConfig: {
                temperature: 0.7,
                maxTokens: 1000,
                model: 'gemini-pro'
            },
            validationEnabled: true,
            loggingLevel: 'info'
        };
    }

    private async loadConfig(): Promise<void> {
        try {
            // In production, load from Firebase or config service
            const envConfig = this.loadFromEnvironment();
            this.config = { ...this.config, ...envConfig };
            
            // Load feature flags
            const featureFlags = await this.loadFeatureFlags();
            this.setCachedValue('feature_flags', featureFlags);

            this.lastUpdate = Date.now();
            
        } catch (error) {
            console.warn('Failed to load configuration, using defaults:', error);
        }
    }

    private loadFromEnvironment(): Partial<SystemConfig> {
        const envConfig: Partial<SystemConfig> = {};

        // Load from environment variables
        if (process.env.FLOW_TIMEOUT) {
            envConfig.global = {
                ...this.config.global,
                defaultTimeout: parseInt(process.env.FLOW_TIMEOUT)
            };
        }

        if (process.env.AI_MODEL) {
            envConfig.ai = {
                ...this.config.ai,
                defaultModel: process.env.AI_MODEL
            };
        }

        return envConfig;
    }

    private async loadFeatureFlags(): Promise<Record<string, boolean>> {
        // In production, this would load from a feature flag service
        return {
            enableAdvancedAnalytics: this.config.global.environment === 'production',
            enableExperimentalPredictions: this.config.global.environment !== 'production',
            enableRealTimeUpdates: true,
            enableBetaFeatures: this.config.global.environment === 'development'
        };
    }

    private async saveConfig(): Promise<void> {
        try {
            // In production, save to persistent storage
            if (this.config.global.environment !== 'development') {
                // await firestore.collection('config').doc('system').set(this.config);
            }
        } catch (error) {
            console.error('Failed to save configuration:', error);
        }
    }

    private refreshConfigIfNeeded(): void {
        const now = Date.now();
        if (now - this.lastUpdate > this.CACHE_TTL) {
            console.log("[CONFIG_MANAGER] Refreshing stale configuration...");
            this.loadConfig();
        }
    }
}

// Export singleton instance and helper objects
const configManager = ConfigManager.getInstance();

export const config = {
    getFlow: (flowName: string) => configManager.getFlowConfig(flowName),
    getSystem: () => configManager.getSystemConfig(),
    shouldExecute: (flowName: string) => configManager.shouldExecuteFlow(flowName),
};

export const FeatureFlags = {
    isEnabled: (flagName: string) => configManager.getFeatureFlag(flagName),
};

export const BUSINESS_CONFIG = {
    highPriorityKeywords: ['fire', 'leak', 'gas', 'electrical', 'security', 'lock', 'broken window', 'no heat', 'no water'],
    satisfactionThreshold: 7,
    propertyAgeThreshold: 15,
    occupancyRateThreshold: 85, // Default threshold for flagging low occupancy
} as const;
