import random
import textwrap
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


Coordinate = Tuple[int, int]


@dataclass
class Entity:
    symbol: str
    name: str
    pos: Coordinate
    hp: int
    stamina: int = 8
    cash: int = 0

    def move(self, direction: Coordinate, bounds: Coordinate) -> Coordinate:
        dx, dy = direction
        x, y = self.pos
        new_pos = (max(0, min(bounds[0] - 1, x + dx)), max(0, min(bounds[1] - 1, y + dy)))
        self.pos = new_pos
        return new_pos

    def adjust_hp(self, amount: int) -> None:
        self.hp = max(0, min(12, self.hp + amount))

    def adjust_stamina(self, amount: int) -> None:
        self.stamina = max(0, min(12, self.stamina + amount))

    def alive(self) -> bool:
        return self.hp > 0


@dataclass
class GameObject:
    symbol: str
    description: str
    effect: Optional[str] = None
    value: int = 0


@dataclass
class GameState:
    width: int = 22
    height: int = 12
    turn: int = 0
    player: Entity = field(default_factory=lambda: Entity("@", "Runner", (1, 1), 10))
    enemies: List[Entity] = field(default_factory=list)
    objects: Dict[Coordinate, GameObject] = field(default_factory=dict)
    exit_tile: Coordinate = (20, 10)
    alert_level: int = 0
    wanted: int = 0
    message_log: List[str] = field(default_factory=list)

    def log(self, text: str) -> None:
        for wrapped in textwrap.wrap(text, width=70):
            self.message_log.append(wrapped)
            if len(self.message_log) > 8:
                self.message_log.pop(0)


DIRECTIONS = {
    "w": (0, -1),
    "s": (0, 1),
    "a": (-1, 0),
    "d": (1, 0),
    "q": (-1, -1),  # diag escapes for special moves
    "e": (1, -1),
    "z": (-1, 1),
    "c": (1, 1),
}


class CasinoEscapeGame:
    def __init__(self) -> None:
        self.state = GameState()
        self.map = self._build_map()
        self._spawn_enemies()
        self._scatter_objects()
        self.state.log("Sneak through the casino, grab cash, and reach the exit!")
        self.state.log("Controls: WASD move, diagonals Q/E/Z/C, R rest, F gamble, X exit.")

    def _build_map(self) -> List[List[str]]:
        layout = [
            "######################",
            "#....#..$...^...#..E.#",
            "#.^..#......##..#....#",
            "#..###..$....#..#..#.#",
            "#..#....##...#..#..#.#",
            "#..#..$..#..##..#..#.#",
            "#..#..^..#....#..#..#.#",
            "#..#......#..##..#..#.#",
            "#..###..$....#..#..#.#",
            "#..#....##...#..#..#.#",
            "#..#..$..#..##..#..#.#",
            "######################",
        ]
        self.state.exit_tile = (layout[0].__len__() - 2, len(layout) - 2)
        return [list(row) for row in layout]

    def _scatter_objects(self) -> None:
        for y, row in enumerate(self.map):
            for x, tile in enumerate(row):
                pos = (x, y)
                if tile == "$":
                    self.state.objects[pos] = GameObject("$", "Cash bundle", "cash", 5)
                elif tile == "^":
                    self.state.objects[pos] = GameObject("^", "Spilled drink hazard", "hazard", -2)
                elif tile == "." and random.random() < 0.06:
                    self.state.objects[pos] = GameObject("+", "Medical kit", "heal", 3)
        # remove markers from static map
        for pos in list(self.state.objects.keys()):
            x, y = pos
            self.map[y][x] = "."

    def _spawn_enemies(self) -> None:
        chasers = [Entity("C", "Security", (10, 5), 6), Entity("G", "Guard Captain", (18, 8), 10)]
        drones = [Entity("D", "Drone", (15, 2), 4), Entity("D", "Drone", (5, 9), 4)]
        self.state.enemies.extend(chasers + drones)

    def _tile_blocked(self, pos: Coordinate) -> bool:
        x, y = pos
        if y < 0 or y >= self.state.height or x < 0 or x >= self.state.width:
            return True
        return self.map[y][x] == "#"

    def _enemy_at(self, pos: Coordinate) -> Optional[Entity]:
        for enemy in self.state.enemies:
            if enemy.pos == pos and enemy.alive():
                return enemy
        return None

    def _object_at(self, pos: Coordinate) -> Optional[GameObject]:
        return self.state.objects.get(pos)

    def _render_hud(self) -> str:
        hp_bar = self._bar("HP", self.state.player.hp, 12, icon="❤")
        stamina_bar = self._bar("ST", self.state.player.stamina, 12, icon="▮")
        wanted_bar = self._bar("WT", self.state.wanted, 10, icon="!")
        cash = f"$${self.state.player.cash:02d}"
        turn = f"Turn {self.state.turn:02d}"
        return f"{hp_bar}  {stamina_bar}  {wanted_bar}  {cash}  {turn}\n"

    def _bar(self, label: str, value: int, maximum: int, icon: str) -> str:
        filled = icon * max(0, value)
        empty = "." * max(0, maximum - value)
        return f"{label}[{filled}{empty}]"

    def _render_board(self) -> str:
        board = []
        for y in range(self.state.height):
            row = []
            for x in range(self.state.width):
                pos = (x, y)
                if pos == self.state.player.pos:
                    row.append(self.state.player.symbol)
                elif self._enemy_at(pos):
                    row.append(self._enemy_at(pos).symbol)
                elif pos == self.state.exit_tile:
                    row.append("E")
                elif (obj := self._object_at(pos)):
                    row.append(obj.symbol)
                else:
                    row.append(self.map[y][x])
            board.append("".join(row))
        return "\n".join(board)

    def render(self) -> None:
        print("\033c", end="")
        print("CASINO BREAKOUT (Python Edition)\n")
        print(self._render_hud())
        print(self._render_board())
        if self.state.message_log:
            print("\nLog:")
            for entry in self.state.message_log:
                print(f" - {entry}")

    def _handle_object(self, pos: Coordinate) -> None:
        obj = self._object_at(pos)
        if not obj:
            return
        if obj.effect == "cash":
            self.state.player.cash += obj.value
            self.state.log(f"You scoop up ${obj.value} from the floor.")
        elif obj.effect == "hazard":
            self.state.player.adjust_hp(obj.value)
            self.state.log("You slip! The spill stings. HP down.")
        elif obj.effect == "heal":
            self.state.player.adjust_hp(obj.value)
            self.state.log("Found a med kit. HP restored.")
        self.state.objects.pop(pos, None)

    def _fight(self, enemy: Entity) -> None:
        player = self.state.player
        player_roll = random.randint(1, 6) + player.stamina
        enemy_roll = random.randint(1, 6) + enemy.stamina
        if player_roll >= enemy_roll:
            enemy.adjust_hp(-4)
            self.state.log(f"You stun the {enemy.name}! It reels.")
            self.state.wanted += 2
        else:
            player.adjust_hp(-3)
            self.state.log(f"{enemy.name} hits back! HP -3.")
            self.state.alert_level += 1
        player.adjust_stamina(-1)

    def _enemy_turn(self) -> None:
        player_pos = self.state.player.pos
        for enemy in self.state.enemies:
            if not enemy.alive():
                continue
            dx = 1 if player_pos[0] > enemy.pos[0] else -1 if player_pos[0] < enemy.pos[0] else 0
            dy = 1 if player_pos[1] > enemy.pos[1] else -1 if player_pos[1] < enemy.pos[1] else 0
            candidate = (enemy.pos[0] + dx, enemy.pos[1] + dy)
            if not self._tile_blocked(candidate):
                enemy.pos = candidate
            if enemy.pos == player_pos:
                self.state.log(f"{enemy.name} corners you!")
                self.state.player.adjust_hp(-2)
                self.state.wanted += 1

    def _random_events(self) -> None:
        roll = random.random()
        if roll < 0.08:
            self.state.log("Camera sweep increases the alert level.")
            self.state.alert_level += 1
            self.state.wanted = min(10, self.state.wanted + 1)
        elif roll < 0.14 and self.state.player.cash > 0:
            self.state.player.cash -= 1
            self.state.log("A pickpocket nicks a dollar from your stash.")
        elif roll < 0.2:
            self.state.log("You spot an unguarded bill. Scoop! +$1")
            self.state.player.cash += 1

    def _rest(self) -> None:
        self.state.player.adjust_stamina(3)
        self.state.player.adjust_hp(1)
        self.state.log("You catch your breath behind a slot machine.")

    def _gamble(self) -> None:
        player = self.state.player
        if player.cash <= 0:
            self.state.log("No chips to gamble.")
            return
        wager = min(3, player.cash)
        player.cash -= wager
        roll = random.random()
        if roll < 0.25:
            winnings = wager * 3
            player.cash += winnings
            self.state.log(f"Jackpot! You win ${winnings}.")
        elif roll < 0.55:
            winnings = wager * 2
            player.cash += winnings
            self.state.log(f"Lucky spin. You gain ${winnings}.")
        else:
            self.state.log("House wins. You lose the chips.")
        self.state.wanted += 1

    def _try_move(self, direction: Coordinate) -> None:
        player = self.state.player
        destination = (player.pos[0] + direction[0], player.pos[1] + direction[1])
        if self._tile_blocked(destination):
            self.state.log("You bump into a wall of neon and chrome.")
            player.adjust_stamina(-1)
            return
        if enemy := self._enemy_at(destination):
            self._fight(enemy)
            return
        player.move(direction, (self.state.width, self.state.height))
        self.state.player.adjust_stamina(-1)
        self._handle_object(player.pos)
        if player.pos == self.state.exit_tile and player.cash >= 10:
            self.state.log("You slide through the service exit with cash in hand. Freedom!")
        elif player.pos == self.state.exit_tile:
            self.state.log("You found the exit but need at least $10 to bribe the driver!")

    def _post_turn(self) -> None:
        self._random_events()
        self._enemy_turn()
        self.state.turn += 1
        if self.state.player.stamina <= 0:
            self.state.player.adjust_hp(-1)
            self.state.log("You are exhausted and lose HP.")
        self.state.player.adjust_stamina(1)

    def _check_end(self) -> Optional[str]:
        player = self.state.player
        if player.hp <= 0:
            return "You collapse. Security drags you back inside."
        if player.pos == self.state.exit_tile and player.cash >= 10:
            return "You made it out! The getaway car peels away into the night."
        if self.state.alert_level >= 10:
            return "Alarms blare. Reinforcements swarm the halls."
        return None

    def play(self) -> None:
        while True:
            self.render()
            verdict = self._check_end()
            if verdict:
                print(f"\n{verdict}\n")
                break
            command = input("Move (WASD diagonals Q/E/Z/C, R rest, F gamble, X quit): ").strip().lower()
            if command == "x":
                print("You duck into a maintenance closet and wait out the heat. Game over.")
                break
            if command == "r":
                self._rest()
            elif command == "f":
                self._gamble()
            elif command in DIRECTIONS:
                self._try_move(DIRECTIONS[command])
            else:
                self.state.log("Unknown action. Use WASD, diagonals, R, F, or X.")
            self._post_turn()


def main() -> None:
    random.seed()
    game = CasinoEscapeGame()
    game.play()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nYou freeze, hiding between machines. Session ended.")
