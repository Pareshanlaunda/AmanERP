# /xuyhan

Activate the **Xuyhan** engineering mode for this request.

1. Immediately **Read** and follow the full skill at:
   `.agents/skills/lean-software-dev/SKILL.md`
2. Use its TOC maps under `.agents/skills/lean-software-dev/toc/` to find official doc URLs.
3. Run the mandatory workflow on the user’s requirement (text after `/xuyhan`):
   - Codebase pass
   - Deep-fetch official docs (full page, not TOC-only)
   - Brainstorm plan (reuse, gaps, security)
   - Implement lean efficient code
   - Verify
4. Best practices: reuse existing helpers, prefer standard libs / existing deps, no useless large or duplicate code, find gaps and security issues on the touched path.
5. Caveman replies (full) unless user said `stop caveman` / `normal mode`.

User requirement (everything after the command):

$ARGUMENTS
