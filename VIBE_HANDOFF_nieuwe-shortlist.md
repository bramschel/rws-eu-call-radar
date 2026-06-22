# VIBE HANDOFF - Nieuwe Shortlist

## Repo and Branch
- **Repo**: `C:\dev\rws-eu-call-radar`
- **Branch**: `nieuwe-shortlist`

## Current Goal
- **Rework existing Shortlist tab** (not a new tab)
- Create overview-first layout with many calls visible
- Implement expand/collapse details per call
- Keep Radar tab and AI scoring intact

## Non-Negotiable Rules
- ✅ Evidence-driven development
- ✅ Inspect before changing
- ❌ No `git add .`
- ❌ Do not stage or commit
- ❌ Do not change data files
- ❌ Do not change filters or date semantics
- ❌ Do not change Mistral AI scoring logic
- ❌ Do not remove or rename existing AI fields
- ✅ Run `node --check` and JSON.parse validations

## Important Existing Changes on This Branch
- **Shortlist tab reworked** into meeting briefing (already completed)
- **app.js** contains helper functions:
  - `getActivePeriodLabel()` - Converts date filter codes
  - `getPrimaryThemeForGrant()` - Extracts primary theme
  - `getThemeOverview()` - Theme distribution analysis
  - `getTopCallsForBriefing()` - Sorting with tie-breakers
  - `getCallVanDeWeek()` - Featured call selection
  - `getWatchlistCalls()` - Monitoring heuristic
  - `getDeduplicatedNextActions()` - Action deduplication
  - `clampActionLabel()` - Action label constraints
  - `getDeterministicSummary()` - 3-bullet summary
- **styles.css** has new shortlist briefing styles
- **api/score.js** unchanged for this rework
- **No new tab added** (as required)

## Current Desired Next Change
**Replace large detailed shortlist cards with compact expandable call items:**

### Layout Requirements:
- **First view**: Show many calls at once (~10 visible on desktop)
- **Desktop**: Two-column layout
- **Mobile**: One column layout
- **Overview-first**: Compact items by default

### Collapsed Item Content:
- Call title
- Call ID
- Programme
- Deadline
- Status
- Primary theme
- AI score
- Projectfit score
- Action label
- Beoogde scope

### Expanded Item Content:
- Why relevant
- Possible RWS project
- RWS role
- Uncertainty
- Next step
- Concise rationale/context (if useful)

### Avoid:
- Duplicated long text blocks
- Overly verbose descriptions
- Redundant information

## Current Validation Commands
```bash
node --check .\app.js
node --check .\api\score.js
node --check .\scripts\update-data.mjs
node -e "JSON.parse(require('fs').readFileSync('data/grants.json','utf8')); console.log('grants ok')"
node -e "JSON.parse(require('fs').readFileSync('data/grants_seen_state.json','utf8')); console.log('state ok')"
node -e "JSON.parse(require('fs').readFileSync('data/relevance_examples.json','utf8')); console.log('examples ok')"
node -e "JSON.parse(require('fs').readFileSync('data/rws_rag_context.json','utf8')); console.log('rag ok')"
```

## Current Known Caveats
- **Vercel Preview**: Requires Preview env vars for Mistral:
  ```
  VIBE_CLI_KEY_BCG=[your-mistral-key]
  AI_MODEL=mistral-small-latest  # optional
  AI_FALLBACK_MODEL=mistral-tiny  # optional
  ```
- **504 Errors**: Check preview env vars and redeploy before assuming code issues
- **AI Scoring**: Ensure Mistral is properly configured in Vercel settings

## Current Git Safety
- **After changes**: Always run `git status` and `git diff`
- **Staging**: Only stage targeted files (likely `app.js` and `styles.css`)
- **Untracked files**: Do not commit debug files or temporary scripts
- **Validation**: Run all validation commands before considering complete

## Current State Summary
✅ **Shortlist rework completed** (meeting briefing format)
✅ **All validations passing**
✅ **No data files modified**
✅ **No provider logic changed**
✅ **No new tab added**
📝 **Next step**: Compact expandable call items (this handoff)

## Files Likely to Change
- `app.js` - Modify renderAiShortlist() for expandable items
- `styles.css` - Add compact/expanded CSS styles

## Handoff Complete
Ready to continue with compact expandable call items implementation in next Vibe session.