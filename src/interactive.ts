#!/usr/bin/env bun
/**
 * Claude CLI-Driven Interactive Prompt Improvement Module
 * Uses Claude CLI to dynamically generate questions and improvements based on actual analysis
 */

import inquirer from 'inquirer';
import { $ } from "bun";

/**
 * Extract JSON from Claude's markdown code block response
 */
function extractJSONFromMarkdown(response: string): string {
  const trimmed = response.trim();
  
  // Check if response is wrapped in markdown code blocks
  if (trimmed.startsWith('```json') || trimmed.startsWith('```')) {
    const lines = trimmed.split('\n');
    const startIndex = lines[0]?.startsWith('```') ? 1 : 0;
    const endIndex = lines.findLastIndex((line: string) => line.trim() === '```');
    
    if (endIndex > startIndex) {
      return lines.slice(startIndex, endIndex).join('\n').trim();
    }
  }
  
  // If not in code blocks, return as is
  return trimmed;
}

interface ClaudeAnalysisResponse {
  questions: Array<{
    id: string;
    question: string;
    focus: 'ambiguity' | 'missing_context' | 'unclear_objectives';
    reasoning: string;
  }>;
  summary: string;
}

interface ClaudeEnhancementResponse {
  questions: Array<{
    id: string;
    question: string;
    type: 'examples' | 'edge_cases' | 'success_criteria';
    reasoning: string;
  }>;
  preliminary_prompt: string;
}

interface InteractiveSession {
  originalPrompt: string;
  analysisResponse: ClaudeAnalysisResponse;
  phase1Answers: { [key: string]: string };
  enhancementResponse: ClaudeEnhancementResponse;
  phase2Answers: { [key: string]: string };
  finalPrompt: string;
  sessionId: string;
}

/**
 * Main Claude CLI-driven interactive improvement flow
 */
export async function runClaudeInteractiveImprovement(): Promise<string> {
  // Enhanced header with beautiful borders
  console.log('\n' + '╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + '  🚀 Claude CLI-Driven Interactive Prompt Improvement'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╠' + '═'.repeat(78) + '╣');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║  This tool uses Claude to dynamically analyze your prompt and'.padEnd(78) + '║');
  console.log('║  generate targeted questions. Each question is specifically'.padEnd(78) + '║');
  console.log('║  crafted based on your prompt\'s unique weaknesses.'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log();

  try {
    // Get initial prompt from user
    const { originalPrompt } = await inquirer.prompt([
      {
        type: 'input',
        name: 'originalPrompt',
        message: '📝 Enter your prompt to improve:',
        validate: (input: string) => {
          if (input.length < 5) {
            return 'Please enter a prompt with at least 5 characters';
          }
          if (input.length > 2000) {
            return 'Please keep your prompt under 2000 characters for optimal analysis';
          }
          return true;
        }
      }
    ]);

    // Phase 1: Claude analyzes prompt and generates targeted questions
    console.log('\n🔍 Claude is analyzing your prompt for weaknesses...\n');
    const analysisResponse = await runClaudeAnalysis(originalPrompt);
    
    // Display analysis summary with borders
    console.log('\n' + '┌' + '─'.repeat(58) + '┐');
    console.log('│' + ' 📊 ANALYSIS SUMMARY'.padEnd(58) + '│');
    console.log('├' + '─'.repeat(58) + '┤');
    console.log('│' + ' '.repeat(58) + '│');
    
    // Split summary into lines for proper formatting
    const summaryLines = analysisResponse.summary.split('\n');
    for (const line of summaryLines) {
      console.log('│ ' + line.padEnd(57) + '│');
    }
    
    console.log('│' + ' '.repeat(58) + '│');
    console.log('└' + '─'.repeat(58) + '┘');
    console.log();

    // Ask Claude's generated questions (Phase 1)
    console.log('\n' + '╔' + '═'.repeat(68) + '╗');
    console.log('║' + ' '.repeat(68) + '║');
    console.log('║' + ' 📋 PHASE 1: Addressing Core Weaknesses (Claude-Generated)'.padEnd(68) + '║');
    console.log('║' + ' '.repeat(68) + '║');
    console.log('╚' + '═'.repeat(68) + '╝');
    
    const phase1Answers = await askClaudeGeneratedQuestions(analysisResponse.questions);

    // Phase 2: Claude generates enhancement questions based on responses
    console.log('\n\n🔧 Claude is analyzing your responses and generating enhancement questions...\n');
    const enhancementResponse = await runClaudeEnhancement(originalPrompt, analysisResponse, phase1Answers);

    // Show preliminary improved prompt with borders
    console.log('\n' + '┌' + '─'.repeat(58) + '┐');
    console.log('│' + ' 📝 PRELIMINARY IMPROVED PROMPT'.padEnd(58) + '│');
    console.log('├' + '─'.repeat(58) + '┤');
    console.log('│' + ' '.repeat(58) + '│');
    
    // Split preliminary prompt into lines and add borders
    const prelimLines = enhancementResponse.preliminary_prompt.split('\n');
    for (const line of prelimLines) {
      console.log('│ ' + line.padEnd(57) + '│');
    }
    
    console.log('│' + ' '.repeat(58) + '│');
    console.log('└' + '─'.repeat(58) + '┘');
    
    const { continueToPhase2 } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueToPhase2',
        message: 'Continue with enhancement questions to further refine this prompt?',
        default: true
      }
    ]);

    let phase2Answers: { [key: string]: string } = {};
    let finalPrompt = enhancementResponse.preliminary_prompt;

    if (continueToPhase2) {
      // Ask Claude's enhancement questions (Phase 2)
      console.log('\n' + '╔' + '═'.repeat(68) + '╗');
      console.log('║' + ' '.repeat(68) + '║');
      console.log('║' + ' 🎯 PHASE 2: Enhancement & Refinement (Claude-Generated)'.padEnd(68) + '║');
      console.log('║' + ' '.repeat(68) + '║');
      console.log('╚' + '═'.repeat(68) + '╝');
      
      phase2Answers = await askClaudeGeneratedQuestions(enhancementResponse.questions);

      // Phase 3: Final synthesis
      console.log('\n\n✨ Claude is synthesizing all information into the final optimized prompt...\n');
      finalPrompt = await runClaudeSynthesis(originalPrompt, analysisResponse, phase1Answers, enhancementResponse, phase2Answers);
    }

    // Create session record
    const session: InteractiveSession = {
      originalPrompt,
      analysisResponse,
      phase1Answers,
      enhancementResponse,
      phase2Answers,
      finalPrompt,
      sessionId: generateSessionId()
    };

    await displayFinalResults(session);
    return finalPrompt;

  } catch (error) {
    console.error('\n❌ Error during Claude CLI interactive improvement:', error);
    console.log('Please ensure Claude CLI is installed and accessible.');
    throw error;
  }
}

/**
 * Phase 1: Use Claude CLI to analyze prompt and generate targeted questions
 */
async function runClaudeAnalysis(prompt: string): Promise<ClaudeAnalysisResponse> {
  const analysisPrompt = `You are an expert prompt engineer analyzing prompts for weaknesses. Your task is to identify specific issues and generate exactly 3 targeted questions to address them.

ORIGINAL PROMPT TO ANALYZE:
${prompt}

Analyze this prompt for these specific weaknesses:
1. **Ambiguity**: Vague language, unclear instructions, multiple interpretations
2. **Missing Context**: Lack of background information, domain knowledge, constraints
3. **Unclear Objectives**: Undefined goals, missing success criteria, vague outcomes

Generate exactly 3 questions that address the most critical weaknesses. Each question should be specific, actionable, and directly related to improving the prompt.

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Your specific question here",
      "focus": "ambiguity|missing_context|unclear_objectives",
      "reasoning": "Why this question addresses a critical weakness"
    },
    {
      "id": "q2", 
      "question": "Your specific question here",
      "focus": "ambiguity|missing_context|unclear_objectives",
      "reasoning": "Why this question addresses a critical weakness"
    },
    {
      "id": "q3",
      "question": "Your specific question here", 
      "focus": "ambiguity|missing_context|unclear_objectives",
      "reasoning": "Why this question addresses a critical weakness"
    }
  ],
  "summary": "Brief 2-3 sentence summary of the main weaknesses identified"
}

Focus on questions that will gather the most valuable information for improving this specific prompt. Make each question unique and non-overlapping.`;

  try {
    // Write prompt to temporary file to avoid shell escaping issues
    const tempFile = `/tmp/prompt-analysis-${Date.now()}.txt`;
    await Bun.write(tempFile, analysisPrompt);
    
    // Use cat to pipe the file content to Claude CLI
    const result = await $`cat ${tempFile} | claude -p`.text();
    
    // Clean up temp file
    await $`rm -f ${tempFile}`;
    
    // Extract JSON from markdown code blocks if needed
    const jsonContent = extractJSONFromMarkdown(result);
    
    if (!jsonContent.startsWith('{')) {
      throw new Error(`Claude returned non-JSON response: ${jsonContent.substring(0, 200)}...`);
    }
    
    return JSON.parse(jsonContent) as ClaudeAnalysisResponse;
  } catch (error) {
    console.error('Error calling Claude CLI for analysis:', error);
    console.log('📝 Note: Using fallback questions while Claude CLI issues are resolved...\n');
    // Fallback response
    return {
      questions: [
        {
          id: "q1",
          question: "What specific outcome or deliverable do you expect from this prompt?",
          focus: "unclear_objectives",
          reasoning: "The prompt lacks clear success criteria"
        },
        {
          id: "q2", 
          question: "What background context or domain knowledge is needed to fulfill this request?",
          focus: "missing_context",
          reasoning: "Additional context would improve response quality"
        },
        {
          id: "q3",
          question: "Are there any constraints, preferences, or requirements that should be specified?",
          focus: "ambiguity",
          reasoning: "Clarifying constraints reduces ambiguity"
        }
      ],
      summary: "The prompt could benefit from clearer objectives, additional context, and reduced ambiguity."
    };
  }
}

/**
 * Phase 2: Use Claude CLI to generate enhancement questions based on Phase 1 responses
 */
async function runClaudeEnhancement(
  originalPrompt: string,
  analysisResponse: ClaudeAnalysisResponse,
  phase1Answers: { [key: string]: string }
): Promise<ClaudeEnhancementResponse> {
  const phase1Summary = Object.entries(phase1Answers)
    .map(([id, answer]) => {
      const question = analysisResponse.questions.find(q => q.id === id);
      return `Q: ${question?.question}\nA: ${answer}`;
    })
    .join('\n\n');

  const enhancementPrompt = `You are an expert prompt engineer working on Phase 2 of prompt improvement. You have the original prompt and Phase 1 responses. Now generate enhancement questions and a preliminary improved prompt.

ORIGINAL PROMPT:
${originalPrompt}

PHASE 1 Q&A:
${phase1Summary}

Your tasks:
1. Create a preliminary improved prompt integrating the Phase 1 responses
2. Generate exactly 3 enhancement questions targeting:
   - **Examples**: What ideal examples would clarify expectations
   - **Edge Cases**: What unusual situations need consideration  
   - **Success Criteria**: How to measure if output meets needs

IMPORTANT: Respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "e1",
      "question": "Your examples question here",
      "type": "examples",
      "reasoning": "Why examples would improve this prompt"
    },
    {
      "id": "e2",
      "question": "Your edge cases question here", 
      "type": "edge_cases",
      "reasoning": "Why edge cases consideration is important"
    },
    {
      "id": "e3",
      "question": "Your success criteria question here",
      "type": "success_criteria", 
      "reasoning": "Why success criteria would help"
    }
  ],
  "preliminary_prompt": "Your improved prompt integrating Phase 1 responses - should be comprehensive and well-structured"
}

Make the preliminary_prompt a significant improvement over the original, incorporating all Phase 1 insights.`;

  try {
    // Write prompt to temporary file to avoid shell escaping issues
    const tempFile = `/tmp/prompt-enhancement-${Date.now()}.txt`;
    await Bun.write(tempFile, enhancementPrompt);
    
    // Use cat to pipe the file content to Claude CLI
    const result = await $`cat ${tempFile} | claude -p`.text();
    
    // Clean up temp file
    await $`rm -f ${tempFile}`;
    
    // Extract JSON from markdown code blocks if needed
    const jsonContent = extractJSONFromMarkdown(result);
    
    if (!jsonContent.startsWith('{')) {
      throw new Error(`Claude returned non-JSON response: ${jsonContent.substring(0, 200)}...`);
    }
    
    return JSON.parse(jsonContent) as ClaudeEnhancementResponse;
  } catch (error) {
    console.error('Error calling Claude CLI for enhancement:', error);
    console.log('📝 Note: Using fallback questions while Claude CLI issues are resolved...\n');
    // Fallback response
    return {
      questions: [
        {
          id: "e1",
          question: "Can you provide 2-3 specific examples of what ideal output would look like?",
          type: "examples",
          reasoning: "Examples help clarify expectations and desired format"
        },
        {
          id: "e2",
          question: "What unusual situations or edge cases should be handled specially?",
          type: "edge_cases", 
          reasoning: "Edge case handling ensures robust responses"
        },
        {
          id: "e3",
          question: "How will you know if the output successfully meets your needs?",
          type: "success_criteria",
          reasoning: "Clear success criteria enable better evaluation"
        }
      ],
      preliminary_prompt: `Enhanced version of: ${originalPrompt}\n\nBased on your Phase 1 responses, here's an improved version that addresses the identified weaknesses.`
    };
  }
}

/**
 * Phase 3: Use Claude CLI to synthesize all information into final optimized prompt
 */
async function runClaudeSynthesis(
  originalPrompt: string,
  analysisResponse: ClaudeAnalysisResponse,
  phase1Answers: { [key: string]: string },
  enhancementResponse: ClaudeEnhancementResponse,
  phase2Answers: { [key: string]: string }
): Promise<string> {
  const phase1Summary = Object.entries(phase1Answers)
    .map(([id, answer]) => {
      const question = analysisResponse.questions.find(q => q.id === id);
      return `Q: ${question?.question}\nA: ${answer}`;
    })
    .join('\n\n');

  const phase2Summary = Object.entries(phase2Answers)
    .map(([id, answer]) => {
      const question = enhancementResponse.questions.find(q => q.id === id);
      return `Q: ${question?.question}\nA: ${answer}`;
    })
    .join('\n\n');

  const synthesisPrompt = `You are an expert prompt engineer creating the final optimized prompt. You have all the information needed to create a comprehensive, high-quality prompt.

ORIGINAL PROMPT:
${originalPrompt}

PRELIMINARY IMPROVED PROMPT:
${enhancementResponse.preliminary_prompt}

PHASE 1 Q&A (Core Issues):
${phase1Summary}

PHASE 2 Q&A (Enhancement):
${phase2Summary}

Create the final optimized prompt that:
- Has a clear objective statement
- Includes comprehensive context
- Specifies formatting requirements
- Incorporates relevant examples
- Defines success criteria
- Is well-structured with markdown formatting
- Leverages all collected information

IMPORTANT: Respond with ONLY the final optimized prompt text. No JSON, no explanations, just the prompt itself. Make it comprehensive and professional.

The final prompt should be significantly better than the original, incorporating all insights gathered through the interactive process.`;

  try {
    // Write prompt to temporary file to avoid shell escaping issues
    const tempFile = `/tmp/prompt-synthesis-${Date.now()}.txt`;
    await Bun.write(tempFile, synthesisPrompt);
    
    // Use cat to pipe the file content to Claude CLI
    const result = await $`cat ${tempFile} | claude -p`.text();
    
    // Clean up temp file
    await $`rm -f ${tempFile}`;
    
    return result.trim();
  } catch (error) {
    console.error('Error calling Claude CLI for synthesis:', error);
    // Fallback to preliminary prompt
    return enhancementResponse.preliminary_prompt;
  }
}

/**
 * Present Claude-generated questions to user using inquirer
 */
async function askClaudeGeneratedQuestions(questions: Array<{ id: string; question: string; reasoning?: string }>): Promise<{ [key: string]: string }> {
  const answers: { [key: string]: string } = {};

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q) continue;
    
    // Create bordered question box
    console.log('\n');
    console.log('┌' + '─'.repeat(76) + '┐');
    console.log('│' + ` 💡 Question ${i + 1}/3`.padEnd(76) + '│');
    console.log('├' + '─'.repeat(76) + '┤');
    console.log('│' + ' '.repeat(76) + '│');
    console.log('│ ' + `📋 ${q.question}`.padEnd(75) + '│');
    if (q.reasoning) {
      console.log('│' + ' '.repeat(76) + '│');
      console.log('│ ' + `🎯 Why this matters: ${q.reasoning}`.padEnd(75) + '│');
    }
    console.log('│' + ' '.repeat(76) + '│');
    console.log('└' + '─'.repeat(76) + '┘');
    console.log();
    
    const { answer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message: 'Your response:',
        validate: (input: string) => {
          if (input.length < 3) {
            return 'Please provide a more detailed response (minimum 3 characters)';
          }
          return true;
        }
      }
    ]);
    
    if (q) {
      answers[q.id] = answer;
    }
  }

  return answers;
}

/**
 * Display final results and handle user actions
 */
async function displayFinalResults(session: InteractiveSession): Promise<void> {
  // Enhanced completion header
  console.log('\n' + '╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('║' + ' ✅ Claude CLI Interactive Improvement Completed!'.padEnd(58) + '║');
  console.log('║' + ' '.repeat(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log();
  
  console.log('📊 IMPROVEMENT SUMMARY:');
  console.log(`   Original length: ${session.originalPrompt.length} characters`);
  console.log(`   Final length: ${session.finalPrompt.length} characters`);
  console.log(`   Enhancement ratio: ${Math.round((session.finalPrompt.length / session.originalPrompt.length) * 100)}%`);
  console.log(`   Questions answered: ${Object.keys(session.phase1Answers).length + Object.keys(session.phase2Answers).length}\n`);

  // Display the final prompt with enhanced borders
  console.log('\n' + '╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║' + ' 🎯 FINAL OPTIMIZED PROMPT'.padEnd(78) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╠' + '═'.repeat(78) + '╣');
  console.log('║' + ' '.repeat(78) + '║');
  
  // Split prompt into lines and add borders
  const promptLines = session.finalPrompt.split('\n');
  for (const line of promptLines) {
    console.log('║ ' + line.padEnd(77) + '║');
  }
  
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  // Handle user actions
  const { action } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'action',
      message: 'Copy the final prompt to clipboard?',
      default: true
    }
  ]);

  if (action) {
    const success = await copyToClipboard(session.finalPrompt);
    if (success) {
      console.log('✅ Final prompt copied to clipboard!');
    } else {
      console.log('⚠️  Could not copy to clipboard');
    }
  }

  console.log('\n🎉 Claude CLI interactive improvement session completed successfully!');
}

/**
 * Utility functions
 */
function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function copyToClipboard(text: string): Promise<boolean> {
  const platform = process.platform;
  
  try {
    switch (platform) {
      case 'darwin':
        await $`echo ${text} | pbcopy`;
        break;
      case 'linux':
        await $`echo ${text} | xclip -selection clipboard`;
        break;
      case 'win32':
        await $`echo ${text} | clip`;
        break;
      default:
        return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}