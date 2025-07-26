# AI Collaboration Guide - Working with Claude Code

**Living Document** - Updated as collaboration patterns evolve  
**Last Updated**: January 2025

## Philosophy: Living Documentation Strategy

This project uses a **three-tier documentation approach** to prevent AI confusion while allowing architectural evolution:

### Tier 1: Immutable Core (CLAUDE.md)
- **Purpose**: Fundamental principles that rarely change
- **Content**: Technology stack, core patterns, essential commands
- **Update Frequency**: Only when core architecture changes
- **Location**: Root directory (required for Claude Code)

### Tier 2: Living Strategy (docs/development/)
- **Purpose**: Detailed, evolving development guidance
- **Content**: Current architecture, implementation patterns, this guide
- **Update Frequency**: Updated as patterns emerge and evolve
- **Responsibility**: Updated by developer or Claude Code when explicitly asked

### Tier 3: Session Context (Conversation-based)
- **Purpose**: Real-time context for current work
- **Method**: Direct communication in session
- **Examples**: "We've moved from X to Y approach", "Update patterns to account for Z"

## How to Work Effectively with Claude Code

### 1. Starting New Sessions

**Always provide context for major changes:**
```
"The authentication system has changed from [old] to [new]. 
Update your approach and suggest any CLAUDE.md changes needed."
```

**Reference current state:**
```
"Check docs/development/current-architecture.md for the latest system design 
before implementing this feature."
```

### 2. Handling Architecture Evolution

**When making significant changes:**

1. **Communicate Changes First**:
   ```
   "We're switching from Firebase Auth to Supabase. 
   This affects the auth patterns in coding-patterns.md."
   ```

2. **Ask for Documentation Updates**:
   ```
   "Update docs/development/current-architecture.md to reflect this change 
   and suggest updates to CLAUDE.md if core principles changed."
   ```

3. **Validate Consistency**:
   ```
   "Review the updated architecture and check if other patterns 
   in coding-patterns.md need updates."
   ```

### 3. Preventing Documentation Drift

**Monthly Architecture Review** (or when major features are added):
```
"Review docs/development/ and identify any inconsistencies with the current codebase. 
Suggest updates to keep documentation aligned."
```

**Before Major Refactoring**:
```
"Before we refactor [component/system], review current-architecture.md 
to understand dependencies and suggest documentation updates needed."
```

## Claude Code Collaboration Patterns

### 1. Feature Development Workflow

**Step 1: Context Setting**
```
User: "We're adding a new student dashboard. Check current-architecture.md 
for the existing patterns and suggest implementation approach."

Claude: Reviews docs, suggests approach aligned with current patterns
```

**Step 2: Implementation**
```
User: "Implement the student dashboard using the patterns we discussed."

Claude: Implements following established patterns from docs/development/
```

**Step 3: Documentation Updates**
```
User: "Update current-architecture.md to include the new student dashboard 
and add any new patterns to coding-patterns.md."

Claude: Updates living documentation with new information
```

### 2. Pattern Evolution Workflow

**When Establishing New Patterns**:
```
User: "We've discovered a better way to handle [X]. 
Update coding-patterns.md with this new approach."

Claude: Updates patterns documentation with rationale and examples
```

**When Deprecating Old Patterns**:
```
User: "The old [Y] pattern is deprecated. Remove it from coding-patterns.md 
and update any references."

Claude: Cleans up documentation and suggests migration steps
```

### 3. Consistency Checking

**Regular Consistency Checks**:
```
User: "Review the codebase against docs/development/coding-patterns.md 
and identify any inconsistencies."

Claude: Analyzes code vs. documentation and suggests alignments
```

**Before Major Releases**:
```
User: "Before we deploy, review all documentation in docs/development/ 
for accuracy and completeness."

Claude: Comprehensive documentation review and update suggestions
```

## Common Collaboration Scenarios

### Scenario 1: New Developer Onboarding
```
User: "A new developer is joining. What should they read first?"

Claude Response:
1. Main README.md for project overview
2. CLAUDE.md for core principles
3. docs/development/current-architecture.md for system understanding
4. docs/development/coding-patterns.md for implementation details
```

### Scenario 2: Technology Migration
```
User: "We're migrating from [old tech] to [new tech]. 
Help plan the documentation updates needed."

Claude Response:
1. Identifies all affected documentation
2. Suggests update sequence (core principles → architecture → patterns)
3. Provides migration checklist
4. Updates documentation systematically
```

### Scenario 3: Pattern Conflicts
```
User: "I see conflicting patterns between the code and documentation. 
Which should we follow?"

Claude Response:
1. Analyzes both approaches
2. Identifies the more current/better pattern
3. Suggests documentation updates
4. Provides migration path if needed
```

## Documentation Update Triggers

### Automatic Update Situations
- Adding new major features
- Changing core technology stack
- Establishing new coding patterns
- Discovering better implementation approaches

### Manual Review Triggers
- Monthly architecture review
- Before major releases
- When onboarding new team members
- After completing major refactoring

## Best Practices for AI Collaboration

### 1. Be Explicit About Changes
```
✅ Good: "The auth system now uses JWT tokens instead of sessions. 
         Update the patterns accordingly."

❌ Poor: "The auth changed." (too vague)
```

### 2. Reference Documentation
```
✅ Good: "Follow the API patterns in coding-patterns.md for this endpoint."

❌ Poor: "Make this endpoint like the others." (unclear reference)
```

### 3. Request Documentation Updates
```
✅ Good: "Add this new pattern to coding-patterns.md with examples."

❌ Poor: Implementing new patterns without documenting them
```

### 4. Validate Consistency
```
✅ Good: "Check if this change affects current-architecture.md."

❌ Poor: Making changes without considering documentation impact
```

## Error Recovery Strategies

### When Claude Gives Outdated Advice
1. **Correct Immediately**: "That pattern is outdated. We now use [new pattern]."
2. **Update Documentation**: "Update coding-patterns.md to reflect this change."
3. **Provide Context**: "This changed because [reason]."

### When Documentation is Inconsistent
1. **Identify Conflicts**: "There's a conflict between code and docs in [area]."
2. **Determine Truth**: "The code is correct. Update documentation to match."
3. **Systematic Update**: "Review all related documentation for similar issues."

### When Architecture Evolves
1. **Announce Changes**: "Our architecture is evolving in [direction]."
2. **Update Systematically**: Start with current-architecture.md, then patterns
3. **Validate Changes**: "Review all docs for consistency after these updates."

## Measuring Collaboration Success

### Good Indicators
- Claude gives advice consistent with current codebase
- Documentation stays current without daily maintenance
- New features follow established patterns automatically
- Onboarding new developers is smooth

### Warning Signs
- Frequent conflicts between Claude advice and codebase
- Documentation falling behind actual implementation
- Inconsistent pattern usage across features
- Confusion during development sessions

---

**Remember**: This is a living system. Update this guide as you discover better collaboration patterns with Claude Code.