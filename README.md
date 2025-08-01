# Prompt Improver CLI

A fast CLI tool for enhancing prompts using Claude CLI and advanced prompt engineering techniques. Built with Bun and TypeScript for superior performance and developer experience.

## Features

- **Interactive Mode by Default**: Dynamic question generation powered by Claude CLI
- **Advanced Analysis**: 9-metric quality assessment with task type detection
- **Pattern Recognition**: Identifies Chain-of-Thought, Few-Shot Learning, and other techniques
- **Framework Recommendations**: Suggests optimal frameworks (5C, RACE, CoT, Tree-of-Thoughts)
- **Lightning Fast**: Built with Bun for 28x faster startup than Node.js
- **Automatic Clipboard Integration**: Results copied to clipboard automatically
- **Cross-Platform**: Works on macOS, Linux, and Windows

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

### Interactive Mode (Default)

```bash
# Launch interactive mode
./src/cli.ts

# Interactive mode guides you through:
# 1. Prompt analysis with targeted questions
# 2. Enhancement suggestions based on your responses
# 3. Final optimized prompt generation
```

### Quick Analysis Mode

```bash
# Direct prompt argument
./src/cli.ts "write a function to sort an array"

# Read from stdin pipe
echo "improve this code" | ./src/cli.ts

# Force analysis mode
./src/cli.ts analyze "my prompt text"
```

### File Input

```bash
# Standard file analysis
./src/cli.ts file my-prompt.txt

# Interactive mode with file input
./src/cli.ts file my-prompt.txt --interactive
```

## How It Works

The tool uses a two-phase interactive approach powered by Claude CLI:

### Phase 1: Core Weakness Analysis
Claude analyzes your prompt and generates targeted questions addressing:
- **Ambiguity**: Vague language and unclear instructions
- **Missing Context**: Lack of background information or constraints
- **Unclear Objectives**: Undefined goals and success criteria

### Phase 2: Enhancement & Refinement
Based on your responses, Claude generates follow-up questions about:
- **Examples**: Ideal output demonstrations
- **Edge Cases**: Unusual situations to handle
- **Success Criteria**: Measurable quality indicators

### Analysis Features

- **9-Metric Quality Assessment**: Accuracy, clarity, thoroughness, conciseness, transparency, safety, privacy, fairness, and overall score
- **Task Type Detection**: Automatically identifies reasoning, creative, code, analysis, factual, or conversation tasks
- **Pattern Recognition**: Detects existing prompt engineering techniques
- **Framework Recommendations**: Suggests optimal structures based on your specific needs

## Architecture

```
prompt-improver-cli/
├── src/
│   ├── cli.ts           # Main CLI application and analysis engine
│   └── interactive.ts   # Claude CLI-driven interactive mode
├── dist/                # Built binaries (created by build)
├── package.json         # Project configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## Development

### Development Commands

```bash
# Run in development mode
bun run dev

# Build standalone binary
bun run build

# Type checking
bun run lint

# Run tests
bun test
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

## Example Session

**Input Prompt:**
```
make a news app in the terminal
```

**Interactive Analysis:**
1. Claude identifies extreme vagueness and lack of technical context
2. Generates targeted questions about news sources, display format, and functionality
3. Creates enhanced prompt based on your responses
4. Produces final optimized prompt with clear structure and requirements

**Result:** A comprehensive, well-structured prompt with specific requirements, technical constraints, and success criteria.

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

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude and Claude CLI
- [Bun](https://bun.sh) for the runtime
- Prompt engineering research community