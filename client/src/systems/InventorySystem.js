// wildzone/client/src/systems/InventorySystem.js
import { WEAPONS } from '../constants/weapons.js';
import { AMMO_TYPES } from '../constants/ammo.js';

export default class InventorySystem {
  constructor() {
    // Slot 0-1: ateşli/utility, Slot 2: sadece yakın dövüş (varsayılan: yumruk)
    this.weapons = [null, null, null];
    this.activeSlot = 2;

    // Ammo per type in inventory (outside magazine)
    this.ammo = {};
    Object.keys(AMMO_TYPES).forEach(type => {
      this.ammo[type] = 0;
    });

    // Ammo currently loaded in each weapon slot's magazine
    this.magazineAmmo = { 0: 0, 1: 0, 2: 0 };
  }

  // --- Weapon management ---

  getActiveWeaponId() {
    return this.weapons[this.activeSlot]; // null = fist
  }

  getActiveWeaponData() {
    const id = this.getActiveWeaponId();
    return id ? WEAPONS[id] : WEAPONS.fist;
  }

  getWeaponData(weaponId) {
    return WEAPONS[weaponId] || null;
  }

  addWeapon(weaponId, preloadedMag = null) {
    const data = WEAPONS[weaponId];
    if (!data) return false;

    if (data.type === 'melee') {
      // Yakın dövüş silahı → sadece slot 2
      if (this.weapons[2] !== null) return false;
      this.weapons[2] = weaponId;
      return 2;
    }

    // Ateşli / utility → slot 0 veya 1 (slot 2'ye giremez)
    for (let i = 0; i <= 1; i++) {
      if (this.weapons[i] === null) {
        this.weapons[i] = weaponId;
        if (data.magazineSize) {
          this.magazineAmmo[i] = preloadedMag !== null ? preloadedMag : data.magazineSize;
        }
        return i;
      }
    }
    return false;
  }

  removeWeapon(slot) {
    this.weapons[slot] = null;
    this.magazineAmmo[slot] = 0;
  }

  switchWeapon() {
    // Q sadece slot 0 ve 1 arasında geçiş yapar (slot 2 = F tuşuna özel)
    if (this.activeSlot === 0) {
      if (this.weapons[1] !== null) { this.activeSlot = 1; return true; }
    } else if (this.activeSlot === 1) {
      if (this.weapons[0] !== null) { this.activeSlot = 0; return true; }
    } else {
      // Slot 2'deyken Q basılırsa slot 0'a veya 1'e geç
      if (this.weapons[0] !== null) { this.activeSlot = 0; return true; }
      if (this.weapons[1] !== null) { this.activeSlot = 1; return true; }
    }
    return false;
  }

  setActiveSlot(slot) {
    if (slot === 2) { // Yakın dövüş slotu her zaman erişilebilir (yumruk fallback)
      this.activeSlot = 2;
      return true;
    }
    if (slot >= 0 && slot <= 1 && this.weapons[slot] !== null) {
      this.activeSlot = slot;
      return true;
    }
    return false;
  }

  hasBushCamo() {
    return this.weapons[0] === 'bush' || this.weapons[1] === 'bush';
  }

  // --- Ammo management ---

  addAmmo(ammoType, quantity) {
    if (!(ammoType in this.ammo)) return;
    const maxAmmo = this._getMaxAmmoForType(ammoType);
    this.ammo[ammoType] = Math.min(this.ammo[ammoType] + quantity, maxAmmo);
  }

  getMagazineAmmo() {
    return this.magazineAmmo[this.activeSlot] || 0;
  }

  getInventoryAmmo() {
    const weapon = this.getActiveWeaponData();
    if (!weapon.ammoType) return 0;
    return this.ammo[weapon.ammoType] || 0;
  }

  useAmmo() {
    if (this.magazineAmmo[this.activeSlot] <= 0) return false;
    this.magazineAmmo[this.activeSlot]--;
    return true;
  }

  canReload() {
    const weapon = this.getActiveWeaponData();
    if (!weapon.ammoType) return false;
    const inMag = this.magazineAmmo[this.activeSlot] || 0;
    const inInv = this.ammo[weapon.ammoType] || 0;
    return inInv > 0 && inMag < weapon.magazineSize;
  }

  // Returns how many bullets were added
  reload() {
    const weapon = this.getActiveWeaponData();
    if (!weapon.ammoType) return 0;
    const slot = this.activeSlot;
    const current = this.magazineAmmo[slot] || 0;
    const needed = weapon.magazineSize - current;
    const available = this.ammo[weapon.ammoType] || 0;
    const toAdd = Math.min(needed, available);
    this.magazineAmmo[slot] = current + toAdd;
    this.ammo[weapon.ammoType] -= toAdd;
    return toAdd;
  }

  // Add single shell (for shotgun shell-by-shell reload)
  reloadOneShell() {
    const weapon = this.getActiveWeaponData();
    if (!weapon.ammoType) return false;
    const slot = this.activeSlot;
    if ((this.magazineAmmo[slot] || 0) >= weapon.magazineSize) return false;
    if ((this.ammo[weapon.ammoType] || 0) <= 0) return false;
    this.magazineAmmo[slot]++;
    this.ammo[weapon.ammoType]--;
    return true;
  }

  _getMaxAmmoForType(ammoType) {
    for (const [, weapon] of Object.entries(WEAPONS)) {
      if (weapon.ammoType === ammoType && weapon.maxAmmo) {
        return weapon.maxAmmo;
      }
    }
    return 999;
  }
}
