// wildzone/client/src/systems/InputSystem.js

export default class InputSystem {
  constructor(scene) {
    this.scene = scene;
    this.keys = scene.input.keyboard.addKeys({
      up:         Phaser.Input.Keyboard.KeyCodes.W,
      down:       Phaser.Input.Keyboard.KeyCodes.S,
      left:       Phaser.Input.Keyboard.KeyCodes.A,
      right:      Phaser.Input.Keyboard.KeyCodes.D,
      upArrow:    Phaser.Input.Keyboard.KeyCodes.UP,
      downArrow:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArrow:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      switchQ:    Phaser.Input.Keyboard.KeyCodes.Q,
      meleeSlt:   Phaser.Input.Keyboard.KeyCodes.G,   // G = melee slot (eski F)
      barricade:  Phaser.Input.Keyboard.KeyCodes.F,   // F = barikat inşaat modu
      sprint:     Phaser.Input.Keyboard.KeyCodes.SHIFT,
      drop:       Phaser.Input.Keyboard.KeyCodes.X,
      reload:     Phaser.Input.Keyboard.KeyCodes.R,
      interact:   Phaser.Input.Keyboard.KeyCodes.E
    });
  }

  getMovementVector() {
    const k = this.keys;
    const isUp    = k.up.isDown    || k.upArrow.isDown;
    const isDown  = k.down.isDown  || k.downArrow.isDown;
    const isLeft  = k.left.isDown  || k.leftArrow.isDown;
    const isRight = k.right.isDown || k.rightArrow.isDown;

    let vx = 0;
    let vy = 0;

    if (isUp)    vy -= 1;
    if (isDown)  vy += 1;
    if (isLeft)  vx -= 1;
    if (isRight) vx += 1;

    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) { vx /= len; vy /= len; }

    return { vx, vy };
  }

  getAimAngle(playerX, playerY, camera) {
    const pointer = this.scene.input.activePointer;
    return Phaser.Math.Angle.Between(
      playerX, playerY,
      pointer.x + camera.scrollX,
      pointer.y + camera.scrollY
    );
  }

  // Left mouse button for normal fire
  isFireDown() {
    return this.scene.input.activePointer.leftButtonDown();
  }

  // Right mouse button for zoom (sniper)
  isZoomJustDown() {
    return this.scene.input.activePointer.rightButtonDown();
  }

  // Weapon switch (Q = cycle slots)
  isSwitchJustDown() {
    return Phaser.Input.Keyboard.JustDown(this.keys.switchQ);
  }

  // Direct melee slot (G — eski F'den taşındı)
  isMeleeJustDown() {
    return Phaser.Input.Keyboard.JustDown(this.keys.meleeSlt);
  }

  // Barikat inşaat modu toggle (F — bir kez bas)
  isBarricadeToggleJustDown() {
    return Phaser.Input.Keyboard.JustDown(this.keys.barricade);
  }

  isSprintDown() {
    return this.keys.sprint.isDown;
  }

  isDropJustDown() {
    return Phaser.Input.Keyboard.JustDown(this.keys.drop);
  }

  isReloadJustDown() {
    return Phaser.Input.Keyboard.JustDown(this.keys.reload);
  }

  isInteractJustDown() {
    return Phaser.Input.Keyboard.JustDown(this.keys.interact);
  }

  isMoving() {
    const k = this.keys;
    return k.up.isDown || k.down.isDown || k.left.isDown || k.right.isDown ||
           k.upArrow.isDown || k.downArrow.isDown || k.leftArrow.isDown || k.rightArrow.isDown;
  }
}
