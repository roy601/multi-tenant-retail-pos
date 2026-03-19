# Contributing to Mobile POS

Thank you for your interest in contributing to Mobile POS! This document provides guidelines and instructions for contributing to the project.

## 🐛 Reporting Bugs

If you find a bug, please create an issue with:
- **Clear description** of the bug
- **Steps to reproduce** the issue
- **Expected vs. actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Screenshots** if applicable

## 💡 Suggesting Features

We welcome feature suggestions! Please include:
- **Clear use case** for the feature
- **Proposed implementation** (if you have ideas)
- **Potential alternatives** you've considered
- **Any relevant examples** from other systems

## 🔧 Setting Up Development Environment

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/your-username/mobile-pos.git
   cd mobile-pos
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Then edit .env.local with your Supabase and database credentials
   ```

4. **Start development server**:
   ```bash
   pnpm run dev
   ```

## 📝 Code Style Guidelines

- **TypeScript**: Use strict typing, avoid `any`
- **React**: Prefer functional components with hooks
- **Naming**: Use descriptive names for variables and functions
  - Components: PascalCase (e.g., `UserProfile.tsx`)
  - Utilities: camelCase (e.g., `validateEmail.ts`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_ITEMS`)
- **Comments**: Use comments for "why", not "what"
- **Formatting**: Code is auto-formatted with Prettier (configured in the project)

## 🧪 Testing

- Write unit tests for utility functions
- Test edge cases and error scenarios
- Run linter before committing:
  ```bash
  pnpm run lint
  ```

## 📦 Commit Guidelines

Follow conventional commits format:
```
type(scope): description

- fix: bug fixes (scope: component/module name)
- feat: new features
- docs: documentation updates
- style: formatting/styling changes
- refactor: code restructuring
- perf: performance improvements
- test: test additions or changes
```

Example:
```
feat(pos): add customer loyalty program

- Added points accumulation on purchases
- Created rewards redemption interface
- Added analytics for loyalty engagement
```

## 🚀 Submitting Pull Requests

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Keep commits atomic** - one feature per commit

3. **Build and test locally**:
   ```bash
   pnpm run lint
   pnpm run build
   ```

4. **Push to your fork** and create a Pull Request

5. **PR Description** should include:
   - What changes were made
   - Why they were made
   - How to test the changes
   - Any breaking changes

## ⚖️ Legal Notice

By contributing to Mobile POS, you agree that your contributions will be licensed under the same license as the project.

## 📞 Questions?

Feel free to open an issue to ask questions or discuss ideas. We're here to help!

---

**Thank you for helping improve Mobile POS! 🎉**
