# Prompt Improver CLI

A sophisticated CLI tool for enhancing prompts using Claude CLI and advanced prompt engineering techniques. Features multiple improvement modes, dynamic analysis, and iterative refinement capabilities. Built with Bun and TypeScript for superior performance and developer experience.

## Features

### Core Capabilities
- **Multiple Improvement Modes**: Fast, balanced, thorough, and research modes with different quality/speed tradeoffs
- **Self-Refine Loop**: Iterative improvement with Claude-powered critique until quality targets are met
- **Dynamic Analysis**: Context-aware analysis that identifies domain-specific issues beyond static rules
- **Progressive Enhancement**: Systematic 5-layer improvement pipeline (Structure → Context → Examples → Constraints → Success Criteria)
- **Hybrid Intelligence**: Combines static analysis with AI-powered insights for comprehensive evaluation

### Analysis & Intelligence
- **9-Metric Quality Assessment**: Accuracy, clarity, thoroughness, conciseness, transparency, safety, privacy, fairness, and overall scoring
- **Domain Detection**: Automatically detects and optimizes for technical, creative, business, and academic contexts
- **Cultural Sensitivity**: Identifies potential bias and cultural considerations
- **Pattern Recognition**: Detects and applies Chain-of-Thought, Few-Shot Learning, and other prompt engineering patterns
- **Framework Recommendations**: Suggests optimal structures (5C, RACE, CoT, Tree-of-Thoughts) based on task type

### Technical Features
- **Lightning Fast**: Built with Bun for 28x faster startup than Node.js
- **Intelligent Caching**: Reduces API costs through smart response caching
- **Cost Control**: Configurable Claude API call limits and budget tracking
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Automatic Clipboard Integration**: Results copied to clipboard automatically

## Installation

### Prerequisites

- [Bun](https://bun.sh) runtime installed
- [Claude CLI](https://github.com/anthropics/claude-cli) installed and configured

### Install from Source

```bash
git clone https://github.com/yourusername/prompt-improver-cli.git
cd prompt-improver-cli
bun install
chmod +x src/cli.ts
```

### Build Standalone Binary

```bash
bun run build
# Creates ./dist/prompt-improver executable
```

### Install Globally

```bash
bun run install-global
# Installs to /usr/local/bin/prompt-improver
```

## Usage

### Basic Usage

```bash
# Analyze a prompt with default balanced mode
./src/cli.ts analyze "write a function to sort an array"

# Read from stdin pipe
echo "improve this code" | ./src/cli.ts analyze

# Interactive mode (dynamic question generation)
./src/cli.ts interactive
```

### Improvement Modes

```bash
# Fast mode - quick improvements (2 Claude calls)
./src/cli.ts analyze "my prompt" --mode fast

# Balanced mode - self-refine loop (3-5 Claude calls)
./src/cli.ts analyze "my prompt" --mode balanced --show-progress

# Thorough mode - progressive enhancement pipeline (5-10 Claude calls)
./src/cli.ts analyze "my prompt" --mode thorough --target-quality 9.0

# Research mode - comprehensive analysis (10-15 Claude calls)
./src/cli.ts analyze "my prompt" --mode research --max-iterations 5
```

### Advanced Options

```bash
# Custom quality target and iteration limits
./src/cli.ts analyze "my prompt" --target-quality 8.5 --max-iterations 3

# Control Claude API usage
./src/cli.ts analyze "my prompt" --max-claude-calls 5

# Disable self-refine loop
./src/cli.ts analyze "my prompt" --no-self-refine

# Show detailed progress and analysis
./src/cli.ts analyze "my prompt" --show-progress
```

### File Input

```bash
# Analyze prompt from file
./src/cli.ts file my-prompt.txt --mode balanced --show-progress
```

### Testing

```bash
# Run sample tests
./src/cli.ts test --sample

# View available test options
./src/cli.ts test
```

## How It Works

The tool employs multiple sophisticated enhancement strategies depending on the selected mode:

### Improvement Strategies

**Fast Mode**: Quick single-pass improvement using static analysis and basic Claude enhancement.

**Balanced Mode**: Self-refine loop with iterative improvement:
1. **Initial Analysis**: Static + dynamic analysis identifies weaknesses
2. **Enhancement**: Claude generates improved version
3. **Self-Critique**: Claude evaluates and scores the improvement
4. **Refinement**: Process repeats until quality target is met

**Thorough Mode**: Progressive enhancement pipeline:
1. **Structure & Clarity**: Add headers, bullet points, logical flow
2. **Context & Background**: Include domain-specific context and constraints
3. **Examples & Patterns**: Add demonstrations and templates
4. **Constraints & Requirements**: Specify limits and edge cases
5. **Success Criteria**: Define measurable quality indicators

**Research Mode**: Comprehensive analysis with academic-grade thoroughness including cross-domain optimization and citation generation.

### Analysis Components

**Static Analysis**: Rule-based evaluation of 9 quality metrics, task type detection, and pattern recognition.

**Dynamic Analysis**: Claude-powered evaluation that identifies:
- Domain-specific issues that static rules miss
- Cultural sensitivity and bias considerations
- Implicit assumptions that should be explicit
- Missing success criteria specific to the task
- Overlooked edge cases for the domain

**Hybrid Intelligence**: Synthesizes static and dynamic insights to provide prioritized improvements and confidence scoring.

## Architecture

```
prompt-improver-cli/
├── src/
│   ├── cli.ts                    # Main CLI application and analysis engine
│   ├── interactive.ts            # Claude CLI-driven interactive mode
│   ├── config.ts                 # Configuration system and mode definitions
│   ├── self-refine.ts            # Iterative improvement with quality gates
│   ├── dynamic-analysis.ts       # Context-aware Claude-powered analysis
│   └── progressive-enhancer.ts   # 5-layer systematic enhancement pipeline
├── tada/                         # Advanced features and experimental enhancements
│   ├── testing.ts               # LLM-based evaluation framework
│   ├── testing.md               # Testing documentation
│   ├── key-patterns.md          # Implementation patterns from research
│   └── setup-local-testing.sh   # Local LLM setup for testing
├── dist/                         # Built binaries (created by build)
├── package.json                  # Project configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                    # This file
```

## Development

### Development Commands

```bash
# Run in development mode
bun run dev

# Build standalone binary
bun run build

# Type checking and linting
bun run check        # Run both typecheck and lint
bun run typecheck   # TypeScript type checking only
bun run lint        # Oxlint fast linting
bun run lint:fix    # Auto-fix linting issues

# Testing
bun test            # Unit tests
./src/cli.ts test --sample  # Sample prompt improvement tests
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Requirements

- **Bun** >= 1.0.0
- **Claude CLI** configured with API access
- **System clipboard** support (xclip on Linux, pbcopy on macOS, clip on Windows)

## Configuration

The tool uses Claude CLI's existing configuration. Ensure Claude CLI is properly set up:

```bash
# Test Claude CLI
claude "Hello, Claude!"

# Configure if needed
claude configure
```

## Example Transformations

### Basic Example
**Input:**
```
write code
```

**Output (Balanced Mode):**
```
Write a Python function named `calculate_monthly_payment` that calculates 
the monthly mortgage payment for a home loan. The function should take three 
parameters: loan_amount (float), annual_interest_rate (float as decimal), 
and loan_term_years (int). Use the standard mortgage payment formula with 
comprehensive error handling for invalid inputs. Include a detailed docstring 
with examples and follow PEP 8 style guidelines.
```

### Advanced Example  
**Input:**
```
help me write a blog post
```

**Output (Thorough Mode):**
A comprehensive 2,200-word content brief specifying target audience, structure, 
word count targets, specific requirements, implementation timeline, technical 
depth guidelines, success criteria, and 5 concrete action items - transforming 
a generic request into a professional-grade content specification.

## Troubleshooting

### Common Issues

**"Claude CLI not found"**
- Install Claude CLI following the official documentation
- Verify it's accessible: `which claude`

**Interactive session hangs**
- Ensure Claude CLI is properly configured
- Check your API access and authentication

**Permission denied**
- Make script executable: `chmod +x src/cli.ts`
- Verify Bun installation: `bun --version`

**Clipboard issues**
- Linux: Install `sudo apt install xclip`
- The tool gracefully handles clipboard failures

**Mode-specific issues**
- If thorough mode seems slow, try balanced mode first
- Research mode requires significant Claude API calls - monitor usage
- Use `--show-progress` to track enhancement progress

**Quality concerns**
- Adjust `--target-quality` based on your needs (6.0-9.5 range)
- Use `--max-iterations` to control improvement depth
- Try different modes if results don't meet expectations

## License

MIT License - see LICENSE file for details.

## Advanced Features

The `tada/` folder contains experimental and advanced features:

- **LLM-based Testing**: Multi-LLM evaluation framework for quality assurance
- **A/B Testing**: Compare different improvement strategies  
- **Local Testing Setup**: Use local LLMs to reduce API costs during development
- **Regression Testing**: Ensure improvements maintain quality over time

See `tada/testing.md` for detailed documentation on advanced testing capabilities.

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and Claude CLI
- [Bun](https://bun.sh) for the runtime
- [Oxlint](https://oxc.rs) for fast TypeScript linting
- Prompt engineering research community