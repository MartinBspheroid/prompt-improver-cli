#!/usr/bin/env bun
/**
 * Prompt Improver CLI - Bun Edition
 * A fast TypeScript CLI tool for enhancing prompts using Claude CLI and prompt engineering best practices
 */

import { $ } from "bun";

interface PromptAnalysis {
  issues: string[];
  suggestions: string[];
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
 * Analyze prompt for common issues and improvement opportunities
 */
function analyzePrompt(prompt: string): PromptAnalysis {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check for vagueness
  const vageWords = ["good", "nice", "better", "improve", "help", "some", "things"];
  if (vageWords.some(word => prompt.toLowerCase().includes(word))) {
    issues.push("Contains vague language");
    suggestions.push("Replace vague terms with specific requirements");
  }
  
  // Check for structure
  if (!["<", "###", "1.", "2.", "-"].some(marker => prompt.includes(marker))) {
    issues.push("Lacks clear structure");
    suggestions.push("Add structure using XML tags or numbered steps");
  }
  
  // Check for context
  if (prompt.split(" ").length < 20) {
    issues.push("May lack sufficient context");
    suggestions.push("Add background information and constraints");
  }
  
  // Check for examples
  if (!prompt.toLowerCase().includes("example")) {
    suggestions.push("Consider adding examples of desired output");
  }
  
  return { issues, suggestions };
}

/**
 * Create a meta-prompt to improve the original prompt using best practices
 */
function createImprovementPrompt(originalPrompt: string): string {
  return `<role>You are an expert prompt engineer specializing in creating high-quality prompts for AI models</role>

<context>
<original_prompt>
${originalPrompt}
</original_prompt>

<date>2025-01-28</date>
<model>claude-4</model>
</context>

<task>
Analyze the original prompt above and create an improved version following current best practices for Claude 4. Apply the Five Pillars of Exceptional Prompting:

1. Surgical Specificity - Make every instruction precise
2. Context as Architecture - Provide comprehensive background
3. Structure as Clarity - Use XML tags for organization
4. Leading by Example - Include examples where helpful
5. Optimization for iteration - Design for refinement

</task>

<instructions>
<step1>Identify specific weaknesses in the original prompt</step1>
<step2>Enhance specificity by adding modifiers (scope, depth, completeness)</step2>
<step3>Add relevant context, constraints, and background information</step3>
<step4>Structure using XML tags for clear organization</step4>
<step5>Include examples if they would improve clarity</step5>
<step6>Add output format specifications</step6>
</instructions>

<output_format>
# Prompt Analysis
**Issues Found:**
- [List specific issues]

**Improvements Made:**
- [List enhancements]

# Improved Prompt
[The enhanced prompt following best practices]

# Usage Notes
[Any additional context about how to use the improved prompt effectively]
</output_format>

<thinking_instruction>
Consider the specific task the user is trying to accomplish and optimize the prompt structure accordingly. Focus on clarity, specificity, and actionable instructions.
</thinking_instruction>`;
}

/**
 * Run Claude CLI with the improvement prompt using Bun's shell integration
 */
async function runClaudeImprovement(prompt: string): Promise<string> {
  const improvementPrompt = createImprovementPrompt(prompt);
  
  try {
    // Write prompt to temporary file
    const tempFile = `/tmp/prompt-improver-${Date.now()}.txt`;
    await Bun.write(tempFile, improvementPrompt);
    
    // Run claude with the prompt file using Bun shell
    const result = await $`claude -p ${tempFile}`.text();
    
    // Clean up temporary file
    await $`rm ${tempFile}`;
    
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
 * Display usage information
 */
function showUsage(): void {
  console.log(`
🚀 Prompt Improver CLI (Bun Edition)

Usage:
  prompt-improver.ts <prompt>              Direct prompt argument
  prompt-improver.ts -f <file>             Read prompt from file
  echo 'prompt' | prompt-improver.ts       Read from stdin pipe
  prompt-improver.ts --help                Show this help

Examples:
  prompt-improver.ts "write a function"
  echo "improve this code" | prompt-improver.ts
  prompt-improver.ts -f my-prompt.txt

Features:
  ✨ Fast TypeScript execution with Bun
  🔍 Prompt analysis and improvement suggestions
  📋 Automatic clipboard integration
  🛠️ Shell integration for Claude CLI
  `);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const args = Bun.argv.slice(2);
  
  // Handle help flag
  if (args.includes("--help") || args.includes("-h")) {
    showUsage();
    process.exit(0);
  }
  
  let prompt = "";
  
  try {
    // Handle different input methods
    if (args.length === 0) {
      // Try to read from stdin
      const stdin = await Bun.stdin.text();
      if (stdin.trim()) {
        prompt = stdin.trim();
      } else {
        showUsage();
        process.exit(1);
      }
    } else if (args[0] === "-f") {
      // Read from file
      if (args.length < 2) {
        console.error("Error: Please specify a file");
        process.exit(1);
      }
      
      const file = Bun.file(args[1]);
      if (!(await file.exists())) {
        console.error(`Error: File '${args[1]}' not found`);
        process.exit(1);
      }
      
      prompt = await file.text();
    } else {
      // Command line arguments
      prompt = args.join(" ");
    }
    
    if (!prompt.trim()) {
      console.error("Error: No prompt provided");
      process.exit(1);
    }
    
    console.log("🚀 Analyzing and improving your prompt...\n");
    
    // Quick analysis
    const analysis = analyzePrompt(prompt);
    if (analysis.issues.length > 0) {
      console.log("📊 Quick Analysis:");
      analysis.issues.forEach(issue => {
        console.log(`  ⚠️  ${issue}`);
      });
      console.log();
    }
    
    // Run Claude improvement
    console.log("🧠 Running Claude CLI for detailed improvement...\n");
    const improvedResult = await runClaudeImprovement(prompt);
    
    console.log(improvedResult);
    
    // Try to copy to clipboard
    const clipboardSuccess = await copyToClipboard(improvedResult);
    if (clipboardSuccess) {
      console.log("\n✅ Result copied to clipboard!");
    } else {
      console.log("\n⚠️  Could not copy to clipboard");
    }
    
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
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