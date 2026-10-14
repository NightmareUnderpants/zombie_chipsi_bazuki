import Phaser from 'phaser';

// Все правила первого прототипа можно менять здесь.
const PLAYER_SPEED = 245;
const PLAYER_RADIUS = 17;
const MAX_HEALTH = 5;
const ROUND_SECONDS = 90;
const ZOMBIE_RADIUS = 16;
const ZOMBIE_SPEED = 43;
const ZOMBIE_SPEED_GAIN = 32;
const SPAWN_INTERVAL = 1.15;
const MIN_SPAWN_INTERVAL = 0.4;
const MAX_ZOMBIES = 60;
const ROCKET_SPEED = 510;
const ROCKET_LIFETIME = 1.05;
const SHOT_COOLDOWN = 1.1;
const BLAST_RADIUS = 45;
const RELOAD_UPGRADE_FACTOR = 0.85;
const MIN_SHOT_COOLDOWN = 0.22;
const BLAST_RADIUS_UPGRADE = 15;
const MAX_SALVO_ROCKETS = 5;
const LEVELS_PER_EXTRA_ROCKET = 3;
const SALVO_SPREAD = 0.2;
const FIRST_LEVEL_XP = 5;
const LEVEL_XP_GAIN = 3;
const HURT_COOLDOWN = 1.2;
const CHIP_PICKUP_RADIUS = 29;
const CHIP_MAGNET_RADIUS = 100;
const CHIP_ATTRACT_SPEED = 360;
const CHIP_HEAL = 1;
const MAX_CHIPS = 80;
const ARENA = { left: 28, right: 932, top: 130, bottom: 554 };
const COLORS = { cream: '#f3edda', muted: '#a4b7ad', yellow: '#ffd36a' };

type Keys = Record<'up' | 'down' | 'left' | 'right' | 'start' | 'restart' | 'pause' | 'escape' | 'upgrade1', Phaser.Input.Keyboard.Key>;
type Zombie = { body: Phaser.GameObjects.Container; speed: number };
type Rocket = { body: Phaser.GameObjects.Container; vx: number; vy: number; life: number };
type State = 'ready' | 'playing' | 'paused' | 'upgrading' | 'ended';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private bazooka!: Phaser.GameObjects.Container;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Keys;
  private hud!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private reloadBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private zombies: Zombie[] = [];
  private rockets: Rocket[] = [];
  private chips: Phaser.GameObjects.Container[] = [];
  private state: State = 'ready';
  private health = MAX_HEALTH;
  private score = 0;
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

  constructor() { super('GameScene'); }

  create(): void {
    // Scene.restart сохраняет экземпляр сцены: сбрасываем весь игровой раунд.
    this.zombies = []; this.rockets = []; this.chips = [];
    this.state = 'ready'; this.health = MAX_HEALTH;
    this.score = 0; this.kills = 0; this.elapsed = 0;
    this.spawnIn = 0.6; this.reload = 0; this.invulnerable = 0;
    this.level = 1; this.experience = 0; this.nextLevelXp = FIRST_LEVEL_XP;
    this.bazookaLevel = 1;
    this.shotCooldown = SHOT_COOLDOWN; this.blastRadius = BLAST_RADIUS; this.salvoRockets = 1;
    this.drawArena();
    this.createPlayer();
    this.createHud();
    this.createControls();
    this.showOverlay('ЗОМБИ, ЧИПСЫ, БАЗУКИ',
      'Переживи 90 секунд и прокачай базуку.\n\nWASD / стрелки или зажатая ЛКМ — движение\nБазука сама целится и стреляет.\nЧипсы притягиваются, когда ты подходишь.\n\nЧипсы = опыт + здоровье.\nНовый уровень — выбери оружие для прокачки.', 'ПОГНАЛИ  /  ENTER');
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
    if (Phaser.Input.Keyboard.JustDown(this.keys.start)) {
      if (this.state === 'ready') this.startRound();
      else if (this.state === 'paused') this.togglePause();
      else if (this.state === 'ended') { this.scene.restart(); return; }
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.pause) || Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.togglePause();
    }
    if (this.state === 'upgrading') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.upgrade1)) this.chooseUpgrade();
      return;
    }
    if (this.state !== 'playing') return;

    // Ограничение шага не даёт объектам перескочить друг через друга при лаге.
    const seconds = Math.min(delta / 1000, 0.05);
    this.elapsed += seconds;
    this.reload = Math.max(0, this.reload - seconds);
    this.invulnerable = Math.max(0, this.invulnerable - seconds);
    this.movePlayer(seconds);
    this.aimAndShoot();
    this.spawnIn -= seconds;
    if (this.spawnIn <= 0) {
      this.spawnZombie();
      this.spawnIn = Phaser.Math.Linear(SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, this.elapsed / ROUND_SECONDS);
    }
    this.moveZombies(seconds);
    if (this.state !== 'playing') return;
    this.moveRockets(seconds);
    this.collectChips(seconds);
    this.player.alpha = this.invulnerable > 0 ? 0.55 + Math.sin(this.elapsed * 35) * 0.25 : 1;
    this.updateHud();
    if (this.elapsed >= ROUND_SECONDS) this.endRound(true);
  }

  private drawArena(): void {
    this.add.text(28, 20, 'ЗОМБИ, ЧИПСЫ, БАЗУКИ', {
      fontFamily: 'system-ui, sans-serif', fontSize: '27px', fontStyle: 'bold', color: COLORS.cream,
    });
    this.add.text(930, 28, 'ПРОТОТИП / 01', {
      fontFamily: 'monospace', fontSize: '13px', color: COLORS.yellow,
    }).setOrigin(1, 0);
    const g = this.add.graphics();
    g.fillStyle(0x21352d).fillRoundedRect(ARENA.left, ARENA.top, 904, 424, 12);
    g.lineStyle(1, 0x2b4237);
    for (let x = 52; x < ARENA.right; x += 40) g.lineBetween(x, ARENA.top, x, ARENA.bottom);
    for (let y = 154; y < ARENA.bottom; y += 40) g.lineBetween(ARENA.left, y, ARENA.right, y);
    g.lineStyle(2, 0x4b6652).strokeRoundedRect(ARENA.left, ARENA.top, 904, 424, 12);
    this.add.text(28, 576, 'WASD / стрелки / зажатая ЛКМ — движение     БАЗУКА стреляет сама', {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: COLORS.cream,
    });
    this.add.text(28, 608, 'Подбирай чипсы, получай уровни, улучшай базуку.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: COLORS.muted,
    });
    this.add.text(930, 608, 'P / ESC  пауза   ·   R  заново', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: COLORS.muted,
    }).setOrigin(1, 0);
  }

  private createPlayer(): void {
    this.player = this.add.container(480, 342, [
      this.add.ellipse(0, 14, 38, 14, 0x101f18, 0.5),
      this.add.circle(0, 0, PLAYER_RADIUS, 0xf3edda).setStrokeStyle(3, 0x15271e),
      this.add.rectangle(0, 10, 25, 12, 0xda8b50),
      this.add.rectangle(-5, -3, 4, 4, 0x21352d),
      this.add.rectangle(5, -3, 4, 4, 0x21352d),
    ]).setDepth(3);
    this.bazooka = this.add.container(0, 4, [
      this.add.rectangle(19, 0, 32, 12, 0x728e66).setStrokeStyle(2, 0x15271e),
      this.add.rectangle(34, 0, 7, 16, 0xbed0a3),
    ]);
    this.player.add(this.bazooka);
  }

  private createHud(): void {
    this.hud = this.add.text(28, 66, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '19px', color: COLORS.cream,
    });
    this.healthBar = this.add.graphics();
    this.reloadBar = this.add.graphics();
    this.levelText = this.add.text(28, 103, '', {
      fontFamily: 'monospace', fontSize: '14px', color: COLORS.yellow,
    });
    this.add.text(735, 65, 'ЗДОРОВЬЕ', { fontFamily: 'monospace', fontSize: '12px', color: COLORS.muted });
    this.add.text(735, 105, 'БАЗУКА', { fontFamily: 'monospace', fontSize: '12px', color: COLORS.muted });
    this.updateHud();
  }

  private createControls(): void {
    if (!this.input.keyboard) throw new Error('Keyboard input is unavailable.');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D', start: 'ENTER',
      restart: 'R', pause: 'P', escape: 'ESC',
      upgrade1: 'ONE',
    }) as Keys;
    this.input.keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.input.mouse?.disableContextMenu();
  }

  private startRound(): void {
    this.overlay.destroy();
    this.state = 'playing';
    this.input.keyboard?.resetKeys();
  }

  private movePlayer(seconds: number): void {
    let dx = Number(this.keys.right.isDown || this.cursors.right.isDown) - Number(this.keys.left.isDown || this.cursors.left.isDown);
    let dy = Number(this.keys.down.isDown || this.cursors.down.isDown) - Number(this.keys.up.isDown || this.cursors.up.isDown);
    let step = PLAYER_SPEED * seconds;
    if (dx === 0 && dy === 0) {
      const pointer = this.input.activePointer;
      if (!pointer.leftButtonDown() || pointer.x < ARENA.left || pointer.x > ARENA.right
        || pointer.y < ARENA.top || pointer.y > ARENA.bottom) return;
      dx = pointer.x - this.player.x;
      dy = pointer.y - this.player.y;
      // Останавливаемся у указателя, не перескакивая через него.
      step = Math.min(step, Math.hypot(dx, dy));
    }
    const length = Math.hypot(dx, dy) || 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx / length * step,
      ARENA.left + PLAYER_RADIUS, ARENA.right - PLAYER_RADIUS);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy / length * step,
      ARENA.top + PLAYER_RADIUS, ARENA.bottom - PLAYER_RADIUS);
  }

  private aimAndShoot(): void {
    const nearest = this.zombies.reduce<Zombie | undefined>((best, zombie) =>
      !best || this.distance(zombie.body, this.player) < this.distance(best.body, this.player) ? zombie : best, undefined);
    if (!nearest) return;
    const angle = Math.atan2(nearest.body.y - this.player.y, nearest.body.x - this.player.x);
    this.bazooka.rotation = angle;
    if (this.reload > 0) return;
    for (let i = 0; i < this.salvoRockets; i += 1) {
      this.fireRocket(angle + (i - (this.salvoRockets - 1) / 2) * SALVO_SPREAD);
    }
    this.reload = this.shotCooldown;
  }

  private fireRocket(angle: number): void {
    const body = this.add.container(this.player.x + Math.cos(angle) * 35, this.player.y + Math.sin(angle) * 35, [
      this.add.triangle(-11, 0, 0, -4, 0, 4, -15, 0, 0xffa65c),
      this.add.rectangle(0, 0, 17, 7, 0xf3edda),
      this.add.triangle(10, 0, 0, -5, 0, 5, 9, 0, 0xffd36a),
    ]).setRotation(angle).setDepth(4);
    this.rockets.push({ body, vx: Math.cos(angle) * ROCKET_SPEED, vy: Math.sin(angle) * ROCKET_SPEED, life: ROCKET_LIFETIME });
  }

  private spawnZombie(): void {
    if (this.zombies.length >= MAX_ZOMBIES) return;
    let x = Phaser.Math.Between(ARENA.left, ARENA.right);
    let y = Phaser.Math.Between(ARENA.top, ARENA.bottom);
    switch (Phaser.Math.Between(0, 3)) {
      case 0: x = ARENA.left - ZOMBIE_RADIUS; break;
      case 1: x = ARENA.right + ZOMBIE_RADIUS; break;
      case 2: y = ARENA.top - ZOMBIE_RADIUS; break;
      case 3: y = ARENA.bottom + ZOMBIE_RADIUS; break;
    }
    // Зомби появляются за границей арены, а не под ногами игрока.
    const body = this.add.container(x, y, [
      this.add.ellipse(0, 13, 34, 12, 0x101f18, 0.4),
      this.add.rectangle(0, 8, 25, 19, 0x647968),
      this.add.circle(0, -4, ZOMBIE_RADIUS - 3, 0x95b879).setStrokeStyle(2, 0x15271e),
      this.add.rectangle(-5, -5, 4, 4, 0x17261d),
      this.add.rectangle(5, -5, 4, 4, 0x17261d),
      this.add.rectangle(2, 3, 8, 3, 0x17261d),
    ]).setDepth(2);
    this.zombies.push({ body, speed: ZOMBIE_SPEED + this.elapsed / ROUND_SECONDS * ZOMBIE_SPEED_GAIN });
  }

  private moveZombies(seconds: number): void {
    for (const zombie of this.zombies) {
      const angle = Math.atan2(this.player.y - zombie.body.y, this.player.x - zombie.body.x);
      zombie.body.x += Math.cos(angle) * zombie.speed * seconds;
      zombie.body.y += Math.sin(angle) * zombie.speed * seconds;
      if (this.invulnerable > 0 || this.distance(zombie.body, this.player) > PLAYER_RADIUS + ZOMBIE_RADIUS) continue;
      this.health -= 1;
      this.invulnerable = HURT_COOLDOWN;
      this.cameras.main.shake(100, 0.004);
      this.floatText(this.player.x, this.player.y - 35, '−1 здоровье', '#ff987d');
      if (this.health <= 0) { this.endRound(false); return; }
    }
  }

  private moveRockets(seconds: number): void {
    for (let i = this.rockets.length - 1; i >= 0; i -= 1) {
      const rocket = this.rockets[i];
      rocket.body.x += rocket.vx * seconds;
      rocket.body.y += rocket.vy * seconds;
      rocket.life -= seconds;
      const hit = this.zombies.some(zombie => this.distance(zombie.body, rocket.body) < ZOMBIE_RADIUS + 9);
      const outside = rocket.body.x < ARENA.left || rocket.body.x > ARENA.right || rocket.body.y < ARENA.top || rocket.body.y > ARENA.bottom;
      if (!hit && !outside && rocket.life > 0) continue;
      this.explode(rocket.body.x, rocket.body.y);
      rocket.body.destroy();
      this.rockets.splice(i, 1);
    }
  }

  private explode(x: number, y: number): void {
    const flash = this.add.circle(x, y, this.blastRadius, 0xffd36a, 0.2).setStrokeStyle(3, 0xffb15c).setDepth(4);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.18, duration: 230, onComplete: () => flash.destroy() });
    for (let i = this.zombies.length - 1; i >= 0; i -= 1) {
      const zombie = this.zombies[i];
      if (Phaser.Math.Distance.Between(x, y, zombie.body.x, zombie.body.y) > this.blastRadius + ZOMBIE_RADIUS) continue;
      this.dropChips(zombie.body.x, zombie.body.y);
      zombie.body.destroy();
      this.zombies.splice(i, 1);
      this.kills += 1;
    }
  }

  private dropChips(x: number, y: number): void {
    if (this.chips.length >= MAX_CHIPS) this.chips.shift()?.destroy();
    // Добыча всегда остаётся внутри доступного поля, даже при взрыве у края.
    x = Phaser.Math.Clamp(x, ARENA.left + 16, ARENA.right - 16);
    y = Phaser.Math.Clamp(y, ARENA.top + 16, ARENA.bottom - 16);
    this.chips.push(this.add.container(x, y, [
      this.add.rectangle(0, 0, 20, 25, 0xffd36a).setStrokeStyle(2, 0x71562a),
      this.add.rectangle(0, -8, 18, 4, 0xe88e46),
      this.add.ellipse(0, 2, 11, 8, 0xffefb4).setRotation(-0.4),
    ]).setDepth(1));
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
      this.experience += 1;
      this.chips[i].destroy(); this.chips.splice(i, 1);
      this.floatText(this.player.x, this.player.y - 30, healed ? '+1 опыт · +1 здоровье' : '+1 опыт', COLORS.yellow);
      if (this.experience >= this.nextLevelXp && this.elapsed < ROUND_SECONDS) {
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

  private chooseUpgrade(): void {
    if (this.state !== 'upgrading') return;
    this.bazookaLevel += 1;
    const stats = this.bazookaStats(this.bazookaLevel);
    this.shotCooldown = stats.shotCooldown;
    this.blastRadius = stats.blastRadius;
    this.salvoRockets = stats.salvoRockets;
    this.reload = Math.min(this.reload, this.shotCooldown);
    this.overlay.destroy();
    this.state = 'playing';
    this.tweens.resumeAll();
    this.input.keyboard?.resetKeys();
    this.updateHud();
  }

  private showUpgradeChoices(): void {
    this.state = 'upgrading';
    this.tweens.pauseAll();
    const shade = this.add.rectangle(480, 320, 960, 640, 0x0e1d17, 0.92).setInteractive();
    const heading = this.add.text(480, 155, `УРОВЕНЬ ${this.level} — ВЫБЕРИ ОРУЖИЕ`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: COLORS.yellow,
    }).setOrigin(0.5);
    const hint = this.add.text(480, 201, 'Повысь уровень оружия. Сейчас доступна только базука.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: COLORS.cream,
    }).setOrigin(0.5);
    this.overlay = this.add.container(0, 0, [shade, heading, hint]).setDepth(10);
    const next = this.bazookaStats(this.bazookaLevel + 1);
    for (let index = 0; index < 3; index += 1) {
      const x = 200 + index * 280;
      const available = index === 0;
      const card = this.add.rectangle(x, 354, 250, 230, 0x253c30)
        .setStrokeStyle(2, available ? 0xffd36a : 0x57704e);
      if (available) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setFillStyle(0x36523c));
        card.on('pointerout', () => card.setFillStyle(0x253c30));
        card.on('pointerup', () => this.chooseUpgrade());
      }
      const title = this.add.text(x, 266, available ? 'БАЗУКА' : '—', {
        fontFamily: 'system-ui, sans-serif', fontSize: '21px', fontStyle: 'bold', color: COLORS.yellow,
      }).setOrigin(0.5);
      const description = this.add.text(x, 305, available
        ? `Уровень ${this.bazookaLevel} → ${this.bazookaLevel + 1}\nПерезарядка: ${this.shotCooldown.toFixed(2)} → ${next.shotCooldown.toFixed(2)} с\nРадиус: ${this.blastRadius} → ${next.blastRadius}\nРакет: ${this.salvoRockets} → ${next.salvoRockets}`
        : 'Нет другого оружия', {
        fontFamily: 'system-ui, sans-serif', fontSize: '17px', color: COLORS.cream,
        align: 'center', lineSpacing: 8, wordWrap: { width: 225 },
      }).setOrigin(0.5, 0);
      const keyHint = this.add.text(x, 444, available ? '[ 1 ]  ПРОКАЧАТЬ' : 'ПУСТО', {
        fontFamily: 'monospace', fontSize: '17px', color: available ? COLORS.yellow : COLORS.muted,
      }).setOrigin(0.5);
      this.overlay.add([card, title, description, keyHint]);
    }
  }

  private updateHud(): void {
    const remaining = Math.max(0, Math.ceil(ROUND_SECONDS - this.elapsed));
    this.hud.setText(`ЧИПСЫ  ${this.score}     ЗОМБИ  ${this.kills}     ОСТАЛОСЬ  ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`);
    this.levelText.setText(`УРОВЕНЬ ${this.level}   ·   ОПЫТ ${this.experience} / ${this.nextLevelXp}   ·   БАЗУКА УР. ${this.bazookaLevel}`);
    this.healthBar.clear();
    for (let i = 0; i < MAX_HEALTH; i += 1) {
      this.healthBar.fillStyle(i < this.health ? 0x95b879 : 0x31473b).fillRoundedRect(735 + i * 39, 84, 31, 12, 3);
    }
    this.reloadBar.clear().fillStyle(0x31473b).fillRect(805, 108, 118, 5);
    this.reloadBar.fillStyle(0xffd36a).fillRect(805, 108, 118 * Phaser.Math.Clamp(1 - this.reload / this.shotCooldown, 0, 1), 5);
  }

  private floatText(x: number, y: number, label: string, color: string): void {
    const text = this.add.text(x, y, label, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color,
      stroke: '#15271e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(5);
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

  private endRound(won: boolean): void {
    this.state = 'ended'; this.updateHud();
    this.showOverlay(won ? 'ПЕРЕКУС УДАЛСЯ!' : 'ЗОМБИ ДОБРАЛИСЬ ДО ТЕБЯ',
      `${won ? 'Ты пережил 90 секунд.' : `Ты продержался ${Math.floor(this.elapsed)} сек.`}\n\nСъедено чипсов: ${this.score}     Побеждено зомби: ${this.kills}\n\nЕщё один забег? R / Enter — заново.`, 'ЕЩЁ РАЗ');
  }

  private showOverlay(title: string, message: string, buttonLabel: string): void {
    const shade = this.add.rectangle(480, 320, 960, 640, 0x0e1d17, 0.88).setInteractive();
    const panel = this.add.rectangle(480, 320, 700, 414, 0x1b2e25).setStrokeStyle(2, 0x57704e);
    const heading = this.add.text(480, 156, title, {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: COLORS.yellow,
    }).setOrigin(0.5);
    const body = this.add.text(480, 205, message, {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: COLORS.cream, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0);
    const button = this.add.rectangle(480, 475, 340, 54, 0xffd36a).setInteractive({ useHandCursor: true });
    const label = this.add.text(480, 475, buttonLabel, {
      fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#1b2e25',
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setFillStyle(0xffe6a5));
    button.on('pointerout', () => button.setFillStyle(0xffd36a));
    button.on('pointerup', () => {
      if (this.state === 'ready') this.startRound();
      else if (this.state === 'paused') this.togglePause();
      else if (this.state === 'ended') this.scene.restart();
    });
    this.overlay = this.add.container(0, 0, [shade, panel, heading, body, button, label]).setDepth(10);
  }

  private distance(a: Phaser.GameObjects.Container, b: Phaser.GameObjects.Container): number {
    return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
  }
}
