# Documentation Index

Welcome to the Roo Auto-Grading System documentation. This directory contains all project documentation organized by purpose and audience.

## Quick Navigation

### 🚀 **Getting Started**
- [`../README.md`](../README.md) - Main project overview and quick start
- [`../CLAUDE.md`](../CLAUDE.md) - Core guidance for Claude Code AI assistant
- [`PROJECT_ROADMAP.md`](PROJECT_ROADMAP.md) - High-level project status and goals

### 🏗️ **Development**
- [`development/current-architecture.md`](development/current-architecture.md) - **Living system design** (updated as system evolves)
- [`development/coding-patterns.md`](development/coding-patterns.md) - **Implementation patterns** and best practices
- [`development/ai-collaboration-guide.md`](development/ai-collaboration-guide.md) - **How to work with Claude Code** effectively
- [`development/detailed-roadmap.md`](development/detailed-roadmap.md) - Detailed development plan and phases

### 🚀 **Deployment**
- [`deployment/emulator-guide.md`](deployment/emulator-guide.md) - Firebase emulator setup and usage
- [`deployment/firebase-setup.md`](deployment/firebase-setup.md) - Production Firebase configuration *(Coming Soon)*
- [`deployment/production-deployment.md`](deployment/production-deployment.md) - Production deployment guide *(Coming Soon)*

### 🧪 **Testing**
- [`testing/testing-strategy.md`](testing/testing-strategy.md) - Overall testing approach *(Coming Soon)*
- [`testing/manual-testing-guide.md`](testing/manual-testing-guide.md) - How to use manual test scripts *(Coming Soon)*
- [`testing/automated-testing.md`](testing/automated-testing.md) - Unit/integration/E2E testing *(Coming Soon)*

## Documentation Philosophy

This project uses a **three-tier documentation strategy**:

### Tier 1: Core Principles (`../CLAUDE.md`)
- Fundamental, rarely-changing guidance
- Technology stack and essential patterns
- Updated only when core architecture changes

### Tier 2: Living Documentation (`docs/development/`)
- Detailed, evolving guidance that changes with the project
- Current architecture, implementation patterns, collaboration guides
- Updated as patterns emerge and evolve

### Tier 3: Session Context
- Real-time guidance provided in development sessions
- Immediate feedback and course corrections
- Not documented but communicated directly

## For Different Audiences

### 👨‍💻 **New Developers**
Start here:
1. [`../README.md`](../README.md) - Project overview
2. [`../CLAUDE.md`](../CLAUDE.md) - Core principles
3. [`development/current-architecture.md`](development/current-architecture.md) - System understanding
4. [`development/coding-patterns.md`](development/coding-patterns.md) - Implementation details

### 🤖 **AI Assistants (Claude Code)**
Primary references:
1. [`../CLAUDE.md`](../CLAUDE.md) - **Core, stable guidance**
2. [`development/current-architecture.md`](development/current-architecture.md) - **Current system state**
3. [`development/ai-collaboration-guide.md`](development/ai-collaboration-guide.md) - **Collaboration patterns**

### 📊 **Project Stakeholders**
Executive view:
1. [`PROJECT_ROADMAP.md`](PROJECT_ROADMAP.md) - High-level status and goals
2. [`development/detailed-roadmap.md`](development/detailed-roadmap.md) - Detailed implementation plans

### 🔧 **DevOps/Deployment**
Operations focus:
1. [`deployment/emulator-guide.md`](deployment/emulator-guide.md) - Local development
2. [`deployment/production-deployment.md`](deployment/production-deployment.md) - Production setup

## Maintenance Guidelines

### When to Update Documentation

**Always Update**:
- Adding new major features → Update `current-architecture.md`
- Establishing new patterns → Update `coding-patterns.md`
- Changing core technology → Update `../CLAUDE.md`
- Completing roadmap phases → Update `PROJECT_ROADMAP.md`

**Regular Reviews**:
- Monthly architecture review
- Before major releases
- When onboarding new team members
- After completing major refactoring

### How to Keep Documentation Current

1. **Link Changes to Documentation**: When making significant code changes, include documentation updates in the same PR
2. **Use Living Documents**: Most documents in `development/` are marked as "Living" - update them as the system evolves
3. **Validate Consistency**: Regularly check that documentation matches actual implementation
4. **Archive Outdated Information**: Remove obsolete patterns and mark deprecated approaches

## Documentation Standards

### File Naming
- Use kebab-case: `current-architecture.md`
- Include purpose in name: `ai-collaboration-guide.md`
- Date major revisions: `roadmap-2025-q1.md` (if needed)

### Content Structure
- **Status indicators**: Living Document, Last Updated, etc.
- **Clear headings**: Use semantic markdown structure
- **Code examples**: Include actual code snippets with proper syntax highlighting
- **Update triggers**: Explain when to update the document

### Cross-References
- Link to related documents
- Reference specific sections when helpful
- Maintain bidirectional links where appropriate

---

**Need Help?** 
- Check [`development/ai-collaboration-guide.md`](development/ai-collaboration-guide.md) for working with Claude Code
- Review [`../CLAUDE.md`](../CLAUDE.md) for core project principles
- See [`PROJECT_ROADMAP.md`](PROJECT_ROADMAP.md) for current status and priorities