# Expense Tracker — Claude Instructions

## Project Overview
A vanilla HTML/CSS/JS expense tracking web app. No build tools, no frameworks, no dependencies. Open `index.html` directly in a browser.

## File Structure
- `index.html` — markup only
- `style.css` — all styles
- `script.js` — all application logic

## Git & GitHub Workflow

**This project uses Git with GitHub for version control. Follow these rules on every session:**

1. **Commit early and often.** After completing any meaningful unit of work (a feature, a bug fix, a refactor), stage and commit before moving on.
2. **Push after every commit.** Always run `git push` immediately after committing so the remote is never behind. We rely on GitHub as our save point — local-only commits are not acceptable.
3. **Write clean, descriptive commit messages.** Use the imperative mood, keep the subject line under 72 characters, and summarize *what* changed and *why* if it isn't obvious. Examples:
   - `Add category filter to transaction list`
   - `Fix budget progress bar not resetting on budget change`
   - `Extract inline styles into CSS variables`
4. **Never force-push to main** unless the user explicitly asks.
5. **One logical change per commit.** Don't bundle unrelated changes together.

## Code Style
- Vanilla JS only — no frameworks or build steps
- Keep all CSS in `style.css`, all JS in `script.js`, all markup in `index.html`
- Follow existing naming conventions (kebab-case classes, camelCase JS)
