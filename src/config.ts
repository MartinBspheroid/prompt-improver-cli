/**
 * Configuration system for Prompt Improver CLI
 * Supports multiple modes with different quality/speed tradeoffs
 */

export type ImprovementMode = 'fast' | 'balanced' | 'thorough' | 'research';

export interface ImprovementConfig {
  mode: ImprovementMode;
  targetQuality: number;
  maxIterations: number;
  enableSelfRefine: boolean;
  showProgress: boolean;
  maxClaudeCalls: number;
  features: {
    staticAnalysis: boolean;
    dynamicAnalysis: boolean;
    patternDetection: boolean;
    frameworkRecommendation: boolean;
    selfCritique: boolean;
    variantGeneration?: boolean;
    domainOptimization?: boolean;
    edgeCaseAnalysis?: boolean;
    multiStageRefinement?: boolean;
    comprehensivePatternAnalysis?: boolean;
    crossDomainOptimization?: boolean;
    academicFrameworks?: boolean;
    citationGeneration?: boolean;
  };
}

export interface DomainProfile {
  prioritizePatterns: string[];
  frameworks: string[];
  qualityWeights: {
    accuracy: number;
    clarity: number;
    thoroughness: number;
    conciseness: number;
    creativity?: number;
    actionability?: number;
    citations?: number;
    objectivity?: number;
  };
}

export interface FullConfiguration {
  defaults: ImprovementConfig;
  modes: Record<ImprovementMode, ImprovementConfig>;
  domainProfiles: Record<string, DomainProfile>;
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'fifo';
  };
  output: {
    format: 'markdown' | 'plain' | 'json';
    includeAnalysis: boolean;
    includeDiff: boolean;
    includeMetrics: boolean;
    saveHistory: boolean;
    historyPath: string;
  };
  claudeApi: {
    timeout: number;
    retries: number;
    retryDelay: number;
    costTracking: boolean;
    monthlyBudget: number;
  };
}

// Default configuration based on tada/config.json
const DEFAULT_CONFIG: FullConfiguration = {
  defaults: {
    mode: 'balanced',
    targetQuality: 8.5,
    maxIterations: 3,
    enableSelfRefine: true,
    showProgress: true,
    maxClaudeCalls: 5,
    features: {
      staticAnalysis: true,
      dynamicAnalysis: true,
      patternDetection: true,
      frameworkRecommendation: true,
      selfCritique: true,
      variantGeneration: false
    }
  },
  
  modes: {
    fast: {
      mode: 'fast',
      targetQuality: 7.0,
      maxIterations: 1,
      enableSelfRefine: false,
      showProgress: false,
      maxClaudeCalls: 2,
      features: {
        staticAnalysis: true,
        dynamicAnalysis: false,
        patternDetection: true,
        frameworkRecommendation: true,
        selfCritique: false
      }
    },
    
    balanced: {
      mode: 'balanced',
      targetQuality: 8.5,
      maxIterations: 3,
      enableSelfRefine: true,
      showProgress: true,
      maxClaudeCalls: 5,
      features: {
        staticAnalysis: true,
        dynamicAnalysis: true,
        patternDetection: true,
        frameworkRecommendation: true,
        selfCritique: true,
        variantGeneration: false
      }
    },
    
    thorough: {
      mode: 'thorough',
      targetQuality: 9.0,
      maxIterations: 5,
      enableSelfRefine: true,
      showProgress: true,
      maxClaudeCalls: 10,
      features: {
        staticAnalysis: true,
        dynamicAnalysis: true,
        patternDetection: true,
        frameworkRecommendation: true,
        selfCritique: true,
        variantGeneration: true,
        domainOptimization: true,
        edgeCaseAnalysis: true,
        multiStageRefinement: true
      }
    },
    
    research: {
      mode: 'research',
      targetQuality: 9.5,
      maxIterations: 7,
      enableSelfRefine: true,
      showProgress: true,
      maxClaudeCalls: 15,
      features: {
        staticAnalysis: true,
        dynamicAnalysis: true,
        multiStageRefinement: true,
        comprehensivePatternAnalysis: true,
        crossDomainOptimization: true,
        academicFrameworks: true,
        citationGeneration: true,
        patternDetection: true,
        frameworkRecommendation: true,
        selfCritique: true
      }
    }
  },
  
  domainProfiles: {
    technical: {
      prioritizePatterns: ['structured-output', 'error-handling', 'edge-cases'],
      frameworks: ['SOLID', 'DRY', 'KISS'],
      qualityWeights: {
        accuracy: 1.2,
        clarity: 1.1,
        thoroughness: 1.3,
        conciseness: 0.9
      }
    },
    
    creative: {
      prioritizePatterns: ['role-assignment', 'few-shot', 'emotion-prompting'],
      frameworks: ['CARE', 'narrative-arc', 'show-dont-tell'],
      qualityWeights: {
        accuracy: 0.8,
        clarity: 1.0,
        thoroughness: 0.9,
        creativity: 1.5,
        conciseness: 0.8
      }
    },
    
    business: {
      prioritizePatterns: ['goal-oriented', 'metrics-driven', 'stakeholder-aware'],
      frameworks: ['SMART', 'OKR', 'SWOT'],
      qualityWeights: {
        accuracy: 1.1,
        clarity: 1.2,
        conciseness: 1.3,
        actionability: 1.4,
        thoroughness: 1.0
      }
    },
    
    academic: {
      prioritizePatterns: ['evidence-based', 'systematic', 'peer-review'],
      frameworks: ['hypothesis-driven', 'literature-review', 'methodology'],
      qualityWeights: {
        accuracy: 1.5,
        thoroughness: 1.4,
        citations: 1.3,
        objectivity: 1.2,
        clarity: 1.0,
        conciseness: 0.8
      }
    }
  },
  
  cache: {
    enabled: true,
    ttl: 3600,
    maxSize: 100,
    strategy: 'lru'
  },
  
  output: {
    format: 'markdown',
    includeAnalysis: true,
    includeDiff: true,
    includeMetrics: true,
    saveHistory: true,
    historyPath: '~/.prompt-improver/history'
  },
  
  claudeApi: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    costTracking: true,
    monthlyBudget: 50.00
  }
};

/**
 * Get configuration for a specific mode with overrides
 */
export function getConfig(
  mode: ImprovementMode = 'balanced',
  overrides: Partial<ImprovementConfig> = {}
): ImprovementConfig {
  const modeConfig = DEFAULT_CONFIG.modes[mode];
  
  return {
    ...modeConfig,
    ...overrides,
    features: {
      ...modeConfig.features,
      ...overrides.features
    }
  };
}

/**
 * Get domain profile for domain-specific optimizations
 */
export function getDomainProfile(domain: string): DomainProfile | null {
  return DEFAULT_CONFIG.domainProfiles[domain] || null;
}

/**
 * Get full configuration with all settings
 */
export function getFullConfig(): FullConfiguration {
  return DEFAULT_CONFIG;
}

/**
 * Validate configuration values
 */
export function validateConfig(config: Partial<ImprovementConfig>): string[] {
  const errors: string[] = [];
  
  if (config.targetQuality !== undefined) {
    if (config.targetQuality < 0 || config.targetQuality > 10) {
      errors.push('targetQuality must be between 0 and 10');
    }
  }
  
  if (config.maxIterations !== undefined) {
    if (config.maxIterations < 1 || config.maxIterations > 10) {
      errors.push('maxIterations must be between 1 and 10');
    }
  }
  
  if (config.maxClaudeCalls !== undefined) {
    if (config.maxClaudeCalls < 1 || config.maxClaudeCalls > 50) {
      errors.push('maxClaudeCalls must be between 1 and 50');
    }
  }
  
  return errors;
}

export { DEFAULT_CONFIG };