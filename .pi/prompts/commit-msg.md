---
description: Explain code changes in commit message format
argument-hint: "[scope]"
---
Analyze the current git diff and generate a conventional commit message.

Scope: ${1:-general}

Requirements:
- Subject line: imperative mood, max 50 chars, no trailing period
- Body (if needed): explain *why*, not *what*; wrap at 72 chars
- Use conventional commits format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore

Focus on the intent of the change, not just the surface modifications.
