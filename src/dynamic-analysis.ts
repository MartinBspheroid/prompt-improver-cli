/**
 * Dynamic Analysis Engine
 * Uses Claude to provide context-specific insights that static analysis cannot detect
 */

import { $ } from "bun";
import type { PromptAnalysis } from "./cli.js";

export interface DynamicAnalysisResult {
  domainSpecificIssues: string[];
  implicitAssumptions: string[];
  missingSuccessCriteria: string[];
  overlookedEdgeCases: string[];
  contextGaps: string[];
  improvementPotential: 'low' | 'medium' | 'high' | 'critical';
  domainConfidence: number; // 0-1: How confident we are about domain detection  
  detectedDomain: string;
  suggestedPatterns: string[];
  culturalSensitivity: string[];
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface HybridAnalysis {
  static: PromptAnalysis;
  dynamic: DynamicAnalysisResult;
  synthesized: {
    primaryIssues: string[];
    prioritizedImprovements: string[];
    estimatedQualityGain: number;
    confidenceScore: number;
    recommendedApproach: string;
    nextSteps: string[];
  };
}

/**
 * Cache for dynamic analysis responses
 */
class DynamicAnalysisCache {
  private cache = new Map<string, { response: DynamicAnalysisResult; timestamp: number }>();
  private maxAge = 1800000; // 30 minutes (shorter than refine cache)

  get(key: string): DynamicAnalysisResult | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.maxAge) {
      return entry.response;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, response: DynamicAnalysisResult): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  generateKey(prompt: string): string {
    // Create a stable key from prompt characteristics
    const words = prompt.toLowerCase().trim().split(/\s+/).slice(0, 20);
    return `dynamic:${words.join('_')}:${prompt.length}`;
  }
}

const dynamicCache = new DynamicAnalysisCache();

/**
 * Call Claude for dynamic analysis with error handling
 */
async function callClaudeForAnalysis(prompt: string): Promise<string> {
  try {
    const tempFile = `/tmp/dynamic-analysis-${Date.now()}.txt`;
    await Bun.write(tempFile, prompt);
    const result = await $`cat ${tempFile} | claude -p`.text();
    await $`rm -f ${tempFile}`;
    return result.trim();
  } catch (error) {
    console.error('Claude dynamic analysis failed:', error);
    throw new Error('Failed to get dynamic analysis from Claude CLI');
  }
}

/**
 * Run comprehensive dynamic analysis using Claude
 */
export async function runDynamicAnalysis(prompt: string): Promise<DynamicAnalysisResult> {
  const cacheKey = dynamicCache.generateKey(prompt);
  
  // Check cache first
  const cached = dynamicCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const analysisPrompt = `You are an expert prompt analyst with deep knowledge of AI systems, prompt engineering, and domain-specific requirements. Analyze this prompt for contextual weaknesses that generic static analysis would miss.

PROMPT TO ANALYZE:
${prompt}

Provide comprehensive analysis focusing on:

1. **Domain Detection**: What specific domain/field is this prompt targeting?
2. **Domain-Specific Issues**: What issues are unique to this domain that static analysis can't detect?
3. **Implicit Assumptions**: What assumptions does the prompt make that should be explicit?
4. **Missing Success Criteria**: What would "success" look like for this specific task?
5. **Overlooked Edge Cases**: What edge cases specific to this domain are not addressed?
6. **Context Gaps**: What missing context would dramatically improve results?
7. **Suggested Patterns**: What prompt engineering patterns would be most effective here?
8. **Cultural Sensitivity**: Any cultural, bias, or inclusivity considerations?
9. **Expertise Level**: What level of expertise does this prompt assume from the AI/user?

Be specific to this prompt's context and domain. Avoid generic advice.

Respond with ONLY valid JSON in this exact format:
{
  "domainSpecificIssues": ["specific issue 1", "specific issue 2"],
  "implicitAssumptions": ["assumption 1", "assumption 2"],
  "missingSuccessCriteria": ["criteria 1", "criteria 2"],
  "overlookedEdgeCases": ["edge case 1", "edge case 2"],
  "contextGaps": ["context gap 1", "context gap 2"],
  "improvementPotential": "low|medium|high|critical",
  "domainConfidence": 0.95,
  "detectedDomain": "specific domain name",
  "suggestedPatterns": ["pattern 1", "pattern 2"],
  "culturalSensitivity": ["sensitivity 1", "sensitivity 2"],
  "expertiseLevel": "beginner|intermediate|advanced|expert"
}

Focus on actionable, specific insights unique to this prompt's context.`;

  try {
    const response = await callClaudeForAnalysis(analysisPrompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1]! : response;
    
    const analysis = JSON.parse(jsonStr) as DynamicAnalysisResult;
    
    // Validate and sanitize the response
    if (!analysis.improvementPotential || !['low', 'medium', 'high', 'critical'].includes(analysis.improvementPotential)) {
      analysis.improvementPotential = 'medium';
    }
    
    if (!analysis.expertiseLevel || !['beginner', 'intermediate', 'advanced', 'expert'].includes(analysis.expertiseLevel)) {
      analysis.expertiseLevel = 'intermediate';
    }
    
    if (typeof analysis.domainConfidence !== 'number' || analysis.domainConfidence < 0 || analysis.domainConfidence > 1) {
      analysis.domainConfidence = 0.7;
    }
    
    // Ensure arrays exist
    analysis.domainSpecificIssues = analysis.domainSpecificIssues || [];
    analysis.implicitAssumptions = analysis.implicitAssumptions || [];
    analysis.missingSuccessCriteria = analysis.missingSuccessCriteria || [];
    analysis.overlookedEdgeCases = analysis.overlookedEdgeCases || [];
    analysis.contextGaps = analysis.contextGaps || [];
    analysis.suggestedPatterns = analysis.suggestedPatterns || [];
    analysis.culturalSensitivity = analysis.culturalSensitivity || [];
    
    // Cache the result
    dynamicCache.set(cacheKey, analysis);
    
    return analysis;
    
  } catch (error) {
    console.error('Failed to parse dynamic analysis response:', error);
    
    // Return fallback analysis
    const fallbackAnalysis: DynamicAnalysisResult = {
      domainSpecificIssues: ['Unable to perform detailed domain analysis'],
      implicitAssumptions: ['Dynamic analysis not available'],
      missingSuccessCriteria: ['Success criteria should be defined'],
      overlookedEdgeCases: ['Edge case analysis requires manual review'],
      contextGaps: ['Additional context may improve results'],
      improvementPotential: 'medium',
      domainConfidence: 0.5,
      detectedDomain: 'general',
      suggestedPatterns: ['structured-output', 'clear-instructions'],
      culturalSensitivity: [],
      expertiseLevel: 'intermediate'
    };
    
    dynamicCache.set(cacheKey, fallbackAnalysis);
    return fallbackAnalysis;
  }
}

/**
 * Synthesize static and dynamic analyses into comprehensive insights
 */
export function synthesizeAnalyses(
  staticAnalysis: PromptAnalysis,
  dynamicAnalysis: DynamicAnalysisResult
): HybridAnalysis['synthesized'] {
  // Combine and prioritize all issues
  const allIssues = [
    ...staticAnalysis.issues,
    ...dynamicAnalysis.domainSpecificIssues,
    ...dynamicAnalysis.implicitAssumptions.map(a => `Implicit assumption: ${a}`),
    ...dynamicAnalysis.missingSuccessCriteria.map(c => `Missing success criteria: ${c}`),
    ...dynamicAnalysis.contextGaps.map(g => `Context gap: ${g}`)
  ];

  // Prioritize improvements based on both analyses
  const staticSuggestions = staticAnalysis.suggestions || [];
  const dynamicSuggestions = [
    ...dynamicAnalysis.overlookedEdgeCases.map(e => `Consider edge case: ${e}`),
    ...dynamicAnalysis.suggestedPatterns.map(p => `Apply pattern: ${p}`),
    ...dynamicAnalysis.culturalSensitivity.map(c => `Address cultural consideration: ${c}`)
  ];

  const allSuggestions = [...staticSuggestions, ...dynamicSuggestions];

  // Sort improvements by priority
  const prioritizedImprovements = allSuggestions.sort((a, b) => {
    // Prioritize based on impact keywords
    const highPriorityKeywords = ['missing', 'unclear', 'ambiguous', 'critical', 'edge case', 'bias', 'assumption'];
    const mediumPriorityKeywords = ['context', 'pattern', 'structure', 'example', 'format'];
    
    const aHighScore = highPriorityKeywords.filter(k => a.toLowerCase().includes(k)).length;
    const bHighScore = highPriorityKeywords.filter(k => b.toLowerCase().includes(k)).length;
    
    if (aHighScore !== bHighScore) {
      return bHighScore - aHighScore;
    }
    
    const aMedScore = mediumPriorityKeywords.filter(k => a.toLowerCase().includes(k)).length;
    const bMedScore = mediumPriorityKeywords.filter(k => b.toLowerCase().includes(k)).length;
    
    return bMedScore - aMedScore;
  }).slice(0, 8); // Top 8 improvements

  // Calculate estimated quality gain
  const staticScore = staticAnalysis.qualityScores.overall;
  const dynamicPotentialMap = {
    'low': 0.5,
    'medium': 1.5,
    'high': 2.5,
    'critical': 3.5
  };
  
  const dynamicPotential = dynamicPotentialMap[dynamicAnalysis.improvementPotential];
  const domainBonus = dynamicAnalysis.domainConfidence > 0.8 ? 0.5 : 0;
  const estimatedQualityGain = Math.min(10 - staticScore, dynamicPotential + domainBonus);

  // Calculate confidence score
  const confidenceScore = (
    (staticScore / 10) * 0.4 + 
    dynamicAnalysis.domainConfidence * 0.3 + 
    (dynamicAnalysis.improvementPotential === 'critical' ? 0.9 : 
     dynamicAnalysis.improvementPotential === 'high' ? 0.7 : 
     dynamicAnalysis.improvementPotential === 'medium' ? 0.5 : 0.3) * 0.3
  );

  // Generate recommended approach
  const approaches = [];
  if (dynamicAnalysis.expertiseLevel === 'beginner') {
    approaches.push('provide detailed explanations and examples');
  }
  if (dynamicAnalysis.culturalSensitivity.length > 0) {
    approaches.push('address cultural and bias considerations');
  }
  if (dynamicAnalysis.domainConfidence > 0.8) {
    approaches.push(`apply ${dynamicAnalysis.detectedDomain}-specific optimizations`);
  }
  if (staticScore < 7) {
    approaches.push('focus on structural improvements first');
  }
  
  const recommendedApproach = approaches.length > 0 
    ? approaches.join(', ') 
    : 'apply general prompt engineering best practices';

  // Generate next steps
  const nextSteps = [];
  if (prioritizedImprovements.length > 0) {
    nextSteps.push(`Address top priority: "${prioritizedImprovements[0]}"`);
  }
  if (dynamicAnalysis.suggestedPatterns.length > 0) {
    nextSteps.push(`Implement pattern: ${dynamicAnalysis.suggestedPatterns[0]}`);
  }
  if (dynamicAnalysis.contextGaps.length > 0) {
    nextSteps.push(`Add context: ${dynamicAnalysis.contextGaps[0]}`);
  }
  
  if (nextSteps.length === 0) {
    nextSteps.push('Run iterative refinement for quality improvement');
  }

  return {
    primaryIssues: allIssues.slice(0, 5), // Top 5 issues
    prioritizedImprovements,
    estimatedQualityGain,
    confidenceScore,
    recommendedApproach,
    nextSteps
  };
}

/**
 * Create a complete hybrid analysis combining static and dynamic insights
 */
export async function createHybridAnalysis(
  prompt: string,
  staticAnalysis: PromptAnalysis
): Promise<HybridAnalysis> {
  const dynamicAnalysis = await runDynamicAnalysis(prompt);
  const synthesized = synthesizeAnalyses(staticAnalysis, dynamicAnalysis);
  
  return {
    static: staticAnalysis,
    dynamic: dynamicAnalysis,
    synthesized
  };
}

/**
 * Display dynamic analysis results
 */
export function displayDynamicAnalysis(analysis: DynamicAnalysisResult, showProgress: boolean): void {
  if (!showProgress) return;
  
  console.log('\n🧠 Dynamic Analysis Results:');
  console.log(`   Domain: ${analysis.detectedDomain} (${(analysis.domainConfidence * 100).toFixed(0)}% confidence)`);
  console.log(`   Expertise Level: ${analysis.expertiseLevel}`);
  console.log(`   Improvement Potential: ${analysis.improvementPotential}`);
  
  if (analysis.domainSpecificIssues.length > 0) {
    console.log(`   Domain Issues: ${analysis.domainSpecificIssues.slice(0, 2).join(', ')}`);
  }
  
  if (analysis.suggestedPatterns.length > 0) {
    console.log(`   Suggested Patterns: ${analysis.suggestedPatterns.slice(0, 3).join(', ')}`);
  }
  
  if (analysis.culturalSensitivity.length > 0) {
    console.log(`   ⚠️ Cultural Considerations: ${analysis.culturalSensitivity.length} identified`);
  }
}

/**
 * Display hybrid analysis summary
 */
export function displayHybridAnalysis(analysis: HybridAnalysis, showProgress: boolean): void {
  if (!showProgress) return;
  
  console.log('\n🔬 Hybrid Analysis Summary:');
  console.log(`   Confidence Score: ${(analysis.synthesized.confidenceScore * 100).toFixed(0)}%`);
  console.log(`   Quality Gain Potential: +${analysis.synthesized.estimatedQualityGain.toFixed(1)}`);
  console.log(`   Recommended Approach: ${analysis.synthesized.recommendedApproach}`);
  
  if (analysis.synthesized.primaryIssues.length > 0) {
    console.log('   🎯 Top Issues:');
    analysis.synthesized.primaryIssues.slice(0, 3).forEach(issue => {
      console.log(`      • ${issue}`);
    });
  }
  
  if (analysis.synthesized.nextSteps.length > 0) {
    console.log('   📋 Next Steps:');
    analysis.synthesized.nextSteps.slice(0, 2).forEach(step => {
      console.log(`      1. ${step}`);
    });
  }
}