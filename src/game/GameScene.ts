import Phaser from 'phaser';

// Все правила первого прототипа можно менять здесь.
const PLAYER_SPEED = 245;
const PLAYER_RADIUS = 17;
const JOYSTICK_RADIUS = 54;
const JOYSTICK_KNOB_RADIUS = 20;
const JOYSTICK_DEAD_ZONE = 6;
const MAX_HEALTH = 5;
const DIFFICULTY_RAMP_SECONDS = 180;
const BEST_SCORE_KEY = 'zombie-chipsi-bazuki.best-score';
const UI_WIDTH = 480;
const UI_HEIGHT = 800;
const UI_SCALE = 1.5;
const WORLD = { left: 0, right: 3200, top: 0, bottom: 4200 };
const CAMERA_FOLLOW = 0.12;
const ZOMBIE_DESPAWN_DISTANCE = 1000;
const MIN_SPAWN_DISTANCE = 180;
const ZOMBIE_RADIUS = 16;
const ZOMBIE_SPEED = 43;
const ZOMBIE_SPEED_GAIN = 32;
const SPAWN_INTERVAL = 0.75;
const MIN_SPAWN_INTERVAL = 0.25;
const MAX_ZOMBIES = 60;
const ACE_SPAWN_CHANCE = 0.12;
const ACE_FIRST_SPAWN_SECONDS = 6;
const ACE_SPAWN_COOLDOWN = 6;
const ACE_ANNOUNCEMENT_DURATION = 1200;
const MAX_ACTIVE_ACES = 2;
const ACE_CARD_WIDTH = 42;
const ACE_CARD_HEIGHT = 54;
const ACE_CARD_OFFSET = 60;
const ACE_HIT_PADDING = 10;
const ACE_SWIPE_MIN_AXIS = 18;
const ACE_SWIPE_MAX_AXIS_RATIO = 2;
const ACE_SWIPE_MIN_STRAIGHTNESS = 0.85;
const ROCKET_SPEED = 510;
const ROCKET_LIFETIME = 1.05;
const SHOT_COOLDOWN = 1.6;
const BLAST_RADIUS = 45;
const RELOAD_UPGRADE_FACTOR = 0.85;
const MIN_SHOT_COOLDOWN = 0.4;
const BLAST_RADIUS_UPGRADE = 15;
const MAX_SALVO_ROCKETS = 5;
const LEVELS_PER_EXTRA_ROCKET = 3;
const SALVO_SPREAD = 0.2;
const COMPANION_SPEED = 280;
const COMPANION_FOLLOW_DISTANCE = 58;
const COMPANION_FOLLOW_RESPONSE = 3.2;
const DJIGAN_SHOT_COOLDOWN = 1.8;
const DJIGAN_RELOAD_FACTOR = 0.88;
const DJIGAN_MIN_COOLDOWN = 0.65;
const BULLET_SPEED = 430;
const BULLET_LIFETIME = 1.3;
const BULLET_RADIUS = 4;
const FIRST_LEVEL_XP = 5;
const LEVEL_XP_GAIN = 3;
const HURT_COOLDOWN = 1.2;
const CHIP_PICKUP_RADIUS = 29;
const CHIP_MAGNET_RADIUS = 100;
const CHIP_ATTRACT_SPEED = 360;
const CHIP_HEAL = 1;
const MAX_CHIPS = 80;
const UPGRADER_FIRST_SPAWN_MIN = 10;
const UPGRADER_FIRST_SPAWN_MAX = 18;
const UPGRADER_SPAWN_MIN = 35;
const UPGRADER_SPAWN_MAX = 55;
const UPGRADER_SPAWN_DISTANCE_MIN = 150;
const UPGRADER_SPAWN_DISTANCE_MAX = 220;
const UPGRADER_INTERACT_DISTANCE = 85;
const UPGRADER_DESPAWN_DISTANCE = 1000;
const UPGRADER_MAX_LEVEL_GAIN = 5;
const UPGRADER_BASE_CHANCE = 0.8;
const UPGRADER_CHANCE_FACTOR = 0.6;
const UPGRADER_MIN_CHANCE = 0.01;
const UPGRADER_SPIN_SECONDS = 3;
const UPGRADER_SPIN_TURNS = 5;
const UPGRADER_WHEEL_RADIUS = 84;
const UPGRADER_WHEEL_X = 240;
const UPGRADER_WHEEL_Y = 325;
const UPGRADER_SLIDER_LEFT = 64;
const UPGRADER_SLIDER_RIGHT = 416;
const ARENA = { left: 16, right: 464, top: 148, bottom: 686 };
const COLORS = { cream: '#f3edda', muted: '#a4b7ad', yellow: '#ffd36a' };

type Keys = Record<'up' | 'down' | 'left' | 'right' | 'start' | 'restart' | 'pause' | 'escape' | 'interact' | 'upgrade1' | 'upgrade2' | 'upgrade3', Phaser.Input.Keyboard.Key>;
type Ace = { card: Phaser.GameObjects.Container; shield: Phaser.GameObjects.Arc };
type Zombie = { body: Phaser.GameObjects.Container; speed: number; ace?: Ace };
type AceSwipe = { zombie: Zombie; pointerId: number; startX: number; startY: number; lastX: number; lastY: number;
  travel: number; bounds: Phaser.Geom.Rectangle };
type Rocket = { body: Phaser.GameObjects.Container; vx: number; vy: number; life: number };
type Bullet = { body: Phaser.GameObjects.Arc; vx: number; vy: number; life: number };
type WeaponChoice = 'bazooka' | 'djigan';
type State = 'ready' | 'playing' | 'paused' | 'upgrading' | 'upgrader' | 'ended';
type UpgraderView = {
  input: Phaser.GameObjects.Text; output: Phaser.GameObjects.Text;
  chance: Phaser.GameObjects.Text; target: Phaser.GameObjects.Text; status: Phaser.GameObjects.Text;
  ring: Phaser.GameObjects.Graphics; pointer: Phaser.GameObjects.Container;
  slider: Phaser.GameObjects.Container; knob: Phaser.GameObjects.Arc;
  rollButton: Phaser.GameObjects.Rectangle; rollLabel: Phaser.GameObjects.Text;
  exitButton: Phaser.GameObjects.Rectangle;
  items: { weapon: WeaponChoice; button: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[];
};

export class GameScene extends Phaser.Scene {
  private world!: Phaser.GameObjects.Layer;
  private ui!: Phaser.GameObjects.Layer;
  private player!: Phaser.GameObjects.Container;
  private bazooka!: Phaser.GameObjects.Container;
  private companion?: Phaser.GameObjects.Container;
  private companionGun?: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Keys;
  private hud!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private reloadBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private aceAnnouncement!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private joystickPointerId: number | null = null;
  private joystickDirection = new Phaser.Math.Vector2();
  private aceSwipe?: AceSwipe;
  private aceSwipeTrail!: Phaser.GameObjects.Graphics;
  private nextAceAt = ACE_FIRST_SPAWN_SECONDS;
  private zombies: Zombie[] = [];
  private rockets: Rocket[] = [];
  private bullets: Bullet[] = [];
  private upgradeChoices: WeaponChoice[] = [];
  private chips: Phaser.GameObjects.Container[] = [];
  private state: State = 'ready';
  private health = MAX_HEALTH;
  private score = 0;
  private bestScore = 0;
  private kills = 0;
  private elapsed = 0;
  private spawnIn = 0.6;
  private reload = 0;
  private invulnerable = 0;
  private level = 1;
  private experience = 0;
  private nextLevelXp = FIRST_LEVEL_XP;
  private bazookaLevel = 1;
  private shotCooldown = SHOT_COOLDOWN;
  private blastRadius = BLAST_RADIUS;
  private salvoRockets = 1;
  private companionLevel = 0;
  private companionReload = 0;
  private upgrader?: Phaser.GameObjects.Container;
  private upgraderInteract!: Phaser.GameObjects.Container;
  private nextUpgraderAt = 0;
  private upgraderView?: UpgraderView;
  private upgraderSelection?: WeaponChoice;
  private upgraderTargetLevel = 0;
  private upgraderResult?: { weapon: WeaponChoice; level: number; won: boolean };
  private upgraderSliderPointer: number | null = null;
  private upgraderSpin?: { weapon: WeaponChoice; level: number; chance: number;
    from: number; travel: number; elapsed: number };

  constructor() { super('GameScene'); }

  create(): void {
    // Scene.restart сохраняет экземпляр сцены: сбрасываем весь игровой раунд.
    this.zombies = []; this.rockets = []; this.chips = [];
    this.bullets = []; this.upgradeChoices = [];
    this.companion = undefined; this.companionGun = undefined;
    this.companionLevel = 0; this.companionReload = 0;
    this.upgrader = undefined; this.upgraderView = undefined; this.upgraderSelection = undefined;
    this.upgraderSpin = undefined; this.upgraderResult = undefined; this.upgraderSliderPointer = null;
    this.upgraderTargetLevel = 0;
    this.nextUpgraderAt = Phaser.Math.Between(UPGRADER_FIRST_SPAWN_MIN, UPGRADER_FIRST_SPAWN_MAX);
    this.joystickPointerId = null; this.joystickDirection.set(0, 0);
    this.aceSwipe = undefined; this.nextAceAt = ACE_FIRST_SPAWN_SECONDS;
    this.state = 'ready'; this.health = MAX_HEALTH;
    this.score = 0; this.kills = 0; this.elapsed = 0;
    this.spawnIn = 0.6; this.reload = 0; this.invulnerable = 0;
    this.level = 1; this.experience = 0; this.nextLevelXp = FIRST_LEVEL_XP;
    this.bazookaLevel = 1;
    this.shotCooldown = SHOT_COOLDOWN; this.blastRadius = BLAST_RADIUS; this.salvoRockets = 1;
    this.bestScore = Math.max(this.bestScore, this.readBestScore());
    this.world = this.add.layer();
    this.ui = this.add.layer();
    this.drawArena();
    this.createPlayer();
    const camera = this.cameras.main;
    camera.setViewport(ARENA.left * UI_SCALE, ARENA.top * UI_SCALE,
      (ARENA.right - ARENA.left) * UI_SCALE, (ARENA.bottom - ARENA.top) * UI_SCALE)
      .setZoom(UI_SCALE).setBounds(WORLD.left, WORLD.top, WORLD.right - WORLD.left, WORLD.bottom - WORLD.top)
      .startFollow(this.player, false, CAMERA_FOLLOW, CAMERA_FOLLOW);
    camera.centerOn(this.player.x, this.player.y);
    const uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    uiCamera.setZoom(UI_SCALE).centerOn(UI_WIDTH / 2, UI_HEIGHT / 2);
    // Интерфейс и мир рисуются своими камерами, включая объекты, добавленные позже.
    camera.ignore(this.ui);
    uiCamera.ignore(this.world);
    this.createHud();
    this.createControls();
    this.showOverlay('ЗОМБИ, ЧИПСЫ, БАЗУКИ',
      'Выживай и собирай чипсы на рекорд!\n\nWASD / стрелки — движение\nЗажми мышь или палец и потяни — стик\nОружие стреляет автоматически.\nЧипсы дают опыт, здоровье и прокачку.\n\nТуз над зомби даёт неуязвимость.\nПроведи по карте по диагонали!', 'ПОГНАЛИ  /  ENTER');
    const pauseOnBlur = (): void => { if (this.state === 'playing') this.togglePause(); };
    this.game.events.on(Phaser.Core.Events.BLUR, pauseOnBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, pauseOnBlur);
    });
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.restart) && this.state !== 'ready') {
      this.scene.restart(); return;
    }
    if (this.state === 'upgrader') {
      this.updateUpgraderSpin(Math.min(delta / 1000, 0.05));
      if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) this.closeUpgrader();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.start)) {
      if (this.state === 'ready') this.startRound();
      else if (this.state === 'paused') this.togglePause();
      else if (this.state === 'ended') { this.scene.restart(); return; }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) || Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.togglePause();
    }
    if (this.state === 'upgrading') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.upgrade1)) this.chooseUpgrade(0);
      else if (Phaser.Input.Keyboard.JustDown(this.keys.upgrade2)) this.chooseUpgrade(1);
      else if (Phaser.Input.Keyboard.JustDown(this.keys.upgrade3)) this.chooseUpgrade(2);
      return;
    }
    if (this.state !== 'playing') return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact) && this.canUseUpgrader()) {
      this.openUpgrader(); return;
    }

    // Ограничение шага не даёт объектам перескочить друг через друга при лаге.
    const seconds = Math.min(delta / 1000, 0.05);
    this.elapsed += seconds;
    this.reload = Math.max(0, this.reload - seconds);
    this.invulnerable = Math.max(0, this.invulnerable - seconds);
    this.movePlayer(seconds);
    this.updateUpgraderObject();
    this.aimAndShoot();
    this.updateCompanion(seconds);
    this.spawnIn -= seconds;
    if (this.spawnIn <= 0) {
      this.spawnZombie();
      this.spawnIn = Phaser.Math.Linear(SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, this.difficulty());
    }
    this.moveZombies(seconds);
    if (this.state !== 'playing') return;
    this.moveRockets(seconds);
    this.moveBullets(seconds);
    this.collectChips(seconds);
    this.player.alpha = this.invulnerable > 0 ? 0.55 + Math.sin(this.elapsed * 35) * 0.25 : 1;
    this.updateHud();
  }

  private drawArena(): void {
    this.add.text(UI_WIDTH / 2, 16, 'ЗОМБИ, ЧИПСЫ, БАЗУКИ', {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: 'bold', color: COLORS.cream,
    }).setOrigin(0.5, 0).addToDisplayList(this.ui);
    const g = this.add.graphics().addToDisplayList(this.world);
    const width = WORLD.right - WORLD.left;
    const height = WORLD.bottom - WORLD.top;
    g.fillStyle(0x21352d).fillRect(WORLD.left, WORLD.top, width, height);
    g.lineStyle(1, 0x2b4237);
    for (let x = WORLD.left + 24; x < WORLD.right; x += 40) g.lineBetween(x, WORLD.top, x, WORLD.bottom);
    for (let y = WORLD.top + 24; y < WORLD.bottom; y += 40) g.lineBetween(WORLD.left, y, WORLD.right, y);
    g.lineStyle(4, 0x4b6652).strokeRect(WORLD.left, WORLD.top, width, height);
    this.add.text(16, 702, 'WASD / стрелки · стик мышью или пальцем', {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '15px', color: COLORS.cream,
    }).addToDisplayList(this.ui);
    this.add.text(16, 726, 'Туз: диагональ · Апгрейдер: подойти и E', {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: COLORS.muted,
    }).addToDisplayList(this.ui);
    const pause = this.add.rectangle(126, 769, 216, 42, 0x31473b).setInteractive({ useHandCursor: true }).addToDisplayList(this.ui);
    const restart = this.add.rectangle(354, 769, 216, 42, 0x31473b).setInteractive({ useHandCursor: true }).addToDisplayList(this.ui);
    this.add.text(126, 769, 'ПАУЗА  /  P', { resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: COLORS.cream }).setOrigin(0.5).addToDisplayList(this.ui);
    this.add.text(354, 769, 'ЗАНОВО  /  R', { resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: COLORS.cream }).setOrigin(0.5).addToDisplayList(this.ui);
    this.bindButton(pause, () => this.togglePause());
    this.bindButton(restart, () => this.scene.restart());
  }

  private createPlayer(): void {
    this.player = this.add.container((WORLD.left + WORLD.right) / 2, (WORLD.top + WORLD.bottom) / 2, [
      this.add.ellipse(0, 14, 38, 14, 0x101f18, 0.5),
      this.add.circle(0, 0, PLAYER_RADIUS, 0xf3edda).setStrokeStyle(3, 0x15271e),
      this.add.rectangle(0, 10, 25, 12, 0xda8b50),
      this.add.rectangle(-5, -3, 4, 4, 0x21352d),
      this.add.rectangle(5, -3, 4, 4, 0x21352d),
    ]).setDepth(3).addToDisplayList(this.world);
    this.bazooka = this.add.container(0, 4, [
      this.add.rectangle(19, 0, 32, 12, 0x728e66).setStrokeStyle(2, 0x15271e),
      this.add.rectangle(34, 0, 7, 16, 0xbed0a3),
    ]);
    this.player.add(this.bazooka);
  }

  private createHud(): void {
    this.hud = this.add.text(16, 52, '', {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: COLORS.cream, lineSpacing: 4,
    }).addToDisplayList(this.ui);
    this.healthBar = this.add.graphics().addToDisplayList(this.ui);
    this.reloadBar = this.add.graphics().addToDisplayList(this.ui);
    this.levelText = this.add.text(16, 100, '', {
      resolution: UI_SCALE, fontFamily: 'monospace', fontSize: '12px', color: COLORS.yellow,
    }).addToDisplayList(this.ui);
    this.add.text(16, 116, 'ЗДОРОВЬЕ', { resolution: UI_SCALE, fontFamily: 'monospace', fontSize: '10px', color: COLORS.muted }).addToDisplayList(this.ui);
    this.add.text(240, 116, 'БАЗУКА', { resolution: UI_SCALE, fontFamily: 'monospace', fontSize: '10px', color: COLORS.muted }).addToDisplayList(this.ui);
    this.aceAnnouncement = this.add.container(UI_WIDTH / 2, ARENA.top + 34, [
      this.add.rectangle(0, 0, 432, 50, 0x1b2e25, 0.95).setStrokeStyle(2, 0x8bbcff),
      this.add.text(0, 0, 'ТУЗ ПОРВАН!', { resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '30px',
        fontStyle: 'bold', color: '#b9d9ff' }).setOrigin(0.5),
    ]).setDepth(9).setVisible(false).addToDisplayList(this.ui);
    const interactButton = this.add.rectangle(240, 656, 288, 40, 0xffd36a)
      .setStrokeStyle(2, 0xf3edda).setInteractive({ useHandCursor: true });
    this.upgraderInteract = this.add.container(0, 0, [interactButton,
      this.add.text(240, 656, 'АПГРЕЙДЕР  /  E', { resolution: UI_SCALE, fontFamily: 'system-ui',
        fontSize: '17px', fontStyle: 'bold', color: '#15271e' }).setOrigin(0.5),
    ]).setDepth(9).setVisible(false).addToDisplayList(this.ui);
    this.bindButton(interactButton, () => { if (this.canUseUpgrader()) this.openUpgrader(); });
    this.updateHud();
  }

  private createControls(): void {
    if (!this.input.keyboard) throw new Error('Keyboard input is unavailable.');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D', start: 'ENTER',
      restart: 'R', pause: 'P', escape: 'ESC', interact: 'E',
      upgrade1: 'ONE', upgrade2: 'TWO', upgrade3: 'THREE',
    }) as Keys;
    this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.input.mouse?.disableContextMenu();
    this.joystickBase = this.add.circle(0, 0, JOYSTICK_RADIUS, 0x0e1d17, 0.35)
      .setStrokeStyle(2, 0xffd36a, 0.55).setDepth(8).setVisible(false).addToDisplayList(this.ui);
    this.joystickKnob = this.add.circle(0, 0, JOYSTICK_KNOB_RADIUS, 0xffd36a, 0.55)
      .setStrokeStyle(2, 0xf3edda, 0.7).setDepth(8).setVisible(false).addToDisplayList(this.ui);
    this.aceSwipeTrail = this.add.graphics().setDepth(8).addToDisplayList(this.ui);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    const releaseJoystick = (pointer: Phaser.Input.Pointer): void => {
      if (pointer.id === this.upgraderSliderPointer && !this.isPointerPressed(pointer)) this.upgraderSliderPointer = null;
      if (pointer.id === this.aceSwipe?.pointerId && !this.isPointerPressed(pointer)) {
        this.updateAceSwipe(pointer);
        this.cancelAceSwipe();
      }
      if (pointer.id === this.joystickPointerId && !this.isPointerPressed(pointer)) this.stopJoystick();
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, releaseJoystick);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, releaseJoystick);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.stopPointerControls, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state !== 'playing' || !this.isPointerPressed(pointer) || this.aceSwipe) return;
    const x = pointer.x / UI_SCALE;
    const y = pointer.y / UI_SCALE;
    if (x < ARENA.left || x > ARENA.right || y < ARENA.top || y > ARENA.bottom) return;
    const zombie = this.zombies.find(candidate => candidate.ace
      && Phaser.Geom.Rectangle.Contains(Phaser.Geom.Rectangle.Inflate(this.aceScreenBounds(candidate.ace),
        ACE_HIT_PADDING, ACE_HIT_PADDING), x, y));
    if (zombie?.ace) {
      this.aceSwipe = { zombie, pointerId: pointer.id, startX: x, startY: y,
        lastX: x, lastY: y, travel: 0, bounds: this.aceScreenBounds(zombie.ace) };
      return;
    }
    this.startJoystick(pointer);
  }

  private aceScreenBounds(ace: Ace): Phaser.Geom.Rectangle {
    // Карта живёт на большой карте; жест и его след — в неподвижном интерфейсе.
    const point = this.cameras.main.matrixCombined.transformPoint(ace.card.x, ace.card.y);
    return new Phaser.Geom.Rectangle(point.x / UI_SCALE - ACE_CARD_WIDTH / 2,
      point.y / UI_SCALE - ACE_CARD_HEIGHT / 2, ACE_CARD_WIDTH, ACE_CARD_HEIGHT);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.state === 'upgrader') {
      if (pointer.id === this.upgraderSliderPointer && this.isPointerPressed(pointer)) this.setUpgraderSlider(pointer.x / UI_SCALE);
      return;
    }
    if (!this.aceSwipe) { this.updateJoystick(pointer); return; }
    if (pointer.id !== this.aceSwipe.pointerId) { this.updateJoystick(pointer); return; }
    if (!this.isPointerPressed(pointer)) { this.cancelAceSwipe(); return; }
    this.updateAceSwipe(pointer);
  }

  private updateAceSwipe(pointer: Phaser.Input.Pointer): void {
    const swipe = this.aceSwipe;
    if (!swipe || pointer.id !== swipe.pointerId || this.state !== 'playing') return;
    const x = pointer.x / UI_SCALE;
    const y = pointer.y / UI_SCALE;
    swipe.travel += Math.hypot(x - swipe.lastX, y - swipe.lastY);
    swipe.lastX = x; swipe.lastY = y;
    this.aceSwipeTrail.clear().lineStyle(3, 0xb9d9ff, 0.9)
      .lineBetween(swipe.startX, swipe.startY, x, y);
    const dx = Math.abs(x - swipe.startX);
    const dy = Math.abs(y - swipe.startY);
    if (Math.min(dx, dy) < ACE_SWIPE_MIN_AXIS || Math.max(dx, dy) / Math.min(dx, dy) > ACE_SWIPE_MAX_AXIS_RATIO) return;
    // Ломаная из горизонтального и вертикального движений не считается диагональным разрезом.
    if (Math.hypot(dx, dy) / swipe.travel < ACE_SWIPE_MIN_STRAIGHTNESS) return;
    const cut = new Phaser.Geom.Line(swipe.startX, swipe.startY, x, y);
    if (!Phaser.Geom.Intersects.LineToRectangle(cut, swipe.bounds)) return;
    this.tearAce(swipe.zombie);
    this.cancelAceSwipe();
  }

  private cancelAceSwipe(): void {
    this.aceSwipe = undefined;
    this.aceSwipeTrail.clear();
  }

  private stopPointerControls(): void {
    this.upgraderSliderPointer = null;
    this.stopJoystick();
    this.cancelAceSwipe();
  }

  private startJoystick(pointer: Phaser.Input.Pointer): void {
    const x = pointer.x / UI_SCALE;
    const y = pointer.y / UI_SCALE;
    if (this.state !== 'playing' || this.joystickPointerId !== null || !this.isPointerPressed(pointer)
      || x < ARENA.left || x > ARENA.right || y < ARENA.top || y > ARENA.bottom) return;
    // Центр остаётся в точке нажатия, независимо от положения игрока.
    this.joystickPointerId = pointer.id;
    this.joystickBase.setPosition(x, y).setVisible(true);
    this.joystickKnob.setPosition(x, y).setVisible(true);
    this.joystickDirection.set(0, 0);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    if (!this.isPointerPressed(pointer)) { this.stopJoystick(); return; }
    const dx = pointer.x / UI_SCALE - this.joystickBase.x;
    const dy = pointer.y / UI_SCALE - this.joystickBase.y;
    const distance = Math.hypot(dx, dy);
    const length = distance || 1;
    const knobOffset = Math.min(distance, JOYSTICK_RADIUS);
    this.joystickKnob.setPosition(this.joystickBase.x + dx / length * knobOffset,
      this.joystickBase.y + dy / length * knobOffset);
    const strength = Phaser.Math.Clamp((distance - JOYSTICK_DEAD_ZONE) / (JOYSTICK_RADIUS - JOYSTICK_DEAD_ZONE), 0, 1);
    this.joystickDirection.set(dx / length * strength, dy / length * strength);
  }

  private stopJoystick(): void {
    this.joystickPointerId = null;
    this.joystickDirection.set(0, 0);
    this.joystickBase.setVisible(false);
    this.joystickKnob.setVisible(false);
  }

  private isPointerPressed(pointer: Phaser.Input.Pointer): boolean {
    return pointer.wasTouch ? pointer.isDown : pointer.leftButtonDown();
  }

  private bindButton(button: Phaser.GameObjects.Rectangle, action: () => void): void {
    let pressedPointerId: number | null = null;
    button.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPointerPressed(pointer)) pressedPointerId = pointer.id;
    });
    button.on('pointerout', () => { pressedPointerId = null; });
    button.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const clicked = pressedPointerId === pointer.id;
      pressedPointerId = null;
      if (clicked) action();
    });
  }

  private startRound(): void {
    this.overlay.destroy();
    this.state = 'playing';
    this.input.keyboard?.resetKeys();
  }

  private movePlayer(seconds: number): void {
    let dx = Number(this.keys.right.isDown || this.cursors.right.isDown) - Number(this.keys.left.isDown || this.cursors.left.isDown);
    let dy = Number(this.keys.down.isDown || this.cursors.down.isDown) - Number(this.keys.up.isDown || this.cursors.up.isDown);
    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      dx /= length; dy /= length;
    } else {
      this.updateJoystick(this.input.activePointer);
      dx = this.joystickDirection.x;
      dy = this.joystickDirection.y;
    }
    const step = PLAYER_SPEED * seconds;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx * step,
      WORLD.left + PLAYER_RADIUS, WORLD.right - PLAYER_RADIUS);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy * step,
      WORLD.top + PLAYER_RADIUS, WORLD.bottom - PLAYER_RADIUS);
  }

  private aimAndShoot(): void {
    if (this.bazookaLevel === 0) return;
    const nearest = this.nearestZombie(this.player);
    if (!nearest) return;
    const angle = Math.atan2(nearest.body.y - this.player.y, nearest.body.x - this.player.x);
    this.bazooka.rotation = angle;
    if (this.reload > 0) return;
    for (let i = 0; i < this.salvoRockets; i += 1) {
      this.fireRocket(angle + (i - (this.salvoRockets - 1) / 2) * SALVO_SPREAD);
    }
    this.reload = this.shotCooldown;
  }

  private nearestZombie(origin: Phaser.GameObjects.Container): Zombie | undefined {
    return this.zombies.reduce<Zombie | undefined>((best, zombie) =>
      !best || this.distance(zombie.body, origin) < this.distance(best.body, origin) ? zombie : best, undefined);
  }

  private createCompanion(): void {
    const x = Phaser.Math.Clamp(this.player.x - COMPANION_FOLLOW_DISTANCE, WORLD.left + PLAYER_RADIUS, WORLD.right - PLAYER_RADIUS);
    this.companion = this.add.container(x, this.player.y, [
      this.add.ellipse(0, 18, 42, 14, 0x101f18, 0.5),
      this.add.rectangle(0, 12, 30, 23, 0xe7e3d7).setStrokeStyle(2, 0x15271e),
      this.add.ellipse(-18, 10, 11, 22, 0xd5a47c),
      this.add.ellipse(18, 10, 11, 22, 0xd5a47c),
      this.add.circle(0, -6, 18, 0xd5a47c).setStrokeStyle(2, 0x664631),
      this.add.ellipse(-5, -17, 13, 4, 0xebc5a0),
      this.add.ellipse(0, 5, 29, 22, 0x3b2920),
      this.add.rectangle(-7, -7, 9, 5, 0xb93838),
      this.add.rectangle(7, -7, 9, 5, 0xb93838),
      this.add.rectangle(-7, -11, 11, 3, 0x3b2920).setRotation(-0.12),
      this.add.rectangle(7, -11, 11, 3, 0x3b2920).setRotation(0.12),
      this.add.rectangle(0, 1, 8, 3, 0xd5a47c),
      this.add.text(0, -39, 'ДЖИГАН', {
        resolution: UI_SCALE, fontFamily: 'monospace', fontSize: '11px', color: COLORS.yellow,
        stroke: '#15271e', strokeThickness: 3,
      }).setOrigin(0.5),
    ]).setDepth(3).addToDisplayList(this.world);
    this.companionGun = this.add.container(0, 12, [
      this.add.rectangle(19, 0, 23, 8, 0x343a39).setStrokeStyle(2, 0x101f18),
      this.add.rectangle(13, 5, 7, 11, 0x343a39),
    ]);
    this.companion.add(this.companionGun);
  }

  private updateCompanion(seconds: number): void {
    if (!this.companion || !this.companionGun) return;
    const dx = this.player.x - this.companion.x;
    const dy = this.player.y - this.companion.y;
    const distance = Math.hypot(dx, dy);
    const gap = Math.max(0, distance - COMPANION_FOLLOW_DISTANCE);
    const step = Math.min(COMPANION_SPEED * seconds, gap * (1 - Math.exp(-COMPANION_FOLLOW_RESPONSE * seconds)));
    if (gap > 0) {
      this.companion.x += dx / distance * step;
      this.companion.y += dy / distance * step;
    }
    this.companionReload = Math.max(0, this.companionReload - seconds);
    const nearest = this.nearestZombie(this.companion);
    if (!nearest) return;
    const angle = Math.atan2(nearest.body.y - this.companion.y, nearest.body.x - this.companion.x);
    this.companionGun.rotation = angle;
    if (this.companionReload > 0) return;
    const body = this.add.circle(this.companion.x, this.companion.y, BULLET_RADIUS, 0xffe6a5).setDepth(4).addToDisplayList(this.world);
    this.bullets.push({ body, vx: Math.cos(angle) * BULLET_SPEED, vy: Math.sin(angle) * BULLET_SPEED, life: BULLET_LIFETIME });
    this.companionReload = this.companionCooldown(this.companionLevel);
  }

  private moveBullets(seconds: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      // Проверяем всю траекторию кадра, чтобы пуля не пролетала сквозь близкого врага.
      const startX = bullet.body.x;
      const startY = bullet.body.y;
      const dx = bullet.vx * seconds;
      const dy = bullet.vy * seconds;
      bullet.body.x += dx; bullet.body.y += dy; bullet.life -= seconds;
      const lengthSquared = dx * dx + dy * dy;
      const hit = this.zombies.findIndex(zombie => {
        const t = lengthSquared === 0 ? 0 : Phaser.Math.Clamp(
          ((zombie.body.x - startX) * dx + (zombie.body.y - startY) * dy) / lengthSquared, 0, 1);
        return Phaser.Math.Distance.Between(startX + t * dx, startY + t * dy, zombie.body.x, zombie.body.y)
          <= ZOMBIE_RADIUS + BULLET_RADIUS;
      });
      const outside = bullet.body.x < WORLD.left || bullet.body.x > WORLD.right
        || bullet.body.y < WORLD.top || bullet.body.y > WORLD.bottom;
      if (hit < 0 && !outside && bullet.life > 0) continue;
      if (hit >= 0) this.killZombie(hit);
      bullet.body.destroy(); this.bullets.splice(i, 1);
    }
  }

  private fireRocket(angle: number): void {
    const body = this.add.container(this.player.x + Math.cos(angle) * 35, this.player.y + Math.sin(angle) * 35, [
      this.add.triangle(-11, 0, 0, -4, 0, 4, -15, 0, 0xffa65c),
      this.add.rectangle(0, 0, 17, 7, 0xf3edda),
      this.add.triangle(10, 0, 0, -5, 0, 5, 9, 0, 0xffd36a),
    ]).setRotation(angle).setDepth(4).addToDisplayList(this.world);
    this.rockets.push({ body, vx: Math.cos(angle) * ROCKET_SPEED, vy: Math.sin(angle) * ROCKET_SPEED, life: ROCKET_LIFETIME });
  }

  private spawnZombie(): void {
    if (this.zombies.length >= MAX_ZOMBIES) return;
    const view = this.cameras.main.worldView;
    const xAlong = Phaser.Math.Between(Math.ceil(view.left), Math.floor(view.right));
    const yAlong = Phaser.Math.Between(Math.ceil(view.top), Math.floor(view.bottom));
    const positions = [
      { x: view.left - ZOMBIE_RADIUS, y: yAlong }, { x: view.right + ZOMBIE_RADIUS, y: yAlong },
      { x: xAlong, y: view.top - ZOMBIE_RADIUS }, { x: xAlong, y: view.bottom + ZOMBIE_RADIUS },
    ].map(point => ({
      x: Phaser.Math.Clamp(point.x, WORLD.left + ZOMBIE_RADIUS, WORLD.right - ZOMBIE_RADIUS),
      y: Phaser.Math.Clamp(point.y, WORLD.top + ZOMBIE_RADIUS, WORLD.bottom - ZOMBIE_RADIUS),
    })).filter(point => !view.contains(point.x, point.y)
      && Phaser.Math.Distance.Between(point.x, point.y, this.player.x, this.player.y) >= MIN_SPAWN_DISTANCE);
    if (positions.length === 0) return;
    const { x, y } = Phaser.Utils.Array.GetRandom(positions);
    // Появление за текущим обзором работает и в центре карты, и у её границ.
    const body = this.add.container(x, y, [
      this.add.ellipse(0, 13, 34, 12, 0x101f18, 0.4),
      this.add.rectangle(0, 8, 25, 19, 0x647968),
      this.add.circle(0, -4, ZOMBIE_RADIUS - 3, 0x95b879).setStrokeStyle(2, 0x15271e),
      this.add.rectangle(-5, -5, 4, 4, 0x17261d),
      this.add.rectangle(5, -5, 4, 4, 0x17261d),
      this.add.rectangle(2, 3, 8, 3, 0x17261d),
    ]).setDepth(2).addToDisplayList(this.world);
    this.zombies.push({ body, speed: ZOMBIE_SPEED + this.difficulty() * ZOMBIE_SPEED_GAIN });
    this.trySpawnAce();
  }

  private trySpawnAce(): void {
    if (this.elapsed < this.nextAceAt || this.zombies.filter(zombie => zombie.ace).length >= MAX_ACTIVE_ACES
      || Math.random() >= ACE_SPAWN_CHANCE) return;
    // Карта появляется над уже вошедшим на арену зомби, чтобы её сразу можно было увидеть и порвать.
    const view = this.cameras.main.worldView;
    const candidates = this.zombies.filter(zombie => !zombie.ace
      && zombie.body.x >= view.left + ZOMBIE_RADIUS && zombie.body.x <= view.right - ZOMBIE_RADIUS
      && zombie.body.y >= view.top + ACE_CARD_OFFSET + ACE_CARD_HEIGHT / 2
      && zombie.body.y <= view.bottom - ZOMBIE_RADIUS);
    if (candidates.length === 0) return;
    this.addAce(Phaser.Utils.Array.GetRandom(candidates));
    this.nextAceAt = this.elapsed + ACE_SPAWN_COOLDOWN;
  }

  private addAce(zombie: Zombie): void {
    if (zombie.ace) return;
    const card = this.add.container(0, 0, [
      this.add.rectangle(0, 0, ACE_CARD_WIDTH, ACE_CARD_HEIGHT, 0xf3edda).setStrokeStyle(2, 0x8bbcff),
      this.add.text(-15, -22, 'A', { resolution: UI_SCALE, fontFamily: 'serif', fontSize: '14px', fontStyle: 'bold', color: '#23354a' }),
      this.add.text(0, 2, '♠', { resolution: UI_SCALE, fontFamily: 'serif', fontSize: '27px', color: '#23354a' }).setOrigin(0.5),
      this.add.text(15, 22, 'A', { resolution: UI_SCALE, fontFamily: 'serif', fontSize: '14px', fontStyle: 'bold', color: '#23354a' }).setOrigin(1, 1),
      this.add.text(0, -36, '↗ / ↘', { resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#b9d9ff',
        stroke: '#15271e', strokeThickness: 3 }).setOrigin(0.5),
    ]).setDepth(6).addToDisplayList(this.world);
    const shield = this.add.circle(zombie.body.x, zombie.body.y, ZOMBIE_RADIUS + 10, 0x8bbcff, 0.12)
      .setStrokeStyle(3, 0x8bbcff, 0.8).setDepth(2).addToDisplayList(this.world);
    zombie.ace = { card, shield };
    this.updateAcePosition(zombie);
    this.floatText(card.x, card.y - 45, 'ТУЗ! Порви по диагонали', '#b9d9ff');
  }

  private updateAcePosition(zombie: Zombie): void {
    if (!zombie.ace) return;
    zombie.ace.shield.setPosition(zombie.body.x, zombie.body.y);
    zombie.ace.card.setPosition(
      Phaser.Math.Clamp(zombie.body.x, WORLD.left + ACE_CARD_WIDTH / 2, WORLD.right - ACE_CARD_WIDTH / 2),
      Math.max(WORLD.top + ACE_CARD_HEIGHT / 2, zombie.body.y - ACE_CARD_OFFSET));
  }

  private tearAce(zombie: Zombie): void {
    if (!zombie.ace) return;
    const { card, shield } = zombie.ace;
    const halfWidth = ACE_CARD_WIDTH / 2;
    const halfHeight = ACE_CARD_HEIGHT / 2;
    // Две бумажные половинки разлетаются вдоль диагонального разрыва.
    for (const side of [-1, 1]) {
      const points = side === -1
        ? [{ x: -halfWidth, y: -halfHeight }, { x: halfWidth, y: -halfHeight }, { x: halfWidth, y: halfHeight }]
        : [{ x: -halfWidth, y: -halfHeight }, { x: -halfWidth, y: halfHeight }, { x: halfWidth, y: halfHeight }];
      const fragment = this.add.graphics().setPosition(card.x, card.y).setDepth(7).addToDisplayList(this.world);
      const vertices = points.map(point => new Phaser.Math.Vector2(point.x, point.y));
      fragment.fillStyle(0xf3edda).fillPoints(vertices, true);
      fragment.lineStyle(2, 0x8bbcff).strokePoints(vertices, true);
      this.tweens.add({ targets: fragment, x: card.x + side * 24, y: card.y - side * 20,
        rotation: side * 0.3, alpha: 0, duration: 320, onComplete: () => fragment.destroy() });
    }
    this.floatText(card.x, card.y - 32, 'Туз порван!', '#b9d9ff');
    this.showAceAnnouncement();
    this.tweens.killTweensOf(shield);
    card.destroy(); shield.destroy(); zombie.ace = undefined;
  }

  private showAceAnnouncement(): void {
    this.tweens.killTweensOf(this.aceAnnouncement);
    this.aceAnnouncement.setVisible(true).setAlpha(1).setScale(1);
    this.tweens.add({ targets: this.aceAnnouncement, alpha: 0, delay: ACE_ANNOUNCEMENT_DURATION,
      duration: 250, onComplete: () => this.aceAnnouncement.setVisible(false) });
  }

  private moveZombies(seconds: number): void {
    for (let i = this.zombies.length - 1; i >= 0; i -= 1) {
      const zombie = this.zombies[i];
      // Убежавшие далеко враги освобождают лимит; награда за них не выдаётся.
      if (this.distance(zombie.body, this.player) > ZOMBIE_DESPAWN_DISTANCE) {
        if (this.aceSwipe?.zombie === zombie) this.cancelAceSwipe();
        if (zombie.ace) {
          this.tweens.killTweensOf(zombie.ace.shield);
          zombie.ace.card.destroy(); zombie.ace.shield.destroy();
        }
        zombie.body.destroy(); this.zombies.splice(i, 1);
        continue;
      }
      const angle = Math.atan2(this.player.y - zombie.body.y, this.player.x - zombie.body.x);
      zombie.body.x += Math.cos(angle) * zombie.speed * seconds;
      zombie.body.y += Math.sin(angle) * zombie.speed * seconds;
      this.updateAcePosition(zombie);
      if (this.invulnerable > 0 || this.distance(zombie.body, this.player) > PLAYER_RADIUS + ZOMBIE_RADIUS) continue;
      this.health -= 1;
      this.invulnerable = HURT_COOLDOWN;
      this.cameras.main.shake(100, 0.004);
      this.floatText(this.player.x, this.player.y - 35, '−1 здоровье', '#ff987d');
      if (this.health <= 0) { this.endRound(); return; }
    }
  }

  private moveRockets(seconds: number): void {
    for (let i = this.rockets.length - 1; i >= 0; i -= 1) {
      const rocket = this.rockets[i];
      rocket.body.x += rocket.vx * seconds;
      rocket.body.y += rocket.vy * seconds;
      rocket.life -= seconds;
      const hit = this.zombies.some(zombie => this.distance(zombie.body, rocket.body) < ZOMBIE_RADIUS + 9);
      const outside = rocket.body.x < WORLD.left || rocket.body.x > WORLD.right || rocket.body.y < WORLD.top || rocket.body.y > WORLD.bottom;
      if (!hit && !outside && rocket.life > 0) continue;
      this.explode(rocket.body.x, rocket.body.y);
      rocket.body.destroy();
      this.rockets.splice(i, 1);
    }
  }

  private explode(x: number, y: number): void {
    const flash = this.add.circle(x, y, this.blastRadius, 0xffd36a, 0.2).setStrokeStyle(3, 0xffb15c).setDepth(4).addToDisplayList(this.world);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.18, duration: 230, onComplete: () => flash.destroy() });
    for (let i = this.zombies.length - 1; i >= 0; i -= 1) {
      const zombie = this.zombies[i];
      if (Phaser.Math.Distance.Between(x, y, zombie.body.x, zombie.body.y) > this.blastRadius + ZOMBIE_RADIUS) continue;
      this.killZombie(i);
    }
  }

  private killZombie(index: number): void {
    const zombie = this.zombies[index];
    if (zombie.ace) {
      const shield = zombie.ace.shield;
      this.tweens.killTweensOf(shield);
      shield.setScale(1.12).setAlpha(1);
      this.tweens.add({ targets: shield, scale: 1, alpha: 0.7, duration: 180 });
      return;
    }
    this.dropChips(zombie.body.x, zombie.body.y);
    zombie.body.destroy(); this.zombies.splice(index, 1);
    this.kills += 1;
  }

  private dropChips(x: number, y: number): void {
    if (this.chips.length >= MAX_CHIPS) this.chips.shift()?.destroy();
    // Добыча всегда остаётся внутри доступного поля, даже при взрыве у края.
    x = Phaser.Math.Clamp(x, WORLD.left + 16, WORLD.right - 16);
    y = Phaser.Math.Clamp(y, WORLD.top + 16, WORLD.bottom - 16);
    this.chips.push(this.add.container(x, y, [
      this.add.rectangle(0, 0, 20, 25, 0xffd36a).setStrokeStyle(2, 0x71562a),
      this.add.rectangle(0, -8, 18, 4, 0xe88e46),
      this.add.ellipse(0, 2, 11, 8, 0xffefb4).setRotation(-0.4),
    ]).setDepth(1).addToDisplayList(this.world));
  }

  private collectChips(seconds: number): void {
    for (let i = this.chips.length - 1; i >= 0; i -= 1) {
      const chip = this.chips[i];
      const distance = this.distance(chip, this.player);
      if (distance <= CHIP_MAGNET_RADIUS && distance > CHIP_PICKUP_RADIUS) {
        const step = Math.min(CHIP_ATTRACT_SPEED * seconds, distance);
        chip.x += (this.player.x - chip.x) / distance * step;
        chip.y += (this.player.y - chip.y) / distance * step;
      }
      if (this.distance(chip, this.player) > CHIP_PICKUP_RADIUS) continue;
      const healed = this.health < MAX_HEALTH;
      this.health = Math.min(MAX_HEALTH, this.health + CHIP_HEAL);
      this.score += 1;
      this.saveBestScore();
      this.experience += 1;
      this.chips[i].destroy(); this.chips.splice(i, 1);
      this.floatText(this.player.x, this.player.y - 30, healed ? '+1 опыт · +1 здоровье' : '+1 опыт', COLORS.yellow);
      if (this.experience >= this.nextLevelXp) {
        this.experience -= this.nextLevelXp;
        this.nextLevelXp += LEVEL_XP_GAIN;
        this.level += 1;
        this.showUpgradeChoices();
        break;
      }
    }
  }

  private bazookaStats(level: number): { shotCooldown: number; blastRadius: number; salvoRockets: number } {
    const upgrades = level - 1;
    return {
      shotCooldown: Math.max(MIN_SHOT_COOLDOWN, SHOT_COOLDOWN * RELOAD_UPGRADE_FACTOR ** upgrades),
      blastRadius: BLAST_RADIUS + BLAST_RADIUS_UPGRADE * upgrades,
      salvoRockets: Math.min(MAX_SALVO_ROCKETS, 1 + Math.floor(upgrades / LEVELS_PER_EXTRA_ROCKET)),
    };
  }

  private companionCooldown(level: number): number {
    return Math.max(DJIGAN_MIN_COOLDOWN, DJIGAN_SHOT_COOLDOWN * DJIGAN_RELOAD_FACTOR ** (level - 1));
  }

  private canUseUpgrader(): boolean {
    return this.state === 'playing' && this.upgrader !== undefined
      && this.distance(this.upgrader, this.player) <= UPGRADER_INTERACT_DISTANCE;
  }

  private updateUpgraderObject(): void {
    if (this.upgrader && this.distance(this.upgrader, this.player) > UPGRADER_DESPAWN_DISTANCE) {
      this.upgrader.destroy(); this.upgrader = undefined;
    }
    if (!this.upgrader && this.elapsed >= this.nextUpgraderAt) this.spawnUpgrader();
    this.upgraderInteract.setVisible(this.canUseUpgrader());
  }

  private spawnUpgrader(): void {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.Between(UPGRADER_SPAWN_DISTANCE_MIN, UPGRADER_SPAWN_DISTANCE_MAX);
    let x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, WORLD.left + 40, WORLD.right - 40);
    let y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, WORLD.top + 60, WORLD.bottom - 40);
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < UPGRADER_INTERACT_DISTANCE) {
      x = this.player.x + (this.player.x < WORLD.right / 2 ? distance : -distance);
      y = this.player.y;
    }
    this.upgrader = this.add.container(x, y, [
      this.add.ellipse(0, 28, 66, 20, 0x101f18, 0.6),
      this.add.rectangle(0, 4, 52, 52, 0x263d35).setStrokeStyle(3, 0xb6ef42),
      this.add.text(0, 0, '⇧', { resolution: UI_SCALE, fontFamily: 'system-ui', fontSize: '40px',
        fontStyle: 'bold', color: '#b6ef42' }).setOrigin(0.5),
      this.add.text(0, -42, 'АПГРЕЙДЕР', { resolution: UI_SCALE, fontFamily: 'system-ui', fontSize: '15px',
        fontStyle: 'bold', color: '#b6ef42', stroke: '#15271e', strokeThickness: 4 }).setOrigin(0.5),
    ]).setDepth(1).addToDisplayList(this.world);
    this.nextUpgraderAt = this.elapsed + Phaser.Math.Between(UPGRADER_SPAWN_MIN, UPGRADER_SPAWN_MAX);
    this.floatText(this.player.x, this.player.y - 45, 'Апгрейдер появился рядом!', '#b6ef42');
  }

  private openUpgrader(): void {
    if (!this.canUseUpgrader()) return;
    this.stopPointerControls(); this.input.keyboard?.resetKeys(); this.tweens.pauseAll();
    this.state = 'upgrader'; this.upgraderInteract.setVisible(false);
    this.upgraderSelection = undefined; this.upgraderResult = undefined; this.upgraderSpin = undefined;
    const shade = this.add.rectangle(240, 400, UI_WIDTH, UI_HEIGHT, 0x101315, 0.98).setInteractive();
    this.overlay = this.add.container(0, 0, [shade]).setDepth(10).addToDisplayList(this.ui);
    const text = (x: number, y: number, label: string, size = 16, color: string = COLORS.cream): Phaser.GameObjects.Text => {
      const object = this.add.text(x, y, label, { resolution: UI_SCALE, fontFamily: 'system-ui',
        fontSize: `${size}px`, color, align: 'center', wordWrap: { width: 424 }, lineSpacing: 4 }).setOrigin(0.5);
      this.overlay.add(object); return object;
    };
    text(240, 38, '⇧  АПГРЕЙДЕР', 28, '#b6ef42').setFontStyle('bold');
    text(240, 87, 'Выбери предмет и желаемый уровень.\nЧем выше уровень, тем меньше шанс.', 16);
    text(240, 137, 'НЕУДАЧА УНИЧТОЖАЕТ ВЫБРАННЫЙ ПРЕДМЕТ', 12, '#ffa882');
    const ring = this.add.graphics();
    const leftSlot = this.add.rectangle(76, 325, 104, 100, 0x202a25).setStrokeStyle(2, 0x536657);
    const rightSlot = this.add.rectangle(404, 325, 104, 100, 0x202a25).setStrokeStyle(2, 0xb6ef42);
    const pointer = this.add.container(UPGRADER_WHEEL_X, UPGRADER_WHEEL_Y, [
      this.add.triangle(103, 0, 0, -7, 0, 7, -16, 0, 0xffd36a),
    ]).setRotation(Math.PI / 2);
    this.overlay.add([ring, leftSlot, rightSlot, pointer]);
    text(76, 254, 'ПРЕДМЕТ', 12, COLORS.muted);
    text(404, 254, 'РЕЗУЛЬТАТ', 12, '#b6ef42');
    const input = text(76, 325, 'ВЫБЕРИ\nПРЕДМЕТ', 13);
    const output = text(404, 325, '—', 13, '#b6ef42');
    const chance = text(240, 314, '—', 27, '#b6ef42').setFontStyle('bold');
    text(240, 349, 'ШАНС УСПЕХА', 11, COLORS.muted);
    const target = text(240, 446, 'Выбери предмет внизу', 17);
    const track = this.add.rectangle(240, 485, UPGRADER_SLIDER_RIGHT - UPGRADER_SLIDER_LEFT, 32, 0x28372d)
      .setStrokeStyle(1, 0x536657).setInteractive({ useHandCursor: true });
    const knob = this.add.circle(UPGRADER_SLIDER_LEFT, 485, 17, 0xb6ef42).setStrokeStyle(2, 0xf3edda);
    const slider = this.add.container(0, 0, [track, knob]); this.overlay.add(slider);
    track.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state !== 'upgrader' || this.upgraderSpin || !this.upgraderSelection || !this.isPointerPressed(p)) return;
      this.upgraderSliderPointer = p.id; this.setUpgraderSlider(p.x / UI_SCALE);
    });
    text(240, 532, 'ТВОИ ПРЕДМЕТЫ', 15, COLORS.muted);
    const items: UpgraderView['items'] = [];
    for (const [index, weapon] of (['bazooka', 'djigan'] as const).entries()) {
      const x = 130 + index * 220;
      const button = this.add.rectangle(x, 595, 192, 84, 0x26372d).setStrokeStyle(2, 0x536657)
        .setInteractive({ useHandCursor: true });
      this.overlay.add(button);
      const label = text(x, 595, '', 17);
      this.bindButton(button, () => this.selectUpgraderWeapon(weapon));
      items.push({ weapon, button, label });
    }
    const status = text(240, 680, 'Выбери предмет. Попытки не ограничены.', 15);
    const rollButton = this.add.rectangle(154, 744, 232, 48, 0xb6ef42).setInteractive({ useHandCursor: true });
    const exitButton = this.add.rectangle(360, 744, 160, 48, 0x31473b).setInteractive({ useHandCursor: true });
    this.overlay.add([rollButton, exitButton]);
    const rollLabel = text(154, 744, 'АПГРЕЙД', 19, '#15271e').setFontStyle('bold');
    text(360, 744, 'ВЫЙТИ', 18);
    text(240, 785, 'Esc — выйти после завершения попытки', 12, COLORS.muted);
    this.bindButton(rollButton, () => this.startUpgraderSpin());
    this.bindButton(exitButton, () => this.closeUpgrader());
    this.upgraderView = { input, output, chance, target, status, ring, pointer, slider, knob,
      rollButton, rollLabel, exitButton, items };
    this.refreshUpgrader();
  }

  private selectUpgraderWeapon(weapon: WeaponChoice): void {
    if (this.state !== 'upgrader' || this.upgraderSpin || this.weaponLevel(weapon) === 0) return;
    this.upgraderSelection = weapon; this.upgraderTargetLevel = this.weaponLevel(weapon) + 1;
    this.upgraderResult = undefined;
    this.refreshUpgrader();
  }

  private setUpgraderSlider(x: number): void {
    if (!this.upgraderSelection || this.upgraderSpin) return;
    const fraction = Phaser.Math.Clamp((x - UPGRADER_SLIDER_LEFT) / (UPGRADER_SLIDER_RIGHT - UPGRADER_SLIDER_LEFT), 0, 1);
    this.upgraderTargetLevel = this.weaponLevel(this.upgraderSelection) + 1
      + Math.round(fraction * (UPGRADER_MAX_LEVEL_GAIN - 1));
    this.refreshUpgrader();
  }

  private upgraderChance(gain: number): number {
    return Math.max(UPGRADER_MIN_CHANCE, UPGRADER_BASE_CHANCE * UPGRADER_CHANCE_FACTOR ** (gain - 1));
  }

  private drawUpgraderRing(chance: number): void {
    const ring = this.upgraderView!.ring;
    ring.clear().lineStyle(18, 0x27312b).strokeCircle(UPGRADER_WHEEL_X, UPGRADER_WHEEL_Y, UPGRADER_WHEEL_RADIUS);
    ring.lineStyle(1, 0x536657).strokeCircle(UPGRADER_WHEEL_X, UPGRADER_WHEEL_Y, 98);
    const start = Math.PI / 2 - Math.PI * chance;
    const green = new Phaser.Display.Color(142, 235, 32);
    const orange = new Phaser.Display.Color(255, 156, 49);
    const segments = 64;
    for (let i = 0; i < segments && chance > 0; i += 1) {
      const warmth = 1 - Math.abs(2 * i / (segments - 1) - 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(green, orange, 100, warmth * 100);
      ring.lineStyle(18, Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      ring.beginPath().arc(UPGRADER_WHEEL_X, UPGRADER_WHEEL_Y, UPGRADER_WHEEL_RADIUS,
        start + Math.PI * 2 * chance * i / segments, start + Math.PI * 2 * chance * (i + 1) / segments).strokePath();
    }
  }

  private refreshUpgrader(): void {
    const view = this.upgraderView;
    if (!view) return;
    const weapon = this.upgraderSelection;
    const spinning = this.upgraderSpin !== undefined;
    const current = weapon ? this.weaponLevel(weapon) : 0;
    const chance = weapon ? this.upgraderChance(this.upgraderTargetLevel - current) : 0;
    if (!this.upgraderResult || weapon) {
      view.chance.setText(weapon ? `${(chance * 100).toFixed(2)}%` : '—');
      this.drawUpgraderRing(chance);
    }
    view.input.setText(weapon ? `${this.weaponName(weapon)}\nУР. ${current}` : 'ВЫБЕРИ\nПРЕДМЕТ');
    view.output.setText(weapon ? `${this.weaponName(weapon)}\nУР. ${this.upgraderTargetLevel}`
      : this.upgraderResult?.won ? `${this.weaponName(this.upgraderResult.weapon)}\nУР. ${this.upgraderResult.level}\n✓ ПОЛУЧЕН` : '—');
    view.target.setText(weapon ? `Уровень ${current} → ${this.upgraderTargetLevel}  (+${this.upgraderTargetLevel - current})`
      : 'Выбери предмет внизу');
    view.slider.setVisible(weapon !== undefined).setAlpha(spinning ? 0.4 : 1);
    if (weapon) view.knob.x = UPGRADER_SLIDER_LEFT + (this.upgraderTargetLevel - current - 1)
      / (UPGRADER_MAX_LEVEL_GAIN - 1) * (UPGRADER_SLIDER_RIGHT - UPGRADER_SLIDER_LEFT);
    for (const item of view.items) {
      const level = this.weaponLevel(item.weapon);
      item.button.setVisible(level > 0).setAlpha(spinning ? 0.4 : 1)
        .setStrokeStyle(2, item.weapon === weapon ? 0xb6ef42 : 0x536657);
      item.label.setVisible(level > 0).setText(`${this.weaponName(item.weapon)}\nУРОВЕНЬ ${level}`);
    }
    view.rollButton.setAlpha(weapon && !spinning ? 1 : 0.35);
    view.rollLabel.setText(spinning ? 'КРУТИТСЯ…' : 'АПГРЕЙД');
    view.exitButton.setAlpha(spinning ? 0.35 : 1);
    view.status.setText(spinning ? 'Стрелка решает исход. Дождись остановки.'
      : this.upgraderResult ? this.upgraderResult.won
        ? 'УСПЕХ! Предмет улучшен и возвращён в инвентарь.'
        : this.bazookaLevel === 0 && this.companionLevel === 0
          ? 'ПРОИГРЫШ. Предметов не осталось.\nНажми «Выйти», чтобы продолжить без оружия.'
          : 'ПРОИГРЫШ. Предмет потерян.\nВыбери другой или выйди в игру.'
        : this.bazookaLevel === 0 && this.companionLevel === 0
          ? 'Предметов нет. Нажми «Выйти».\nНовое оружие можно получить за уровень игрока.'
          : 'Выбери предмет. Попытки не ограничены.');
  }

  private startUpgraderSpin(): void {
    const weapon = this.upgraderSelection;
    if (this.state !== 'upgrader' || !weapon || this.upgraderSpin || this.weaponLevel(weapon) === 0) return;
    const chance = this.upgraderChance(this.upgraderTargetLevel - this.weaponLevel(weapon));
    const from = Phaser.Math.Angle.Normalize(this.upgraderView!.pointer.rotation);
    // Равномерная конечная точка. Исход определяется той же дугой, которая нарисована на экране.
    const end = Math.random() * Math.PI * 2;
    const travel = Math.PI * 2 * UPGRADER_SPIN_TURNS + Phaser.Math.Angle.Normalize(end - from);
    this.upgraderSpin = { weapon, level: this.upgraderTargetLevel, chance, from, travel, elapsed: 0 };
    this.upgraderSliderPointer = null; this.refreshUpgrader();
  }

  private updateUpgraderSpin(seconds: number): void {
    const spin = this.upgraderSpin;
    if (!spin || !this.upgraderView) return;
    spin.elapsed = Math.min(UPGRADER_SPIN_SECONDS, spin.elapsed + seconds);
    const progress = spin.elapsed / UPGRADER_SPIN_SECONDS;
    this.upgraderView.pointer.rotation = spin.from + spin.travel * (1 - (1 - progress) ** 3);
    if (progress < 1) return;
    const won = Math.abs(Phaser.Math.Angle.Wrap(this.upgraderView.pointer.rotation - Math.PI / 2)) <= Math.PI * spin.chance;
    this.setWeaponLevel(spin.weapon, won ? spin.level : 0);
    this.upgraderResult = { weapon: spin.weapon, level: spin.level, won };
    this.upgraderSpin = undefined; this.upgraderSelection = undefined;
    this.refreshUpgrader();
  }

  private closeUpgrader(): void {
    if (this.state !== 'upgrader' || this.upgraderSpin) return;
    this.overlay.destroy(); this.upgraderView = undefined; this.upgraderSelection = undefined;
    this.upgraderResult = undefined; this.upgraderSliderPointer = null;
    this.state = 'playing'; this.tweens.resumeAll(); this.input.keyboard?.resetKeys();
    this.stopPointerControls(); this.updateUpgraderObject(); this.updateHud();
  }

  private chooseUpgrade(index: number): void {
    const weapon = this.upgradeChoices[index];
    if (this.state !== 'upgrading' || !weapon) return;
    this.setWeaponLevel(weapon, this.weaponLevel(weapon) + 1);
    this.upgradeChoices = [];
    this.overlay.destroy();
    this.state = 'playing';
    this.tweens.resumeAll();
    this.input.keyboard?.resetKeys();
    this.updateHud();
  }

  private weaponLevel(weapon: WeaponChoice): number {
    return weapon === 'bazooka' ? this.bazookaLevel : this.companionLevel;
  }

  private weaponName(weapon: WeaponChoice): string {
    return weapon === 'bazooka' ? 'БАЗУКА' : 'ДЖИГАН';
  }

  private setWeaponLevel(weapon: WeaponChoice, level: number): void {
    if (weapon === 'bazooka') {
      this.bazookaLevel = level;
      this.bazooka.setVisible(level > 0);
      const stats = this.bazookaStats(Math.max(1, level));
      this.shotCooldown = stats.shotCooldown;
      this.blastRadius = stats.blastRadius;
      this.salvoRockets = stats.salvoRockets;
      this.reload = Math.min(this.reload, this.shotCooldown);
      if (level === 0) {
        this.rockets.forEach(rocket => rocket.body.destroy()); this.rockets = []; this.reload = 0;
      }
    } else {
      this.companionLevel = level;
      if (level > 0) {
        if (!this.companion) this.createCompanion();
        this.companionReload = Math.min(this.companionReload, this.companionCooldown(level));
      } else {
        this.companion?.destroy(); this.companion = undefined; this.companionGun = undefined;
        this.bullets.forEach(bullet => bullet.body.destroy()); this.bullets = []; this.companionReload = 0;
      }
    }
    this.updateHud();
  }

  private showUpgradeChoices(): void {
    this.stopPointerControls();
    this.state = 'upgrading';
    this.upgradeChoices = Phaser.Utils.Array.Shuffle<WeaponChoice>(['bazooka', 'djigan']);
    this.tweens.pauseAll();
    const centerX = UI_WIDTH / 2;
    const shade = this.add.rectangle(centerX, UI_HEIGHT / 2, UI_WIDTH, UI_HEIGHT, 0x0e1d17, 0.92).setInteractive();
    const heading = this.add.text(centerX, 40, `УРОВЕНЬ ${this.level}\nВЫБЕРИ ОРУЖИЕ`, {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: COLORS.yellow, align: 'center',
    }).setOrigin(0.5, 0);
    const hint = this.add.text(centerX, 112, 'Прокачай оружие или найми компаньона.\nОдин выбор за уровень.', {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: COLORS.cream, align: 'center',
    }).setOrigin(0.5, 0);
    this.overlay = this.add.container(0, 0, [shade, heading, hint]).setDepth(10).addToDisplayList(this.ui);
    const next = this.bazookaStats(this.bazookaLevel + 1);
    for (let index = 0; index < 3; index += 1) {
      const y = 246 + index * 192;
      const weapon = this.upgradeChoices[index];
      const available = weapon !== undefined;
      const hiring = weapon !== undefined && this.weaponLevel(weapon) === 0;
      const card = this.add.rectangle(centerX, y, 432, 172, 0x253c30)
        .setStrokeStyle(2, available ? 0xffd36a : 0x57704e);
      if (available) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setFillStyle(0x36523c));
        card.on('pointerout', () => card.setFillStyle(0x253c30));
        this.bindButton(card, () => this.chooseUpgrade(index));
      }
      const title = this.add.text(40, y - 72, weapon === 'bazooka' ? 'БАЗУКА' : weapon === 'djigan' ? 'ДЖИГАН' : '—', {
        resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '21px', fontStyle: 'bold', color: COLORS.yellow,
      });
      const category = this.add.text(40, y - 43, weapon === 'djigan' ? 'КОМПАНЬОН' : weapon === 'bazooka' ? 'ОРУЖИЕ' : '', {
        resolution: UI_SCALE, fontFamily: 'monospace', fontSize: '12px', color: COLORS.muted,
      });
      const description = this.add.text(40, y - 20, weapon === 'bazooka'
        ? hiring ? `Получить базуку · уровень 1\nПерезарядка: ${SHOT_COOLDOWN.toFixed(2)} с\nРадиус: ${BLAST_RADIUS}\nРакет: 1`
          : `Уровень ${this.bazookaLevel} → ${this.bazookaLevel + 1}\nПерезарядка: ${this.shotCooldown.toFixed(2)} → ${next.shotCooldown.toFixed(2)} с\nРадиус: ${this.blastRadius} → ${next.blastRadius}\nРакет: ${this.salvoRockets} → ${next.salvoRockets}`
        : weapon === 'djigan'
          ? `${hiring ? 'Нанять · уровень 1' : `Уровень ${this.companionLevel} → ${this.companionLevel + 1}`}\nХодит рядом, стреляет сам\nПерезарядка:\n${hiring ? `${DJIGAN_SHOT_COOLDOWN.toFixed(2)} с` : `${this.companionCooldown(this.companionLevel).toFixed(2)} → ${this.companionCooldown(this.companionLevel + 1).toFixed(2)} с`}`
          : 'Нет другого оружия', {
        resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: COLORS.cream,
        lineSpacing: 4, wordWrap: { width: 392 },
      });
      const keyHint = this.add.text(440, y - 67, available ? `[ ${index + 1} ] ${hiring ? weapon === 'djigan' ? 'НАНЯТЬ' : 'ВЗЯТЬ' : 'ПРОКАЧАТЬ'}` : 'ПУСТО', {
        resolution: UI_SCALE, fontFamily: 'monospace', fontSize: '14px', color: available ? COLORS.yellow : COLORS.muted,
      }).setOrigin(1, 0);
      this.overlay.add([card, title, category, description, keyHint]);
    }
  }

  private updateHud(): void {
    const time = Math.floor(this.elapsed);
    this.hud.setText(`ЧИПСЫ ${this.score}    ЗОМБИ ${this.kills}\nВРЕМЯ ${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}    РЕКОРД ${this.bestScore}`);
    this.levelText.setText(`УР. ${this.level}  ·  ОПЫТ ${this.experience}/${this.nextLevelXp}  ·  БАЗУКА ${this.bazookaLevel || '—'}  ·  ДЖИГАН ${this.companionLevel || '—'}`);
    this.healthBar.clear();
    for (let i = 0; i < MAX_HEALTH; i += 1) {
      this.healthBar.fillStyle(i < this.health ? 0x95b879 : 0x31473b).fillRoundedRect(84 + i * 22, 119, 18, 8, 2);
    }
    this.reloadBar.clear().fillStyle(0x31473b).fillRect(292, 120, 172, 5);
    this.reloadBar.fillStyle(0xffd36a).fillRect(292, 120, this.bazookaLevel > 0
      ? 172 * Phaser.Math.Clamp(1 - this.reload / this.shotCooldown, 0, 1) : 0, 5);
  }

  private floatText(x: number, y: number, label: string, color: string): void {
    const text = this.add.text(x, y, label, {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color,
      stroke: '#15271e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5).addToDisplayList(this.world);
    this.tweens.add({ targets: text, y: y - 26, alpha: 0, duration: 650, onComplete: () => text.destroy() });
  }

  private togglePause(): void {
    if (this.state === 'playing') {
      this.state = 'paused'; this.tweens.pauseAll();
      this.showOverlay('ПЕРЕКУС?', 'Игра на паузе.\n\nP / Esc / Enter — продолжить\nR — начать новый забег', 'ПРОДОЛЖИТЬ');
    } else if (this.state === 'paused') {
      this.overlay.destroy(); this.state = 'playing'; this.tweens.resumeAll();
      this.input.keyboard?.resetKeys();
    }
  }

  private endRound(): void {
    this.state = 'ended'; this.updateHud();
    this.showOverlay('ЗОМБИ ДОБРАЛИСЬ ДО ТЕБЯ',
      `Ты продержался ${Math.floor(this.elapsed)} сек.\n\nСъедено чипсов: ${this.score}\nРекорд: ${this.bestScore}\nПобеждено зомби: ${this.kills}\n\nЕщё один забег? R / Enter — заново.`, 'ЕЩЁ РАЗ');
  }

  private showOverlay(title: string, message: string, buttonLabel: string): void {
    this.stopPointerControls();
    const centerX = UI_WIDTH / 2;
    const centerY = UI_HEIGHT / 2;
    const shade = this.add.rectangle(centerX, centerY, UI_WIDTH, UI_HEIGHT, 0x0e1d17, 0.88).setInteractive();
    const panel = this.add.rectangle(centerX, centerY, 448, 620, 0x1b2e25).setStrokeStyle(2, 0x57704e);
    const heading = this.add.text(centerX, 122, title, {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: COLORS.yellow,
      align: 'center', wordWrap: { width: 408 },
    }).setOrigin(0.5, 0);
    const body = this.add.text(centerX, 206, message, {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: COLORS.cream, align: 'center', lineSpacing: 8,
      wordWrap: { width: 396 },
    }).setOrigin(0.5, 0);
    const button = this.add.rectangle(centerX, 646, 360, 60, 0xffd36a).setInteractive({ useHandCursor: true });
    const label = this.add.text(centerX, 646, buttonLabel, {
      resolution: UI_SCALE, fontFamily: 'system-ui, sans-serif', fontSize: '20px', fontStyle: 'bold', color: '#1b2e25',
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setFillStyle(0xffe6a5));
    button.on('pointerout', () => button.setFillStyle(0xffd36a));
    this.bindButton(button, () => {
      if (this.state === 'ready') this.startRound();
      else if (this.state === 'paused') this.togglePause();
      else if (this.state === 'ended') this.scene.restart();
    });
    this.overlay = this.add.container(0, 0, [shade, panel, heading, body, button, label]).setDepth(10).addToDisplayList(this.ui);
  }

  private difficulty(): number {
    return Phaser.Math.Clamp(this.elapsed / DIFFICULTY_RAMP_SECONDS, 0, 1);
  }

  private readBestScore(): number {
    try {
      const saved = Number(localStorage.getItem(BEST_SCORE_KEY));
      return Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
    } catch { return 0; }
  }

  private saveBestScore(): void {
    if (this.score <= this.bestScore) return;
    this.bestScore = Math.max(this.score, this.readBestScore());
    try { localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore)); }
    catch { /* Если хранилище недоступно, рекорд остаётся до закрытия игры. */ }
  }

  private distance(a: Phaser.GameObjects.Container, b: Phaser.GameObjects.Container): number {
    return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
  }
}
