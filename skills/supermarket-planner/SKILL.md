# Supermarket Planner Skill

## When To Use
Use this skill when the user wants to:
- Build a recurring supermarket plan from historical orders.
- Classify staples by cadence (weekly, fortnightly, monthly).
- Combine recipe rotation with purchase history into a next-order draft.
- (Stretch) Semi-automate online cart creation using Computer Use.

## Required Inputs
- `data/recent_orders.csv` (preferred) or equivalent JSON/Markdown list.
- `data/recipes.md` with family dinner recipes and rough frequencies.

Optional:
- `data/staples_overrides.md` for manual cadence or quantity overrides.

## Input Format Guidance
Use the template in:
- `templates/input_schema.md`

## Workflow
1. **Load and validate inputs**
- Ensure order history spans at least 4 weeks (8 to 12 preferred).
- Confirm recipes have at least rough frequency tags.

2. **Normalize items**
- Merge obvious aliases and singular/plural variants.
- Keep normalization map explicit so the user can correct it.

3. **Estimate cadence from historical orders**
- Compute how often each item appears by week.
- Suggested default thresholds:
  - Weekly: appears in >= 60% of weeks.
  - Fortnightly: appears in 30% to 59% of weeks.
  - Monthly: appears in 10% to 29% of weeks.
  - Ad hoc: appears in < 10% of weeks.
- If data is sparse, downgrade confidence.

4. **Incorporate recipe demand**
- Expand recipe ingredient demand using recipe frequencies.
- Upweight items repeatedly required by weekly/fortnightly dinners.
- If recipe demand conflicts with history, present both signals.

5. **Generate outputs**
Produce:
- Staples grouped by cadence.
- Next-week draft order (item, qty, reason).
- Assumptions and confidence notes.
- Suggested user edits.

If the task is to generate the next weekly order for this repo, also:
- write the dated output files under `data/`
- keep `docs/index.html` aligned with the latest weekly view
- stage, commit, and push the repo changes unless the user explicitly asks not to publish yet

Use the template in:
- `templates/weekly_output_template.md`

6. **(Stretch) Computer Use cart build (dry run)**
Only after user asks for automation:
- Open supermarket website.
- Add proposed items to cart one by one.
- Record substitutions or missing items.
- Pause before checkout and request explicit approval.

## Output Contract
Always include these sections:
1. Weekly staples
2. Fortnightly staples
3. Monthly staples
4. Next order draft
5. Assumptions and confidence
6. Quick user adjustments

## Error Handling
- If order history is missing: request at least 4 weeks of data.
- If recipes are missing: proceed history-only and mark reduced confidence.
- If quantities are inconsistent units: flag and propose standard units.

## Notes
- Do not auto-confirm purchases.
- Prefer transparent tradeoffs over overconfident recommendations.
