/**
 * Self-Refine Loop Implementation
 * Iteratively improves prompts using Claude-powered self-critique and refinement
 */

import { $ } from "bun";
import type { ImprovementConfig } from "./config.js";
import { analyzePrompt, type PromptAnalysis } from "./cli.js";

export interface SelfCritiqueResult {
  score: number; // 0-10 overall quality score
  clarity: number;
  effectiveness: number;
  completeness: number;
  improvements: string[];
  concerns: string[];
  recommendation: string;
  shouldContinue: boolean; // Whether further refinement is beneficial
}

export interface RefinementIteration {
  iteration: number;
  prompt: string;
  critique: SelfCritiqueResult;
  staticAnalysis: PromptAnalysis;
  improvementsMade: string[];
  qualityGain: number;
  timeMs: number;
}

export interface SelfRefineResult {
  finalPrompt: string;
  iterations: RefinementIteration[];
  totalIterations: number;
  finalQuality: number;
  totalQualityGain: number;
  totalClaudeCalls: number;
  convergenceReason: 'quality_achieved' | 'max_iterations' | 'diminishing_returns' | 'claude_limit';
}

/**
 * Cache for Claude responses to avoid redundant API calls
 */
class RefineCache {
  private cache = new Map<string, { response: string; timestamp: number }>();
  private maxAge = 3600000; // 1 hour

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

  generateKey(prompt: string, type: 'critique' | 'improve'): string {
    return `${type}:${prompt.substring(0, 100)}`;
  }
}

const refineCache = new RefineCache();

/**
 * Call Claude CLI with error handling and caching
 */
async function callClaude(prompt: string, cacheKey?: string): Promise<string> {
  // Check cache first
  if (cacheKey) {
    const cached = refineCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const tempFile = `/tmp/self-refine-${Date.now()}.txt`;
    await Bun.write(tempFile, prompt);
    const result = await $`cat ${tempFile} | claude -p`.text();
    await $`rm -f ${tempFile}`;
    
    const trimmed = result.trim();
    
    // Cache the result
    if (cacheKey) {
      refineCache.set(cacheKey, trimmed);
    }
    
    return trimmed;
  } catch (error) {
    console.error('Claude API call failed:', error);
    throw new Error('Failed to get response from Claude CLI');
  }
}

/**
 * Get Claude's critique of a prompt
 */
async function getCritique(prompt: string): Promise<SelfCritiqueResult> {
  const cacheKey = refineCache.generateKey(prompt, 'critique');
  
  const critiquePrompt = `You are an expert prompt engineer evaluating this prompt for quality and effectiveness.

PROMPT TO EVALUATE:
${prompt}

Provide a detailed critique focusing on:
1. Overall quality score (0-10)
2. Specific metrics: clarity, effectiveness, completeness
3. What improvements are needed
4. Any remaining concerns
5. Whether further refinement would be beneficial

Respond with ONLY valid JSON in this exact format:
{
  "score": <0-10 overall score>,
  "clarity": <0-10 how clear and understandable>,
  "effectiveness": <0-10 how well it achieves goals>,
  "completeness": <0-10 how thorough and comprehensive>,
  "improvements": ["specific improvement 1", "specific improvement 2"],
  "concerns": ["remaining concern 1", "remaining concern 2"],
  "recommendation": "brief summary and next steps",
  "shouldContinue": <true/false whether further refinement is beneficial>
}

Be honest and constructive. Focus on actionable feedback.`;

  try {
    const response = await callClaude(critiquePrompt, cacheKey);
    
    // Extract JSON from markdown if needed
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1]! : response;
    
    const critique = JSON.parse(jsonStr) as SelfCritiqueResult;
    
    // Validate and sanitize the response
    if (typeof critique.score !== 'number' || critique.score < 0 || critique.score > 10) {
      critique.score = 5; // Default fallback
    }
    
    return critique;
  } catch (error) {
    console.error('Failed to parse critique response:', error);
    // Return fallback critique
    return {
      score: 6,
      clarity: 6,
      effectiveness: 6,
      completeness: 6,
      improvements: ['Could not generate detailed critique'],
      concerns: ['Critique parsing failed'],
      recommendation: 'Manual review recommended',
      shouldContinue: false
    };
  }
}

/**
 * Generate an improved version of the prompt
 */
async function improvePromptIteration(
  prompt: string, 
  critique: SelfCritiqueResult,
  iteration: number
): Promise<string> {
  const cacheKey = refineCache.generateKey(prompt, 'improve');
  
  const stage = iteration === 1 ? 'initial analysis and structure' :
                iteration === 2 ? 'enhancement and detail addition' :
                'final polish and optimization';

  const improvementPrompt = `You are an expert prompt engineer performing iterative improvement (iteration ${iteration}).

CURRENT PROMPT:
${prompt}

CRITIQUE FEEDBACK:
- Overall Score: ${critique.score}/10
- Key Improvements Needed: ${critique.improvements.join(', ')}
- Main Concerns: ${critique.concerns.join(', ')}
- Recommendation: ${critique.recommendation}

STAGE: ${stage}
Focus on ${iteration === 1 ? 'fixing structural issues and adding clarity' :
          iteration === 2 ? 'adding missing context, examples, and constraints' :
          'final optimization and polish for maximum effectiveness'}.

Create an improved version that directly addresses the critique feedback.

IMPORTANT: 
- Respond with ONLY the improved prompt text
- No explanations, no JSON, no markdown formatting
- Make significant improvements, don't just make minor tweaks
- Ensure the improved prompt is substantially better than the original

The improvement should be focused, actionable, and directly address the identified weaknesses.`;

  try {
    const response = await callClaude(improvementPrompt, cacheKey);
    return response;
  } catch (error) {
    console.error('Failed to generate improvement:', error);
    return prompt; // Return original if improvement fails
  }
}

/**
 * Check if refinement should continue based on diminishing returns
 */
function shouldContinueRefinement(
  iterations: RefinementIteration[], 
  config: ImprovementConfig
): { shouldContinue: boolean; reason: string } {
  if (iterations.length === 0) {
    return { shouldContinue: true, reason: 'no_iterations_yet' };
  }

  const latest = iterations[iterations.length - 1];
  if (!latest) {
    return { shouldContinue: true, reason: 'no_iterations_yet' };
  }
  
  // Check if target quality achieved
  if (latest.critique.score >= config.targetQuality) {
    return { shouldContinue: false, reason: 'quality_achieved' };
  }
  
  // Check max iterations
  if (iterations.length >= config.maxIterations) {
    return { shouldContinue: false, reason: 'max_iterations' };
  }
  
  // Check for diminishing returns (last 2 iterations show minimal improvement)
  if (iterations.length >= 2) {
    const prev = iterations[iterations.length - 2];
    if (prev) {
      const qualityGain = latest.critique.score - prev.critique.score;
      
      if (qualityGain < 0.3) {
        return { shouldContinue: false, reason: 'diminishing_returns' };
      }
    }
  }
  
  // Check Claude's own recommendation
  if (!latest.critique.shouldContinue) {
    return { shouldContinue: false, reason: 'claude_recommendation' };
  }
  
  return { shouldContinue: true, reason: 'continue_improving' };
}

/**
 * Main self-refine loop function
 */
export async function selfRefinePrompt(
  originalPrompt: string,
  config: ImprovementConfig
): Promise<SelfRefineResult> {
  const _startTime = Date.now();
  let currentPrompt = originalPrompt;
  let claudeCalls = 0;
  const iterations: RefinementIteration[] = [];
  
  if (config.showProgress) {
    console.log('🔄 Starting self-refine loop...');
  }
  
  // Get initial baseline analysis
  const initialAnalysis = analyzePrompt(originalPrompt);
  
  while (claudeCalls < config.maxClaudeCalls) {
    const iterationStart = Date.now();
    const iterationNum = iterations.length + 1;
    
    if (config.showProgress) {
      console.log(`🔧 Iteration ${iterationNum}/${config.maxIterations}...`);
    }
    
    // Get critique of current prompt
    const critique = await getCritique(currentPrompt);
    claudeCalls++;
    
    // Analyze current state
    const staticAnalysis = analyzePrompt(currentPrompt);
    
    // Check if we should continue
    const { shouldContinue, reason } = shouldContinueRefinement(iterations, config);
    
    // Record iteration
    const iteration: RefinementIteration = {
      iteration: iterationNum,
      prompt: currentPrompt,
      critique,
      staticAnalysis,
      improvementsMade: critique.improvements,
      qualityGain: iterations.length > 0 
        ? critique.score - iterations[iterations.length - 1]!.critique.score 
        : critique.score - initialAnalysis.qualityScores.overall,
      timeMs: Date.now() - iterationStart
    };
    
    iterations.push(iteration);
    
    if (config.showProgress) {
      console.log(`   📊 Quality: ${critique.score.toFixed(1)}/10 (+${iteration.qualityGain.toFixed(1)})`);
    }
    
    // Check stopping conditions before generating next iteration
    if (!shouldContinue || claudeCalls >= config.maxClaudeCalls - 1) {
      const finalReason = claudeCalls >= config.maxClaudeCalls - 1 ? 'claude_limit' : reason;
      
      return {
        finalPrompt: currentPrompt,
        iterations,
        totalIterations: iterations.length,
        finalQuality: critique.score,
        totalQualityGain: critique.score - initialAnalysis.qualityScores.overall,
        totalClaudeCalls: claudeCalls,
        convergenceReason: finalReason as SelfRefineResult['convergenceReason']
      };
    }
    
    // Generate improved prompt for next iteration
    const improvedPrompt = await improvePromptIteration(currentPrompt, critique, iterationNum);
    claudeCalls++;
    
    currentPrompt = improvedPrompt;
  }
  
  // Fallback if we exit without returning
  const lastIteration = iterations[iterations.length - 1];
  return {
    finalPrompt: currentPrompt,
    iterations,
    totalIterations: iterations.length,
    finalQuality: lastIteration?.critique.score || initialAnalysis.qualityScores.overall,
    totalQualityGain: (lastIteration?.critique.score || 0) - initialAnalysis.qualityScores.overall,
    totalClaudeCalls: claudeCalls,
    convergenceReason: 'claude_limit'
  };
}

/**
 * Display refinement results
 */
export function displayRefinementResults(result: SelfRefineResult, showProgress: boolean): void {
  if (!showProgress) return;
  
  console.log('\n🏁 Self-Refine Results:');
  console.log(`   Iterations: ${result.totalIterations}`);
  console.log(`   Final Quality: ${result.finalQuality.toFixed(1)}/10`);
  console.log(`   Quality Gain: +${result.totalQualityGain.toFixed(1)}`);
  console.log(`   Claude Calls: ${result.totalClaudeCalls}`);
  console.log(`   Stopped: ${result.convergenceReason.replace('_', ' ')}`);
  
  if (result.iterations.length > 0) {
    const latest = result.iterations[result.iterations.length - 1];
    if (latest && latest.critique.concerns.length > 0) {
      console.log('   ⚠️  Remaining concerns:', latest.critique.concerns.join(', '));
    }
  }
}