#!/usr/bin/env bun
/**
 * Prompt Improver CLI - Bun Edition
 * A fast TypeScript CLI tool for enhancing prompts using Claude CLI and prompt engineering best practices
 */

import { $ } from "bun";
import { Command } from 'commander';
import { runClaudeInteractiveImprovement } from "./interactive.js";

export interface PromptAnalysis {
  issues: string[];
  suggestions: string[];
  qualityScores: QualityScores;
  taskType: TaskType;
  detectedPatterns: DetectedPattern[];
  recommendedFrameworks: Framework[];
  improvementPriority: 'low' | 'medium' | 'high';
}

interface QualityScores {
  accuracy: number;        // 0-10: How precise and factual the prompt is
  relevance: number;       // 0-10: How well-focused the prompt is
  thoroughness: number;    // 0-10: How comprehensive the prompt is
  clarity: number;         // 0-10: How clear and understandable the prompt is
  conciseness: number;     // 0-10: How efficiently worded the prompt is
  safety: number;          // 0-10: How safe and appropriate the prompt is
  privacy: number;         // 0-10: How well privacy is protected
  fairness: number;        // 0-10: How unbiased and fair the prompt is
  transparency: number;    // 0-10: How clear the intent and process is
  overall: number;         // 0-10: Computed overall score
}

type TaskType = 'reasoning' | 'creative' | 'factual' | 'code' | 'analysis' | 'conversation' | 'instruction' | 'mixed';

interface DetectedPattern {
  name: string;
  confidence: number;      // 0-1: How confident we are in the detection
  description: string;
}

interface Framework {
  name: string;
  acronym: string;
  description: string;
  suitability: number;     // 0-10: How well this framework fits the prompt
  reason: string;
}

/**
 * Detect the primary task type of a prompt
 */
function detectTaskType(prompt: string): TaskType {
  const text = prompt.toLowerCase();
  
  // Reasoning indicators
  const reasoningWords = ['analyze', 'explain', 'why', 'how', 'reason', 'logic', 'step by step', 'chain of thought', 'think through'];
  const reasoningScore = reasoningWords.filter(word => text.includes(word)).length;
  
  // Creative indicators
  const creativeWords = ['create', 'write story', 'creative', 'imagine', 'generate', 'brainstorm', 'invent', 'artistic'];
  const creativeScore = creativeWords.filter(word => text.includes(word)).length;
  
  // Code indicators
  const codeWords = ['code', 'function', 'class', 'algorithm', 'programming', 'debug', 'refactor', 'api'];
  const codeScore = codeWords.filter(word => text.includes(word)).length;
  
  // Analysis indicators
  const analysisWords = ['analyze', 'compare', 'evaluate', 'assess', 'review', 'examine', 'study'];
  const analysisScore = analysisWords.filter(word => text.includes(word)).length;
  
  // Factual indicators
  const factualWords = ['what is', 'define', 'fact', 'information', 'data', 'statistics', 'research'];
  const factualScore = factualWords.filter(word => text.includes(word)).length;
  
  // Conversation indicators
  const conversationWords = ['chat', 'discuss', 'conversation', 'talk', 'respond', 'reply'];
  const conversationScore = conversationWords.filter(word => text.includes(word)).length;
  
  const scores = [
    { type: 'reasoning' as TaskType, score: reasoningScore },
    { type: 'creative' as TaskType, score: creativeScore },
    { type: 'code' as TaskType, score: codeScore },
    { type: 'analysis' as TaskType, score: analysisScore },
    { type: 'factual' as TaskType, score: factualScore },
    { type: 'conversation' as TaskType, score: conversationScore }
  ];
  
  const maxScore = Math.max(...scores.map(s => s.score));
  if (maxScore === 0) return 'instruction';
  
  const topMatches = scores.filter(s => s.score === maxScore);
  return topMatches.length > 1 ? 'mixed' : topMatches[0]?.type || 'instruction';
}

/**
 * Calculate quality scores for a prompt based on 2024 research metrics
 */
function calculateQualityScores(prompt: string, taskType: TaskType): QualityScores {
  const wordCount = prompt.split(/\s+/).length;
  const sentenceCount = prompt.split(/[.!?]+/).length;
  
  // Accuracy (0-10): Check for specific, precise language
  let accuracy = 5;
  const vaguenessWords = ['good', 'nice', 'better', 'improve', 'help', 'some', 'things', 'stuff', 'kind of', 'sort of'];
  const vagueCount = vaguenessWords.filter(word => prompt.toLowerCase().includes(word)).length;
  accuracy = Math.max(0, 10 - (vagueCount * 2));
  
  // Relevance (0-10): Check if prompt stays focused
  let relevance = 8;
  if (prompt.includes('and also') || prompt.includes('by the way') || prompt.includes('additionally')) {
    relevance -= 2;
  }
  
  // Thoroughness (0-10): Check for completeness
  let thoroughness = Math.min(10, wordCount / 20);
  if (prompt.includes('context') || prompt.includes('background')) thoroughness += 1;
  if (prompt.includes('example') || prompt.includes('for instance')) thoroughness += 1;
  thoroughness = Math.min(10, thoroughness);
  
  // Clarity (0-10): Check for clear structure and language
  let clarity = 5;
  const structureMarkers = ['#', '##', '###', '1.', '2.', '-', '*', 'first', 'second', 'then'];
  const hasStructure = structureMarkers.some(marker => prompt.includes(marker));
  if (hasStructure) clarity += 3;
  if (sentenceCount > 1) clarity += 1;
  if (wordCount > 50 && wordCount < 200) clarity += 1;
  clarity = Math.min(10, clarity);
  
  // Conciseness (0-10): Balance between thoroughness and brevity
  let conciseness = 10;
  if (wordCount > 300) conciseness -= 3;
  if (wordCount > 500) conciseness -= 3;
  if (wordCount < 10) conciseness -= 4;
  conciseness = Math.max(0, conciseness);
  
  // Safety (0-10): Check for appropriate content
  let safety = 10;
  const unsafeWords = ['hack', 'illegal', 'harm', 'dangerous', 'violent'];
  if (unsafeWords.some(word => prompt.toLowerCase().includes(word))) safety -= 5;
  
  // Privacy (0-10): Check for privacy considerations
  let privacy = 10;
  const sensitiveWords = ['password', 'ssn', 'credit card', 'personal', 'private'];
  if (sensitiveWords.some(word => prompt.toLowerCase().includes(word))) privacy -= 3;
  
  // Fairness (0-10): Check for bias indicators
  let fairness = 10;
  const biasWords = ['always', 'never', 'all', 'everyone', 'nobody'];
  const biasCount = biasWords.filter(word => prompt.toLowerCase().includes(word)).length;
  fairness = Math.max(5, 10 - biasCount);
  
  // Transparency (0-10): Check for clear intent
  let transparency = 7;
  if (prompt.includes('role') || prompt.includes('act as') || prompt.includes('you are')) transparency += 2;
  if (prompt.includes('goal') || prompt.includes('objective') || prompt.includes('purpose')) transparency += 1;
  transparency = Math.min(10, transparency);
  
  // Calculate overall score
  const overall = (accuracy + relevance + thoroughness + clarity + conciseness + safety + privacy + fairness + transparency) / 9;
  
  return {
    accuracy: Math.round(accuracy * 10) / 10,
    relevance: Math.round(relevance * 10) / 10,
    thoroughness: Math.round(thoroughness * 10) / 10,
    clarity: Math.round(clarity * 10) / 10,
    conciseness: Math.round(conciseness * 10) / 10,
    safety: Math.round(safety * 10) / 10,
    privacy: Math.round(privacy * 10) / 10,
    fairness: Math.round(fairness * 10) / 10,
    transparency: Math.round(transparency * 10) / 10,
    overall: Math.round(overall * 10) / 10
  };
}

/**
 * Detect prompt engineering patterns based on 2024 research
 */
function detectPromptPatterns(prompt: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const text = prompt.toLowerCase();
  
  // Chain of Thought
  if (text.includes('step by step') || text.includes('think through') || text.includes('reasoning')) {
    patterns.push({
      name: 'Chain-of-Thought',
      confidence: 0.8,
      description: 'Encourages step-by-step reasoning process'
    });
  }
  
  // Few-Shot Learning
  if (text.includes('example') || text.includes('for instance') || text.includes('such as')) {
    patterns.push({
      name: 'Few-Shot Learning',
      confidence: 0.7,
      description: 'Provides examples to guide output'
    });
  }
  
  // Role Assignment
  if (text.includes('you are') || text.includes('act as') || text.includes('role')) {
    patterns.push({
      name: 'Role Assignment',
      confidence: 0.9,
      description: 'Assigns specific role or persona to AI'
    });
  }
  
  // Zero-Shot
  if (!text.includes('example') && text.includes('without example')) {
    patterns.push({
      name: 'Zero-Shot',
      confidence: 0.8,
      description: 'Direct instruction without examples'
    });
  }
  
  // Self-Consistency
  if (text.includes('multiple ways') || text.includes('different approaches') || text.includes('various methods')) {
    patterns.push({
      name: 'Self-Consistency',
      confidence: 0.6,
      description: 'Encourages multiple solution paths'
    });
  }
  
  // Emotion Prompting - Enhanced detection
  const emotionWords = [
    'take a deep breath', 'carefully', 'important', 'crucial', 'critical', 
    'this matters', 'pay attention', 'focus', 'concentrate', 'think carefully',
    'be precise', 'be thorough', 'be detailed', 'this is significant',
    'take your time', 'be methodical', 'be systematic', 'please', 'kindly'
  ];
  const emotionCount = emotionWords.filter(word => text.includes(word)).length;
  if (emotionCount > 0) {
    patterns.push({
      name: 'Emotion Prompting',
      confidence: Math.min(0.9, 0.6 + (emotionCount * 0.1)),
      description: `Uses ${emotionCount} emotional cue${emotionCount > 1 ? 's' : ''} to improve performance`
    });
  }
  
  // Performance Enhancement Patterns
  if (text.includes('step by step') || text.includes('systematically') || text.includes('methodically')) {
    patterns.push({
      name: 'Structured Reasoning',
      confidence: 0.85,
      description: 'Encourages systematic, step-by-step approach'
    });
  }
  
  // Quality Enhancement Patterns
  if (text.includes('high quality') || text.includes('professional') || text.includes('excellent')) {
    patterns.push({
      name: 'Quality Emphasis',
      confidence: 0.75,
      description: 'Emphasizes quality and professional standards'
    });
  }
  
  return patterns;
}

/**
 * Recommend frameworks based on task type and analysis
 */
function recommendFrameworks(prompt: string, taskType: TaskType, qualityScores: QualityScores): Framework[] {
  const frameworks: Framework[] = [];
  
  // 5C Framework - Always applicable
  frameworks.push({
    name: '5C Framework',
    acronym: '5C',
    description: 'Clarity, Contextualization, Command, Chaining, Continuous Refinement',
    suitability: Math.max(6, 10 - (qualityScores.clarity < 7 ? 2 : 0) - (qualityScores.thoroughness < 6 ? 1 : 0)),
    reason: 'Universal framework for structured prompt improvement'
  });
  
  // RACE Framework
  const raceSuitability = taskType === 'reasoning' || taskType === 'analysis' ? 9 : 7;
  frameworks.push({
    name: 'RACE Framework',
    acronym: 'RACE',
    description: 'Role, Action, Context, Explanation',
    suitability: raceSuitability,
    reason: taskType === 'reasoning' ? 'Excellent for analytical and reasoning tasks' : 'Good general-purpose structure'
  });
  
  // CARE Framework
  const careSuitability = taskType === 'creative' || taskType === 'conversation' ? 9 : 7;
  frameworks.push({
    name: 'CARE Framework',
    acronym: 'CARE',
    description: 'Context, Action, Result, Example',
    suitability: careSuitability,
    reason: taskType === 'creative' ? 'Ideal for creative and conversational tasks' : 'Good for result-oriented prompting'
  });
  
  // APE Framework  
  const apeSuitability = taskType === 'instruction' || qualityScores.clarity < 7 ? 8 : 6;
  frameworks.push({
    name: 'APE Framework',
    acronym: 'APE',
    description: 'Action, Purpose, Execution',
    suitability: apeSuitability,
    reason: 'Excellent for clear, action-oriented instructions'
  });
  
  // Chain-of-Thought - High for reasoning tasks
  if (taskType === 'reasoning' || taskType === 'analysis' || taskType === 'code') {
    frameworks.push({
      name: 'Chain-of-Thought',
      acronym: 'CoT',
      description: 'Step-by-step reasoning with intermediate steps',
      suitability: 9,
      reason: 'Optimal for complex reasoning and problem-solving tasks'
    });
  }
  
  // ReAct Framework - For complex tasks requiring reasoning + action
  if (taskType === 'reasoning' || taskType === 'analysis') {
    frameworks.push({
      name: 'ReAct Framework',
      acronym: 'ReAct',
      description: 'Reasoning + Acting in an interleaved manner',
      suitability: 8,
      reason: 'Combines reasoning with action for complex problem-solving'
    });
  }
  
  // Few-Shot Learning
  if (qualityScores.thoroughness < 7) {
    frameworks.push({
      name: 'Few-Shot Learning',
      acronym: 'FSL',
      description: 'Provide examples to demonstrate desired output',
      suitability: 8,
      reason: 'Adds context and examples to improve specificity'
    });
  }
  
  // Tree-of-Thoughts for complex reasoning
  if (taskType === 'reasoning' && qualityScores.thoroughness > 7) {
    frameworks.push({
      name: 'Tree-of-Thoughts',
      acronym: 'ToT',
      description: 'Explore multiple reasoning paths simultaneously',
      suitability: 8,
      reason: 'Best for complex multi-step reasoning problems'
    });
  }
  
  return frameworks.sort((a, b) => b.suitability - a.suitability);
}

/**
 * Copy text to system clipboard using platform-specific commands
 */
async function copyToClipboard(text: string): Promise<boolean> {
  const platform = process.platform;
  
  try {
    switch (platform) {
      case 'darwin': // macOS
        await $`echo ${text} | pbcopy`;
        break;
      case 'linux':
        await $`echo ${text} | xclip -selection clipboard`;
        break;
      case 'win32': // Windows
        await $`echo ${text} | clip`;
        break;
      default:
        console.error(`Unsupported platform: ${platform}`);
        return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Enhanced prompt analysis using 2024 research-based techniques
 */
export function analyzePrompt(prompt: string): PromptAnalysis {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // 1. Detect task type
  const taskType = detectTaskType(prompt);
  
  // 2. Calculate quality scores
  const qualityScores = calculateQualityScores(prompt, taskType);
  
  // 3. Detect existing patterns
  const detectedPatterns = detectPromptPatterns(prompt);
  
  // 4. Recommend frameworks
  const recommendedFrameworks = recommendFrameworks(prompt, taskType, qualityScores);
  
  // 5. Generate issues and suggestions based on quality scores
  if (qualityScores.accuracy < 7) {
    issues.push("Contains vague or imprecise language");
    suggestions.push("Replace vague terms with specific, measurable requirements");
  }
  
  if (qualityScores.clarity < 7) {
    issues.push("Lacks clear structure and organization");
    suggestions.push("Add markdown headers, bullet points, or numbered steps for better structure");
  }
  
  if (qualityScores.thoroughness < 6) {
    issues.push("May lack sufficient context and detail");
    suggestions.push("Add background information, constraints, and expected output format");
  }
  
  if (qualityScores.conciseness < 6) {
    issues.push("May be too verbose or repetitive");
    suggestions.push("Streamline language while maintaining clarity and completeness");
  }
  
  if (qualityScores.transparency < 7) {
    issues.push("Intent and objectives could be clearer");
    suggestions.push("Explicitly state the role, goal, and desired outcome");
  }
  
  // Pattern-based suggestions
  if (detectedPatterns.length === 0) {
    suggestions.push("Consider using proven prompt engineering patterns like Chain-of-Thought or Few-Shot Learning");
  }
  
  if (taskType === 'reasoning' && !detectedPatterns.some(p => p.name === 'Chain-of-Thought')) {
    suggestions.push("For reasoning tasks, add 'Let's think step-by-step' to enable Chain-of-Thought processing");
  }
  
  if (!detectedPatterns.some(p => p.name === 'Role Assignment')) {
    suggestions.push("Assign a specific role or persona (e.g., 'You are an expert in...')");
  }
  
  // Determine improvement priority
  const lowScores = Object.values(qualityScores).filter(score => score < 6).length;
  const improvementPriority: 'low' | 'medium' | 'high' = 
    lowScores >= 4 ? 'high' : 
    lowScores >= 2 ? 'medium' : 'low';
  
  return {
    issues,
    suggestions,
    qualityScores,
    taskType,
    detectedPatterns,
    recommendedFrameworks,
    improvementPriority
  };
}

/**
 * Generate few-shot examples based on task type
 */
function getFewShotExamples(taskType: TaskType): string {
  switch (taskType) {
    case 'reasoning':
      return `
**For Reasoning Tasks:**
\`\`\`
Example 1: "Analyze the economic impact of remote work"
Expected: Step-by-step breakdown covering productivity, costs, market effects, with evidence

Example 2: "Evaluate the pros and cons of renewable energy"
Expected: Systematic comparison with quantified benefits/drawbacks, logical conclusions
\`\`\``;

    case 'creative':
      return `
**For Creative Tasks:**
\`\`\`
Example 1: "Write a story about time travel"
Expected: Original narrative with clear plot, character development, vivid descriptions

Example 2: "Create a marketing campaign for a new product"
Expected: Creative concept with tagline, target audience, multiple touchpoints
\`\`\``;

    case 'code':
      return `
**For Code Tasks:**
\`\`\`
Example 1: "Create a function to validate email addresses"
Expected: Working code with error handling, comments, test cases

Example 2: "Debug this sorting algorithm"
Expected: Identified issues, corrected code, explanation of fixes
\`\`\``;

    case 'analysis':
      return `
**For Analysis Tasks:**
\`\`\`
Example 1: "Compare these two datasets"
Expected: Statistical comparison, key insights, visualizations or tables

Example 2: "Analyze customer feedback trends"
Expected: Pattern identification, sentiment analysis, actionable recommendations
\`\`\``;

    case 'factual':
      return `
**For Factual Tasks:**
\`\`\`
Example 1: "Explain quantum computing"
Expected: Clear definition, key concepts, real-world applications with sources

Example 2: "What are the causes of climate change?"
Expected: Evidence-based explanation with scientific references, quantified data
\`\`\``;

    default:
      return `
**General Examples:**
\`\`\`
Example 1: Clear, specific request with context
Expected: Detailed, well-structured response addressing all aspects

Example 2: Task with defined parameters and constraints
Expected: Output meeting all specified requirements with appropriate format
\`\`\``;
  }
}

/**
 * Create a meta-prompt to improve the original prompt using 2024 research-based techniques
 */
function createImprovementPrompt(originalPrompt: string, analysis: PromptAnalysis): string {
  const topFramework = analysis.recommendedFrameworks[0] || {
    name: '5C Framework',
    acronym: '5C',
    description: 'Clarity, Contextualization, Command, Chaining, Continuous Refinement',
    suitability: 7,
    reason: 'Default universal framework for structured improvement'
  };
  const detectedPatternsText = analysis.detectedPatterns.length > 0 
    ? analysis.detectedPatterns.map(p => `${p.name} (${Math.round(p.confidence * 100)}% confidence)`).join(', ')
    : 'None detected';
  
  return `You are an expert prompt engineer specializing in Claude 4 Sonnet optimization and 2024 research-based prompt engineering techniques.

## Original Prompt Analysis
**Original Prompt:**
${originalPrompt}

**Task Type:** ${analysis.taskType}
**Overall Quality Score:** ${analysis.qualityScores.overall}/10 (${analysis.improvementPriority} priority)
**Current Patterns:** ${detectedPatternsText}
**Recommended Framework:** ${topFramework.name} (${topFramework.acronym}) - ${topFramework.reason}

## Quality Assessment
- **Accuracy:** ${analysis.qualityScores.accuracy}/10 (Precision & specificity)
- **Clarity:** ${analysis.qualityScores.clarity}/10 (Structure & readability)  
- **Thoroughness:** ${analysis.qualityScores.thoroughness}/10 (Context & completeness)
- **Conciseness:** ${analysis.qualityScores.conciseness}/10 (Efficiency)
- **Transparency:** ${analysis.qualityScores.transparency}/10 (Intent clarity)

## Your Task
Create an improved prompt optimized for Claude 4 Sonnet using the **${topFramework.acronym} Framework** and addressing these specific issues:
${analysis.issues.map(issue => `- ${issue}`).join('\n')}

## Improvement Strategy  
Apply these 2024 research-backed techniques:

1. **${topFramework.name}**: ${topFramework.description}
2. **Claude 4 Optimizations**: 
   - Use explicit instruction following patterns
   - Add "For maximum efficiency, invoke relevant tools simultaneously" if applicable
   - ${analysis.improvementPriority === 'high' ? 'CRITICAL: Include strong emotional cues like "This is important" and "Take a deep breath and work through this step-by-step"' : 'Include emotional cues like "This is important" or "Take a deep breath"'}
   - ${analysis.taskType === 'reasoning' ? 'Add systematic reasoning phrases like "be methodical" and "think carefully"' : 'Use appropriate emotional enhancement for the task type'}
3. **Context Architecture**: Provide comprehensive background and constraints
4. **Structured Output**: Use clear markdown formatting with headers and lists
5. **Few-Shot Learning**: ${analysis.qualityScores.thoroughness < 7 ? 'INCLUDE EXAMPLES - Add 1-3 concrete examples to demonstrate desired output format and quality' : 'Consider adding examples if they would clarify expectations'}
6. **Pattern Integration**: ${analysis.taskType === 'reasoning' ? 'Enable Chain-of-Thought with step-by-step reasoning' : 'Use appropriate patterns for the task type'}

${analysis.qualityScores.thoroughness < 7 ? `
## Example Templates by Task Type
${getFewShotExamples(analysis.taskType)}` : ''}

## Output Requirements
IMPORTANT: Respond with ONLY the improved prompt. No explanations, analysis, or commentary. 

The improved prompt should:
- Follow the ${topFramework.acronym} framework structure exactly
- Address all identified quality issues  
- Be optimized specifically for Claude 4 Sonnet
- Include cost-efficient structured formatting
- Integrate appropriate prompt engineering patterns

Focus on surgical specificity, context as architecture, and optimization for Claude 4's precise instruction following capabilities.`;
}


/**
 * Run Claude CLI with the enhanced improvement prompt using Bun's shell integration
 */
async function runClaudeImprovement(prompt: string, analysis: PromptAnalysis): Promise<string> {
  const improvementPrompt = createImprovementPrompt(prompt, analysis);
  
  try {
    // Run claude with the prompt directly as input
    const result = await $`claude -p ${improvementPrompt}`.text();
    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("command not found")) {
        return "Error: Claude CLI not found. Please install claude-cli first.";
      }
      return `Error running Claude CLI: ${error.message}`;
    }
    return "Unknown error occurred";
  }
}


/**
 * Standard prompt improvement function (non-interactive)
 */
async function improvePrompt(promptText: string): Promise<void> {
  try {
    console.log("🚀 Analyzing and improving your prompt with 2024 research-based techniques...");
    
    // Enhanced analysis
    const analysis = analyzePrompt(promptText);
    
    // Display comprehensive analysis
    console.log("📊 Comprehensive Prompt Analysis");
    console.log("================================");
    
    console.log(`🎯 Task Type: ${analysis.taskType}`);
    console.log(`📈 Overall Quality Score: ${analysis.qualityScores.overall}/10 (${analysis.improvementPriority} priority)`);
    
    // Quality metrics breakdown
    console.log("📋 Quality Metrics:");
    console.log(`  • Accuracy: ${analysis.qualityScores.accuracy}/10 (Precision & specificity)`);
    console.log(`  • Clarity: ${analysis.qualityScores.clarity}/10 (Structure & readability)`);
    console.log(`  • Thoroughness: ${analysis.qualityScores.thoroughness}/10 (Context & completeness)`);
    console.log(`  • Conciseness: ${analysis.qualityScores.conciseness}/10 (Efficiency)`);
    console.log(`  • Transparency: ${analysis.qualityScores.transparency}/10 (Intent clarity)`);
    console.log(`  • Safety: ${analysis.qualityScores.safety}/10 | Privacy: ${analysis.qualityScores.privacy}/10 | Fairness: ${analysis.qualityScores.fairness}/10`);
    
    // Detected patterns
    if (analysis.detectedPatterns.length > 0) {
      console.log("🔍 Detected Prompt Patterns:");
      analysis.detectedPatterns.forEach(pattern => {
        console.log(`  ✓ ${pattern.name} (${Math.round(pattern.confidence * 100)}% confidence) - ${pattern.description}`);
      });
    }
    
    // Recommended frameworks
    console.log("🛠️ Recommended Frameworks:");
    analysis.recommendedFrameworks.slice(0, 3).forEach((framework, index) => {
      const icon = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      console.log(`  ${icon} ${framework.name} (${framework.acronym}) - ${framework.suitability}/10`);
      console.log(`     ${framework.reason}`);
    });
    
    // Issues and suggestions
    if (analysis.issues.length > 0) {
      console.log("⚠️ Issues Identified:");
      analysis.issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }
    
    if (analysis.suggestions.length > 0) {
      console.log("💡 Improvement Suggestions:");
      analysis.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });
    }
    
    // Run Claude improvement
    console.log("🧠 Running Claude CLI with optimized improvement prompt...");
    const improvedResult = await runClaudeImprovement(promptText, analysis);
    
    console.log(improvedResult);
    
    // Try to copy to clipboard
    const clipboardSuccess = await copyToClipboard(improvedResult);
    if (clipboardSuccess) {
      console.log("✅ Result copied to clipboard!");
    } else {
      console.log("⚠️  Could not copy to clipboard");
    }

  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

/**
 * Main CLI function using Commander.js
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('prompt-improver')
    .description('Advanced Prompt Improver CLI - 2024 Research Edition')
    .version('2.0.0');

  // Analysis command (non-interactive mode)
  program
    .command('analyze')
    .alias('a')
    .description('Run standard prompt analysis and improvement (non-interactive)')
    .argument('[prompt]', 'Prompt text to improve')
    .action(async (promptText?: string) => {
      let prompt = "";
      
      if (promptText) {
        // Direct command line argument
        prompt = promptText;
      } else {
        // Try to read from stdin
        try {
          const stdin = await Bun.stdin.text();
          if (stdin.trim()) {
            prompt = stdin.trim();
          } else {
            program.help();
            process.exit(1);
          }
        } catch (error) {
          program.help();
          process.exit(1);
        }
      }

      if (!prompt.trim()) {
        console.error("Error: No prompt provided");
        program.help();
        process.exit(1);
      }

      await improvePrompt(prompt);
    });

  // File input command
  program
    .command('file')
    .alias('f')
    .description('Improve prompt from file')
    .argument('<filepath>', 'Path to file containing the prompt')
    .option('--interactive', 'Use interactive mode for file input')
    .action(async (filepath: string, options: { interactive?: boolean }) => {
      try {
        const file = Bun.file(filepath);
        if (!(await file.exists())) {
          console.error(`Error: File '${filepath}' not found`);
          process.exit(1);
        }
        
        const prompt = await file.text();
        if (!prompt.trim()) {
          console.error("Error: File is empty");
          process.exit(1);
        }
        
        if (options.interactive) {
          // Use interactive mode but pre-populate with file content
          console.log(`📁 Loaded prompt from file: ${filepath}`);
          const improvedPrompt = await runClaudeInteractiveImprovement();
          const clipboardSuccess = await copyToClipboard(improvedPrompt);
          if (clipboardSuccess) {
            console.log("✅ Final prompt also copied to clipboard!");
          }
        } else {
          await improvePrompt(prompt.trim());
        }
      } catch (error) {
        console.error("Error reading file:", error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    });

  // Default command - Interactive mode
  program
    .argument('[prompt]', 'Optional: Start interactive mode with this prompt pre-filled')
    .action(async (promptText?: string) => {
      // If a prompt is provided as argument, run analysis mode
      if (promptText) {
        await improvePrompt(promptText);
        return;
      }
      
      // Check if there's piped input (stdin) without blocking
      let hasStdinInput = false;
      if (!process.stdin.isTTY) {
        // There's piped input available
        try {
          const stdin = await Bun.stdin.text();
          if (stdin.trim()) {
            await improvePrompt(stdin.trim());
            return;
          }
        } catch (error) {
          // Continue to interactive mode if stdin read fails
        }
      }
      
      // Default to interactive mode
      try {
        const improvedPrompt = await runClaudeInteractiveImprovement();
        // Additional clipboard copy as backup
        const clipboardSuccess = await copyToClipboard(improvedPrompt);
        if (clipboardSuccess) {
          console.log("✅ Final prompt also copied to clipboard!");
        }
        process.exit(0);
      } catch (error) {
        // Handle graceful exit - don't show error for user cancellation
        if (error instanceof Error && error.message.includes('User force closed the prompt')) {
          process.exit(0);
        }
        console.error("Interactive mode failed:", error instanceof Error ? error.message : "Unknown error");
        process.exit(1);
      }
    });

  // Enhanced help with feature descriptions
  program.addHelpText('after', `
🧠 Advanced Analysis Features (2024 Research-Based):
  📊 9-Metric Quality Assessment (accuracy, clarity, thoroughness, etc.)
  🎯 Automatic Task Type Detection (reasoning, creative, code, etc.)
  🔍 Prompt Pattern Recognition (Chain-of-Thought, Few-Shot, etc.)
  🛠️ Framework Recommendations (5C, RACE, CoT, Tree-of-Thoughts)
  ⚡ Claude 4 Sonnet Optimizations (parallel tools, emotion prompts)
  💡 Research-Backed Improvement Strategies

🚀 Core Features:
  ✨ Lightning-fast TypeScript execution with Bun
  🎯 Interactive mode by default (dynamic question generation)
  📋 Automatic clipboard integration
  🛠️ Shell integration for Claude CLI
  📈 Comprehensive quality scoring and analytics
  🎨 Rich console output with visual indicators

Examples:
  prompt-improver                    # Interactive mode (default)
  prompt-improver "write a function" # Quick analysis mode
  echo "improve this code" | prompt-improver
  prompt-improver file my-prompt.txt
  prompt-improver analyze "my prompt" # Force analysis mode
`);

  await program.parseAsync();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down...');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Run main function
main();