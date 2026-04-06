import CONSTANTS from '../constants.js';

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
    this.selectedChar = 0;
    this.selectedAccessory = null; // null = no accessory
    this.username = '';
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    this.add.tileSprite(0, 0, W, H, 'lobby_bg').setOrigin(0, 0);

    // Title
    this.add.text(W / 2, 50, '🌲 W I L D Z O N E 🌲', {
      fontSize: '36px', fill: '#7fff7f', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    this._buildPreview(W, H);
    this._buildCharacterSelect(W, H);
    this._buildAccessorySelect(W, H);
    this._buildUsernameInput(W, H);
    this._buildPlayButton(W, H);
  }

  _buildCharacterSelect(W, H) {
    this.add.text(W * 0.25, 110, 'KARAKTER SEÇ', {
      fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.charFrames = [];
    const startX = W * 0.1;
    const charColors = [0x4a90d9, 0xe74c3c, 0x2ecc71, 0xf39c12];

    for (let i = 0; i < 4; i++) {
      const x = startX + i * 80;
      const y = 160;

      const frame = this.add.rectangle(x, y, 64, 64, 0x333333).setInteractive();
      this.charFrames.push(frame);

      this.add.rectangle(x, y, 48, 48, charColors[i]);
      this.add.text(x, y + 40, `${i + 1}`, {
        fontSize: '12px', fill: '#aaaaaa', fontFamily: 'monospace'
      }).setOrigin(0.5);

      frame.on('pointerdown', () => this._selectChar(i));
      frame.on('pointerover', () => { if (this.selectedChar !== i) frame.setFillStyle(0x555555); });
      frame.on('pointerout', () => { if (this.selectedChar !== i) frame.setFillStyle(0x333333); });
    }

    this._selectChar(0);
  }

  _selectChar(index) {
    this.selectedChar = index;
    this.charFrames.forEach((f, i) => {
      f.setFillStyle(i === index ? 0x1a6b1a : 0x333333);
      f.setStrokeStyle(i === index ? 2 : 0, 0x7fff7f);
    });
    this._updatePreview();
  }

  _buildAccessorySelect(W, H) {
    this.add.text(W * 0.72, 110, 'AKSESUAR SEÇ', {
      fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const accessories = ['hat_1', 'hat_2', 'hat_3', 'mask_1', 'mask_2', 'cape_1', 'cape_2', null];
    const labels = ['Şapka 1', 'Şapka 2', 'Şapka 3', 'Maske 1', 'Maske 2', 'Pelerin 1', 'Pelerin 2', 'Yok'];
    this.accButtons = [];

    const cols = 2;
    const startX = W * 0.6;
    const startY = 140;

    accessories.forEach((acc, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * 120;
      const y = startY + row * 44;

      const btn = this.add.rectangle(x, y, 110, 36, 0x333333).setInteractive();
      const lbl = this.add.text(x, y, labels[i], {
        fontSize: '13px', fill: '#cccccc', fontFamily: 'monospace'
      }).setOrigin(0.5);

      this.accButtons.push({ btn, acc });

      btn.on('pointerdown', () => this._selectAccessory(acc));
      btn.on('pointerover', () => { if (this.selectedAccessory !== acc) btn.setFillStyle(0x555555); });
      btn.on('pointerout', () => { if (this.selectedAccessory !== acc) btn.setFillStyle(0x333333); });
    });

    this._selectAccessory(null);
  }

  _selectAccessory(acc) {
    this.selectedAccessory = acc;
    this.accButtons.forEach(({ btn, acc: a }) => {
      btn.setFillStyle(a === acc ? 0x1a6b1a : 0x333333);
      btn.setStrokeStyle(a === acc ? 2 : 0, 0x7fff7f);
    });
    this._updatePreview();
  }

  _buildPreview(W, H) {
    this.add.text(W * 0.45, 110, 'ÖNİZLEME', {
      fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    const px = W * 0.45;
    const py = 200;
    this.add.rectangle(px, py, 100, 120, 0x111111).setStrokeStyle(1, 0x444444);

    this.previewContainer = this.add.container(px, py);
    this.previewCharSprite = this.add.image(0, 0, 'char_1').setDisplaySize(48, 48);
    this.previewAccSprite = this.add.image(0, -20, 'hat_1').setDisplaySize(32, 32).setVisible(false);
    this.previewContainer.add([this.previewCharSprite, this.previewAccSprite]);
  }

  _updatePreview() {
    const charKey = CONSTANTS.CHARACTERS[this.selectedChar];
    this.previewCharSprite.setTexture(charKey);

    if (this.selectedAccessory) {
      this.previewAccSprite.setTexture(this.selectedAccessory).setVisible(true);
    } else {
      this.previewAccSprite.setVisible(false);
    }
  }

  _buildUsernameInput(W, H) {
    this.add.text(W / 2, 310, 'Kullanıcı Adı:', {
      fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    // DOM input element for username
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.placeholder = 'Adınızı girin...';
    input.style.cssText = `
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: ${H * 0.57}px;
      width: 200px;
      padding: 8px 12px;
      background: #1a1a1a;
      border: 1px solid #4caf50;
      color: #ffffff;
      font-family: monospace;
      font-size: 14px;
      border-radius: 4px;
      outline: none;
      z-index: 10;
    `;
    document.body.appendChild(input);
    this.usernameInput = input;

    input.addEventListener('input', () => {
      // Only allow alphanumeric + underscore
      input.value = input.value.replace(/[^a-zA-Z0-9_]/g, '');
      this.username = input.value;
    });

    // Clean up on scene shutdown
    this.events.on('shutdown', () => {
      if (input.parentNode) input.parentNode.removeChild(input);
    });
    this.events.on('destroy', () => {
      if (input.parentNode) input.parentNode.removeChild(input);
    });
  }

  _buildPlayButton(W, H) {
    const btn = this.add.rectangle(W / 2, H - 80, 180, 50, 0x1a6b1a)
      .setStrokeStyle(2, 0x7fff7f)
      .setInteractive();

    this.add.text(W / 2, H - 80, 'OYUNA GİR', {
      fontSize: '20px', fill: '#7fff7f', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x2d8f2d));
    btn.on('pointerout', () => btn.setFillStyle(0x1a6b1a));
    btn.on('pointerdown', () => this._startGame());
  }

  _startGame() {
    const username = (this.username || 'Player').trim() || 'Player';
    this.scene.start('GameScene', {
      username,
      character: CONSTANTS.CHARACTERS[this.selectedChar],
      accessory: this.selectedAccessory
    });
    this.scene.launch('HUDScene');
  }
}
