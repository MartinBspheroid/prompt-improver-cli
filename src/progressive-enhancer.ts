/**
 * Progressive Enhancement Pipeline
 * Applies improvements in systematic layers: Structure → Context → Examples → Constraints → Success Criteria
 */

import { $ } from "bun";
import type { ImprovementConfig } from "./config.js";
import type { PromptAnalysis } from "./cli.js";
import type { DynamicAnalysisResult } from "./dynamic-analysis.js";

export interface EnhancementLayer {
  name: string;
  description: string;
  priority: number; // 1-5, where 1 is highest priority
  apply: (prompt: string, context: EnhancementContext) => Promise<string>;
  validate: (before: string, after: string, context: EnhancementContext) => boolean;
  skipConditions: string[]; // Conditions under which to skip this layer
}

export interface EnhancementContext {
  originalPrompt: string;
  staticAnalysis: PromptAnalysis;
  dynamicAnalysis: DynamicAnalysisResult | undefined;
  config: ImprovementConfig;
  previousLayers: string[]; // Names of layers already applied
  domainSpecific: boolean;
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  iterationCount: number;
}

export interface EnhancementResult {
  layerName: string;
  originalPrompt: string;
  enhancedPrompt: string;
  improvements: string[];
  validationPassed: boolean;
  timeMs: number;
  skipped: boolean;
  skipReason: string | undefined;
}

export interface ProgressiveEnhancementResult {
  finalPrompt: string;
  layerResults: EnhancementResult[];
  totalLayers: number;
  appliedLayers: number;
  skippedLayers: number;
  totalTimeMs: number;
  overallImprovement: number;
  claudeCalls: number;
}

/**
 * Cache for enhancement layer responses
 */
class EnhancementCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private maxAge = 2700000; // 45 minutes

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.maxAge) {
      return entry.response;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, response: string): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  generateKey(layerName: string, prompt: string, context: EnhancementContext): string {
    const contextKey = `${context.expertiseLevel}_${context.domainSpecific}_${context.iterationCount}`;
    return `${layerName}:${contextKey}:${prompt.substring(0, 50)}`;
  }
}

const enhancementCache = new EnhancementCache();

/**
 * Call Claude for layer enhancement
 */
async function callClaudeForLayer(prompt: string, cacheKey?: string): Promise<string> {
  // Check cache first
  if (cacheKey) {
    const cached = enhancementCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const tempFile = `/tmp/progressive-enhance-${Date.now()}.txt`;
    await Bun.write(tempFile, prompt);
    const result = await $`cat ${tempFile} | claude -p`.text();
    await $`rm -f ${tempFile}`;
    
    const trimmed = result.trim();
    
    // Cache the result
    if (cacheKey) {
      enhancementCache.set(cacheKey, trimmed);
    }
    
    return trimmed;
  } catch (error) {
    console.error('Claude enhancement layer call failed:', error);
    throw new Error('Failed to get enhancement from Claude CLI');
  }
}

/**
 * Layer 1: Structure & Clarity Enhancement
 */
const structureLayer: EnhancementLayer = {
  name: 'Structure & Clarity',
  description: 'Add clear structure, organization, and logical flow',
  priority: 1,
  skipConditions: ['already_structured', 'very_short_prompt'],
  
  async apply(prompt: string, context: EnhancementContext): Promise<string> {
    const cacheKey = enhancementCache.generateKey('structure', prompt, context);
    
    const enhancementPrompt = `You are a prompt engineer focusing on STRUCTURE AND CLARITY. Enhance this prompt by adding clear organization and logical flow.

CURRENT PROMPT:
${prompt}

ENHANCEMENT GOALS:
- Add clear structure using headers, bullet points, or numbered steps
- Improve logical flow and organization
- Enhance readability without changing the core request
- Make the structure appropriate for ${context.expertiseLevel} level users

CONTEXT:
- Domain: ${context.dynamicAnalysis?.detectedDomain || 'general'}
- User expertise: ${context.expertiseLevel}
- Task type: ${context.staticAnalysis.taskType}

IMPORTANT:
- Keep the original intent and content
- Only improve structure and clarity
- Don't add new requirements or change scope
- Use markdown formatting for structure
- Return ONLY the improved prompt text

Focus on making the prompt well-organized and easy to follow.`;

    return await callClaudeForLayer(enhancementPrompt, cacheKey);
  },

  validate(before: string, after: string): boolean {
    // Check if structure was actually improved
    const beforeLines = before.split('\n').length;
    const afterLines = after.split('\n').length;
    const hasHeaders = after.includes('#') || after.includes('##');
    const hasBullets = after.includes('- ') || after.includes('* ');
    const hasNumbers = /\d+\.\s/.test(after);
    
    return (afterLines > beforeLines || hasHeaders || hasBullets || hasNumbers) && 
           after.length > before.length * 1.1 && // At least 10% longer
           after.length < before.length * 2.5;   // Not more than 250% longer
  }
};

/**
 * Layer 2: Context & Background Enhancement
 */
const contextLayer: EnhancementLayer = {
  name: 'Context & Background',
  description: 'Add relevant context, background information, and domain-specific details',
  priority: 2,
  skipConditions: ['context_rich', 'very_long_prompt'],
  
  async apply(prompt: string, context: EnhancementContext): Promise<string> {
    const cacheKey = enhancementCache.generateKey('context', prompt, context);
    
    const domainContext = context.dynamicAnalysis?.detectedDomain 
      ? `This is a ${context.dynamicAnalysis.detectedDomain} prompt. Add relevant domain-specific context.`
      : 'Add general context that would be helpful.';
    
    const enhancementPrompt = `You are a prompt engineer focusing on CONTEXT AND BACKGROUND. Add relevant contextual information to this prompt.

CURRENT PROMPT:
${prompt}

ENHANCEMENT GOALS:
- Add relevant background information and context
- Include domain-specific details and considerations
- Provide necessary setup or prerequisite information
- Add constraints and parameters that would improve results

CONTEXT GUIDANCE:
${domainContext}
- User expertise: ${context.expertiseLevel}
- Key missing context gaps: ${context.dynamicAnalysis?.contextGaps?.slice(0, 3).join(', ') || 'general context'}

IMPORTANT:
- Build on the existing structure
- Add context that genuinely helps the task
- Don't add unnecessary fluff or obvious information
- Keep additions relevant and valuable
- Return ONLY the enhanced prompt text

Focus on adding context that will lead to better, more accurate results.`;

    return await callClaudeForLayer(enhancementPrompt, cacheKey);
  },

  validate(before: string, after: string, _context: EnhancementContext): boolean {
    const lengthIncrease = after.length / before.length;
    const hasContextWords = ['context', 'background', 'consider', 'given', 'assume', 'requirements'].some(
      word => after.toLowerCase().includes(word) && !before.toLowerCase().includes(word)
    );
    
    return lengthIncrease >= 1.2 && lengthIncrease <= 3.0 && hasContextWords;
  }
};

/**
 * Layer 3: Examples & Patterns Enhancement
 */
const examplesLayer: EnhancementLayer = {
  name: 'Examples & Patterns',
  description: 'Add relevant examples, templates, and pattern demonstrations',
  priority: 3,
  skipConditions: ['example_rich', 'simple_task'],
  
  async apply(prompt: string, context: EnhancementContext): Promise<string> {
    const cacheKey = enhancementCache.generateKey('examples', prompt, context);
    
    const patternGuidance = context.dynamicAnalysis?.suggestedPatterns?.length 
      ? `Apply these patterns: ${context.dynamicAnalysis.suggestedPatterns.slice(0, 2).join(', ')}`
      : 'Add helpful examples and demonstrations';
    
    const enhancementPrompt = `You are a prompt engineer focusing on EXAMPLES AND PATTERNS. Add relevant examples and pattern demonstrations to this prompt.

CURRENT PROMPT:
${prompt}

ENHANCEMENT GOALS:
- Add 1-2 relevant examples that illustrate the expected output
- Include templates or patterns where appropriate
- Show specific formats or structures
- Demonstrate good vs. poor results where helpful

PATTERN GUIDANCE:
${patternGuidance}
- Task type: ${context.staticAnalysis.taskType}
- Domain: ${context.dynamicAnalysis?.detectedDomain || 'general'}

IMPORTANT:
- Build on the existing content and structure
- Add examples that genuinely help clarify expectations
- Use realistic, practical examples
- Don't add examples that are too obvious or simple
- Return ONLY the enhanced prompt text

Focus on examples that reduce ambiguity and improve result quality.`;

    return await callClaudeForLayer(enhancementPrompt, cacheKey);
  },

  validate(before: string, after: string): boolean {
    const hasExamples = after.toLowerCase().includes('example') || 
                       after.includes('e.g.') || 
                       after.includes('for instance') ||
                       after.includes('```') ||
                       after.includes('such as');
    
    const lengthIncrease = after.length / before.length;
    
    return hasExamples && lengthIncrease >= 1.15 && lengthIncrease <= 2.5;
  }
};

/**
 * Layer 4: Constraints & Requirements Enhancement
 */
const constraintsLayer: EnhancementLayer = {
  name: 'Constraints & Requirements',
  description: 'Add specific constraints, requirements, and edge case handling',
  priority: 4,
  skipConditions: ['constraint_heavy', 'creative_task'],
  
  async apply(prompt: string, context: EnhancementContext): Promise<string> {
    const cacheKey = enhancementCache.generateKey('constraints', prompt, context);
    
    const edgeCases = context.dynamicAnalysis?.overlookedEdgeCases?.length
      ? `Address these edge cases: ${context.dynamicAnalysis.overlookedEdgeCases.slice(0, 2).join(', ')}`
      : 'Add relevant constraints and requirements';
    
    const enhancementPrompt = `You are a prompt engineer focusing on CONSTRAINTS AND REQUIREMENTS. Add specific constraints, requirements, and edge case handling.

CURRENT PROMPT:
${prompt}

ENHANCEMENT GOALS:
- Add specific constraints and requirements
- Include edge case handling and error conditions
- Specify limits, boundaries, and restrictions
- Add quality and format requirements

CONSTRAINT GUIDANCE:
${edgeCases}
- User expertise: ${context.expertiseLevel}
- Domain considerations: ${context.dynamicAnalysis?.domainSpecificIssues?.slice(0, 2).join(', ') || 'standard requirements'}

IMPORTANT:
- Build on the existing structure and content
- Add constraints that prevent common problems
- Be specific about what NOT to do when relevant
- Include performance, quality, or format requirements
- Return ONLY the enhanced prompt text

Focus on constraints that lead to more reliable, predictable results.`;

    return await callClaudeForLayer(enhancementPrompt, cacheKey);
  },

  validate(before: string, after: string): boolean {
    const constraintWords = ['must', 'should', 'required', 'constraint', 'limit', 'not', 'avoid', 'ensure', 'requirement'];
    const hasConstraints = constraintWords.some(word => 
      after.toLowerCase().split(word).length > before.toLowerCase().split(word).length
    );
    
    const lengthIncrease = after.length / before.length;
    
    return hasConstraints && lengthIncrease >= 1.1 && lengthIncrease <= 2.0;
  }
};

/**
 * Layer 5: Success Criteria & Validation Enhancement
 */
const successCriteriaLayer: EnhancementLayer = {
  name: 'Success Criteria & Validation',
  description: 'Add clear success criteria and validation methods',
  priority: 5,
  skipConditions: ['criteria_defined', 'simple_output'],
  
  async apply(prompt: string, context: EnhancementContext): Promise<string> {
    const cacheKey = enhancementCache.generateKey('success', prompt, context);
    
    const successCriteria = context.dynamicAnalysis?.missingSuccessCriteria?.length
      ? `Define success criteria for: ${context.dynamicAnalysis.missingSuccessCriteria.slice(0, 2).join(', ')}`
      : 'Add clear success criteria and quality measures';
    
    const enhancementPrompt = `You are a prompt engineer focusing on SUCCESS CRITERIA AND VALIDATION. Add clear success criteria and validation methods.

CURRENT PROMPT:
${prompt}

ENHANCEMENT GOALS:
- Define what success looks like for this task
- Add quality criteria and evaluation methods
- Include validation steps or checkpoints
- Specify how to measure or assess the output

SUCCESS CRITERIA GUIDANCE:
${successCriteria}
- Task type: ${context.staticAnalysis.taskType}
- Expected quality level: ${context.config.targetQuality}/10

IMPORTANT:
- Build on all previous enhancements
- Add criteria that are measurable and clear
- Include both qualitative and quantitative measures where appropriate
- Don't add criteria that are impossible to verify
- Return ONLY the enhanced prompt text

Focus on success criteria that ensure the output meets the intended goals.`;

    return await callClaudeForLayer(enhancementPrompt, cacheKey);
  },

  validate(before: string, after: string): boolean {
    const criteriaWords = ['success', 'criteria', 'measure', 'evaluate', 'assess', 'quality', 'validate', 'check'];
    const hasCriteria = criteriaWords.some(word => 
      after.toLowerCase().includes(word) && 
      !before.toLowerCase().includes(word)
    );
    
    const lengthIncrease = after.length / before.length;
    
    return hasCriteria && lengthIncrease >= 1.05 && lengthIncrease <= 1.5;
  }
};

/**
 * Progressive Enhancement Pipeline
 */
export class ProgressiveEnhancer {
  private layers: EnhancementLayer[] = [
    structureLayer,
    contextLayer,
    examplesLayer,
    constraintsLayer,
    successCriteriaLayer
  ];

  /**
   * Apply progressive enhancement to a prompt
   */
  async enhance(
    prompt: string,
    staticAnalysis: PromptAnalysis,
    dynamicAnalysis: DynamicAnalysisResult | undefined,
    config: ImprovementConfig
  ): Promise<ProgressiveEnhancementResult> {
    const startTime = Date.now();
    let currentPrompt = prompt;
    const layerResults: EnhancementResult[] = [];
    let claudeCalls = 0;

    // Create enhancement context
    const context: EnhancementContext = {
      originalPrompt: prompt,
      staticAnalysis,
      dynamicAnalysis,
      config,
      previousLayers: [],
      domainSpecific: dynamicAnalysis?.domainConfidence ? dynamicAnalysis.domainConfidence > 0.7 : false,
      expertiseLevel: dynamicAnalysis?.expertiseLevel || 'intermediate',
      iterationCount: 1
    };

    if (config.showProgress) {
      console.log('🔧 Starting progressive enhancement pipeline...');
    }

    // Apply each layer in sequence
    for (const layer of this.layers) {
      if (claudeCalls >= config.maxClaudeCalls - 1) {
        // Skip remaining layers if we're approaching the Claude call limit
        const skippedResult: EnhancementResult = {
          layerName: layer.name,
          originalPrompt: currentPrompt,
          enhancedPrompt: currentPrompt,
          improvements: [],
          validationPassed: false,
          timeMs: 0,
          skipped: true,
          skipReason: 'claude_call_limit'
        };
        layerResults.push(skippedResult);
        continue;
      }

      const layerStart = Date.now();
      
      if (config.showProgress) {
        console.log(`   🔧 Applying ${layer.name}...`);
      }

      // Check skip conditions
      const shouldSkip = this.shouldSkipLayer(layer, currentPrompt, context);
      if (shouldSkip.skip) {
        const skippedResult: EnhancementResult = {
          layerName: layer.name,
          originalPrompt: currentPrompt,
          enhancedPrompt: currentPrompt,
          improvements: [],
          validationPassed: false,
          timeMs: Date.now() - layerStart,
          skipped: true,
          skipReason: shouldSkip.reason
        };
        layerResults.push(skippedResult);
        continue;
      }

      try {
        // Apply the layer
        const enhanced = await layer.apply(currentPrompt, context);
        claudeCalls++;

        // Validate the enhancement
        const validationPassed = layer.validate(currentPrompt, enhanced, context);

        const result: EnhancementResult = {
          layerName: layer.name,
          originalPrompt: currentPrompt,
          enhancedPrompt: enhanced,
          improvements: this.extractImprovements(currentPrompt, enhanced),
          validationPassed,
          timeMs: Date.now() - layerStart,
          skipped: false,
          skipReason: undefined
        };

        layerResults.push(result);

        // Update current prompt if validation passed
        if (validationPassed) {
          currentPrompt = enhanced;
          context.previousLayers.push(layer.name);
          
          if (config.showProgress) {
            console.log(`      ✅ Applied successfully (${result.improvements.length} improvements)`);
          }
        } else {
          if (config.showProgress) {
            console.log(`      ⚠️ Validation failed, keeping previous version`);
          }
        }

      } catch (error) {
        console.error(`Layer ${layer.name} failed:`, error);
        
        const failedResult: EnhancementResult = {
          layerName: layer.name,
          originalPrompt: currentPrompt,
          enhancedPrompt: currentPrompt,
          improvements: [],
          validationPassed: false,
          timeMs: Date.now() - layerStart,
          skipped: true,
          skipReason: 'layer_failed'
        };
        layerResults.push(failedResult);
      }
    }

    const totalTime = Date.now() - startTime;
    const appliedLayers = layerResults.filter(r => !r.skipped && r.validationPassed).length;
    const skippedLayers = layerResults.filter(r => r.skipped).length;

    return {
      finalPrompt: currentPrompt,
      layerResults,
      totalLayers: this.layers.length,
      appliedLayers,
      skippedLayers,
      totalTimeMs: totalTime,
      overallImprovement: this.calculateOverallImprovement(prompt, currentPrompt),
      claudeCalls
    };
  }

  /**
   * Check if a layer should be skipped
   */
  private shouldSkipLayer(
    layer: EnhancementLayer, 
    prompt: string, 
    _context: EnhancementContext
  ): { skip: boolean; reason?: string } {
    // Check general skip conditions
    if (layer.skipConditions.includes('very_short_prompt') && prompt.length < 50) {
      return { skip: true, reason: 'prompt_too_short' };
    }
    
    if (layer.skipConditions.includes('very_long_prompt') && prompt.length > 2000) {
      return { skip: true, reason: 'prompt_too_long' };
    }
    
    if (layer.skipConditions.includes('already_structured') && 
        (prompt.includes('#') || prompt.includes('- ') || prompt.includes('1.'))) {
      return { skip: true, reason: 'already_has_structure' };
    }
    
    if (layer.skipConditions.includes('example_rich') && 
        (prompt.toLowerCase().includes('example') || prompt.includes('e.g.'))) {
      return { skip: true, reason: 'already_has_examples' };
    }
    
    if (layer.skipConditions.includes('constraint_heavy') && 
        (prompt.includes('must') || prompt.includes('required'))) {
      return { skip: true, reason: 'already_has_constraints' };
    }

    return { skip: false };
  }

  /**
   * Extract improvements made by comparing before and after
   */
  private extractImprovements(before: string, after: string): string[] {
    const improvements: string[] = [];
    
    // Check for structural improvements
    if (after.includes('#') && !before.includes('#')) {
      improvements.push('Added headers and structure');
    }
    
    if ((after.includes('- ') || after.includes('* ')) && 
        !(before.includes('- ') || before.includes('* '))) {
      improvements.push('Added bullet points');
    }
    
    if (after.includes('example') && !before.includes('example')) {
      improvements.push('Added examples');
    }
    
    if (after.includes('```') && !before.includes('```')) {
      improvements.push('Added code blocks or templates');
    }
    
    const lengthIncrease = (after.length - before.length) / before.length;
    if (lengthIncrease > 0.2) {
      improvements.push(`Expanded content by ${(lengthIncrease * 100).toFixed(0)}%`);
    }
    
    return improvements;
  }

  /**
   * Calculate overall improvement score
   */
  private calculateOverallImprovement(original: string, final: string): number {
    const lengthRatio = final.length / original.length;
    const structureBonus = final.includes('#') || final.includes('- ') ? 0.5 : 0;
    const exampleBonus = final.includes('example') || final.includes('```') ? 0.3 : 0;
    
    return Math.min(lengthRatio + structureBonus + exampleBonus, 3.0);
  }
}

/**
 * Display progressive enhancement results
 */
export function displayProgressiveResults(result: ProgressiveEnhancementResult, showProgress: boolean): void {
  if (!showProgress) return;

  console.log('\n🏗️ Progressive Enhancement Results:');
  console.log(`   Applied Layers: ${result.appliedLayers}/${result.totalLayers}`);
  console.log(`   Skipped Layers: ${result.skippedLayers}`);
  console.log(`   Overall Improvement: ${result.overallImprovement.toFixed(1)}x`);
  console.log(`   Claude Calls Used: ${result.claudeCalls}`);
  console.log(`   Total Time: ${result.totalTimeMs}ms`);
  
  // Show layer results
  result.layerResults.forEach(layer => {
    const status = layer.skipped ? '⏭️ SKIPPED' : 
                   layer.validationPassed ? '✅ APPLIED' : '❌ FAILED';
    const reason = layer.skipped ? ` (${layer.skipReason})` : '';
    
    console.log(`   ${status} ${layer.layerName}${reason}`);
    if (!layer.skipped && layer.improvements.length > 0) {
      layer.improvements.forEach(imp => console.log(`      • ${imp}`));
    }
  });
}