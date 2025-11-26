# Casino Breakout (Python Edition)

A terminal-friendly stealth escape game written in `main.py`. Slip through a neon casino, collect enough cash to bribe the getaway driver, and dodge patrolling guards, drones, and hazards on every turn.

## How to play
1. Run the game with Python 3:
   ```bash
   python main.py
   ```
2. Use the controls below to navigate the grid and reach the exit `E` with **at least $10**.

## Controls
- `W/A/S/D` — Move up/left/down/right
- `Q/E/Z/C` — Diagonal moves for tighter dodges
- `R` — Rest to regain stamina and a bit of HP
- `F` — Gamble your current cash for a risky payout
- `X` — Quit mid-run

## Map legend
- `@` — You, the runner
- `C` — Security guards; `G` — Guard captain; `D` — Drones
- `$` — Cash pickups; `+` — Med kits; `^` — Slippery hazard that hurts
- `E` — Exit; `#` — Walls; `.` — Walkable floor

## Goal and systems
- Escape through `E` while carrying **$10 or more**.
- Health, stamina, and wanted level are shown as ASCII bars for quick readability.
- Enemies pursue the player each turn; bumping them triggers a brawl resolved by stamina-weighted dice.
- Random events introduce camera sweeps, pickpockets, and stray bills to keep runs varied.
- Resting, gambling, and diagonal movement give you tools to manage risk during the chase.

## Tips
- Diagonal steps help you slip between drones and walls.
- Rest before stamina drains to zero, or you will start losing HP each turn.
- Gambling boosts the wanted level—use it when you can afford the heat.
