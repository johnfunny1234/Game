const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dialogue = document.getElementById('dialogue');
const interaction = document.getElementById('interaction');
const hpBar = document.getElementById('hp-bar');
const staminaBar = document.getElementById('stamina-bar');
const wantedBar = document.getElementById('wanted-bar');
const moneyEl = document.getElementById('money');
const miniMap = document.getElementById('mini-map');

const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

const scenes = [
  { name: 'Parking Lot', color: '#0f1b2b', text: 'Cole chats with the sleepy security guard before heading inside.', tutorial: 'Press → to walk. Press F to talk.', interactable: true },
  { name: 'Casino Lobby', color: '#182035', text: 'Fountains shimmer under a neon “Golden Lotus Casino.”', tutorial: 'Press F to talk. Press E to punch (not recommended).', interactable: true },
  { name: 'Slot Machine Hall', color: '#231135', text: 'Rows of slots chirp loudly.', tutorial: 'Press F to play slots.', interactable: true, onInteract: () => bigWin() },
  { name: 'Card Table Gallery', color: '#1e1d27', text: 'Dodging flying chips and tipped tables.', hazards: true },
  { name: 'High-Roller Lounge', color: '#1a1028', text: 'Lasers sweep above velvet couches.', hazards: true, crouch: true },
  { name: 'Cash Vault Zone', color: '#0f1927', text: 'Security drones buzz around vault doors.', hazards: true },
  { name: 'Buffet Chaos Room', color: '#1a1610', text: 'Slippery trays and angry chefs.', hazards: true },
  { name: 'Bathroom Boss Arena', color: '#dfe3ec', text: 'Echoing tiles. Time to fight Charlie and AJ.', boss: true },
  { name: 'Alleyway', color: '#0c161c', text: 'Cool night air outside the casino.', finale: true },
];

const ground = canvas.height - 80;

const player = {
  x: 60,
  y: ground,
  width: 32,
  height: 56,
  vx: 0,
  vy: 0,
  hp: 100,
  stamina: 100,
  money: 0,
  facing: 1,
};

let wanted = 0;
let sceneIndex = 0;
let messageTimer = 0;
let interactionHint = '';
let slotWon = false;
let chasers = [];
let bossEnemies = [];

function setDialogue(text) {
  dialogue.textContent = text;
}

function setInteraction(text) {
  interactionHint = text;
  interaction.classList.toggle('visible', !!text);
  interaction.textContent = text || '';
}

function showTutorial(text) {
  const existing = document.querySelector('.tutorial');
  if (existing) existing.remove();
  if (!text) return;
  const el = document.createElement('div');
  el.className = 'tutorial';
  el.textContent = text;
  document.body.appendChild(el);
}

function buildMiniMap() {
  miniMap.innerHTML = '';
  scenes.forEach((scene, idx) => {
    const block = document.createElement('div');
    block.className = 'mini-scene' + (idx === sceneIndex ? ' active' : '');
    block.title = scene.name;
    miniMap.appendChild(block);
  });
}

function resetForScene() {
  player.x = 60;
  player.y = ground;
  player.vx = 0;
  player.vy = 0;
  interactionHint = '';
  setInteraction('');
  messageTimer = 3;
  chasers = [];
  bossEnemies = [];

  const scene = scenes[sceneIndex];
  setDialogue(scene.text);
  showTutorial(scene.tutorial);
  if (scene.boss) {
    bossEnemies = [
      { name: 'Charlie', x: 620, y: ground, width: 34, height: 56, hp: 80, color: '#3aa0ff', vx: -1 },
      { name: 'AJ', x: 540, y: ground, width: 34, height: 56, hp: 70, color: '#42ff8f', vx: -0.8 },
    ];
    setDialogue('Charlie & AJ burst in! Press E to punch.');
  }
}

function bigWin() {
  if (slotWon) return;
  slotWon = true;
  player.money = 1000000;
  setDialogue('777! Cole wins $1,000,000. Charlie & AJ are furious!');
  chasers = [
    { name: 'Charlie', x: canvas.width - 80, y: ground, width: 34, height: 56, color: '#3aa0ff', vx: -1.4 },
    { name: 'AJ', x: canvas.width - 120, y: ground, width: 34, height: 56, color: '#42ff8f', vx: -1.2 },
  ];
  wanted = Math.min(100, wanted + 25);
}

function updateBars() {
  hpBar.style.width = `${player.hp}%`;
  staminaBar.style.width = `${player.stamina}%`;
  wantedBar.style.width = `${wanted}%`;
  moneyEl.textContent = player.money.toLocaleString();
}

function spawnObstacles() {
  const obstacles = [];
  const scene = scenes[sceneIndex];
  if (scene.hazards) {
    for (let i = 0; i < 5; i++) {
      const type = i % 2 === 0 ? 'crate' : 'laser';
      obstacles.push({
        x: 160 + i * 140,
        y: ground - (type === 'crate' ? 32 : 64),
        width: 48,
        height: type === 'crate' ? 32 : 12,
        type,
      });
    }
  }
  if (scene.crouch) {
    obstacles.push({ x: 420, y: ground - 90, width: 120, height: 6, type: 'lowLaser' });
  }
  if (scene.name === 'Buffet Chaos Room') {
    obstacles.push({ x: 360, y: ground, width: 120, height: 6, type: 'slip' });
  }
  return obstacles;
}

let obstacles = spawnObstacles();

function advanceScene() {
  if (sceneIndex < scenes.length - 1) {
    sceneIndex += 1;
    obstacles = spawnObstacles();
    if (!scenes[sceneIndex].finale) wanted = Math.min(100, wanted + 10);
    resetForScene();
    buildMiniMap();
  } else {
    setDialogue('You made it out! Money intact. Night air cools the chaos.');
  }
}

function applyPhysics() {
  player.vy += 0.6; // gravity
  player.y += player.vy;
  player.x += player.vx;

  if (player.y > ground) {
    player.y = ground;
    player.vy = 0;
  }
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) {
    player.x = canvas.width - player.width;
    if (sceneIndex < scenes.length - 1) advanceScene();
  }
}

function handleInput(delta) {
  const speed = keys.shift ? 4.6 : 3.2;
  const staminaDrain = keys.shift ? 15 : 6;
  if (keys['arrowleft'] || keys['a']) {
    player.vx = -speed;
    player.facing = -1;
  } else if (keys['arrowright'] || keys['d']) {
    player.vx = speed;
    player.facing = 1;
  } else {
    player.vx = 0;
  }

  if ((keys['arrowup'] || keys['w']) && player.y >= ground) {
    player.vy = -10;
  }

  if (keys['arrowdown'] || keys['s']) {
    player.height = 34;
  } else {
    player.height = 56;
  }

  if ((keys['e'] || keys[' ']) && player.stamina > 0) {
    player.stamina = Math.max(0, player.stamina - staminaDrain * delta);
    punch();
  } else {
    player.stamina = Math.min(100, player.stamina + 20 * delta);
  }

  if (keys['f']) interact();
}

function punch() {
  // Simple melee box
  const reach = 24;
  const box = {
    x: player.x + player.facing * reach,
    y: player.y - player.height,
    width: 32,
    height: player.height,
  };

  chasers.forEach((ch) => {
    if (rectOverlap(box, ch)) {
      ch.vx *= 0.9;
    }
  });

  bossEnemies.forEach((b) => {
    if (rectOverlap(box, b)) {
      b.hp = Math.max(0, b.hp - 25);
      if (b.hp === 0) setDialogue(`${b.name} is down!`);
    }
  });
}

function interact() {
  const scene = scenes[sceneIndex];
  if (!scene.interactable) return;
  if (scene.onInteract) scene.onInteract();
  else setDialogue('Cole chats, keeping cool under the neon glow.');
}

function rectOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y && a.y + a.height > b.y - b.height;
}

function drawScene() {
  const scene = scenes[sceneIndex];
  ctx.fillStyle = scene.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 16; i++) {
    ctx.fillRect(i * 70 + (i % 2 === 0 ? 20 : 0), 80, 8, 360);
  }

  // Ground
  ctx.fillStyle = '#0b0d16';
  ctx.fillRect(0, ground + 2, canvas.width, canvas.height - ground);

  // Obstacles
  ctx.fillStyle = '#ffdf6b';
  obstacles.forEach((o) => {
    if (o.type === 'laser' || o.type === 'lowLaser') ctx.fillStyle = '#ff3c7f';
    else if (o.type === 'slip') ctx.fillStyle = '#ffa45b';
    else ctx.fillStyle = '#5c8bff';
    ctx.fillRect(o.x, o.y - o.height, o.width, o.height);
  });

  // Player
  ctx.fillStyle = '#f0c419';
  ctx.fillRect(player.x, player.y - player.height, player.width, player.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(player.x + (player.facing === 1 ? player.width - 6 : 0), player.y - player.height + 16, 6, 6);

  // Chasers
  chasers.forEach((ch) => {
    ctx.fillStyle = ch.color;
    ctx.fillRect(ch.x, ch.y - ch.height, ch.width, ch.height);
  });

  // Boss
  bossEnemies.forEach((b) => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y - b.height, b.width, b.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(b.x - 4, b.y - b.height - 12, b.width + 8, 8);
    ctx.fillStyle = '#ff5c5c';
    ctx.fillRect(b.x - 4, b.y - b.height - 12, ((b.width + 8) * b.hp) / 80, 8);
  });

  // Interaction text
  if (interactionHint) setInteraction(interactionHint);
  else if (scene.interactable) setInteraction('Press F to interact');
  else setInteraction('');
}

function updateObstacles() {
  const crouching = player.height < 56;
  obstacles.forEach((o) => {
    if (rectOverlap(player, { ...o, y: o.y })) {
      if (o.type === 'slip') {
        player.vx *= 0.6;
      } else if (o.type === 'lowLaser' && !crouching) {
        player.hp = Math.max(0, player.hp - 8);
      } else if (o.type === 'laser' && player.y >= ground - 32) {
        player.hp = Math.max(0, player.hp - 6);
      } else {
        player.vx *= -0.3;
      }
    }
  });
}

function updateChasers(delta) {
  chasers.forEach((ch) => {
    ch.x += ch.vx;
    if (ch.x < player.x + player.width) {
      player.hp = Math.max(0, player.hp - 12 * delta);
      wanted = Math.min(100, wanted + 20 * delta);
    }
  });
}

function updateBoss(delta) {
  bossEnemies = bossEnemies.filter((b) => b.hp > 0);
  bossEnemies.forEach((b) => {
    b.x += b.vx;
    if (b.x < player.x) b.vx = Math.abs(b.vx);
    if (b.x > canvas.width - b.width) b.vx = -Math.abs(b.vx);
    if (rectOverlap(player, { ...b, y: b.y })) {
      player.hp = Math.max(0, player.hp - 20 * delta);
    }
  });
  if (bossEnemies.length === 0 && sceneIndex === scenes.length - 2) {
    advanceScene();
  }
}

function tick(timestamp) {
  requestAnimationFrame(tick);
  const delta = 1 / 60;

  handleInput(delta);
  applyPhysics();
  updateObstacles();
  updateChasers(delta);
  if (scenes[sceneIndex].boss) updateBoss(delta);

  messageTimer = Math.max(0, messageTimer - delta);
  if (messageTimer === 0 && !scenes[sceneIndex].boss) setDialogue(scenes[sceneIndex].text);

  updateBars();
  drawScene();
}

resetForScene();
buildMiniMap();
requestAnimationFrame(tick);
