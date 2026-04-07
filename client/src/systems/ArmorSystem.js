// wildzone/client/src/systems/ArmorSystem.js
import { ARMOR_TYPES } from '../constants/armor.js';

export default class ArmorSystem {
  constructor() {
    this.currentArmor = null; // null or { ...armorData, durability: N }
  }

  equipArmor(armorId) {
    const armorData = ARMOR_TYPES[armorId];
    if (!armorData) return false;

    if (!this.currentArmor) {
      this._setArmor(armorData);
      return true;
    }

    // Any armor can replace any other armor (old one is dropped)
    const old = this.currentArmor;
    this._setArmor(armorData);
    return old; // return replaced armor info for dropping
  }

  _setArmor(armorData) {
    this.currentArmor = {
      ...armorData,
      durability: armorData.maxDurability
    };
  }

  // Returns net damage to HP after armor absorbs. isMelee bypasses armor.
  applyDamage(rawDamage, isMelee = false) {
    if (!this.currentArmor || isMelee) {
      return rawDamage;
    }

    this.currentArmor.durability -= rawDamage;
    if (this.currentArmor.durability <= 0) {
      // Zırh kırıldı, taşan hasar cana gider
      const overflow = -this.currentArmor.durability;
      this.currentArmor = null;
      return Math.max(0, overflow);
    }

    // Zırh hasarı tamamen emdi
    return 0;
  }

  getDurabilityPercent() {
    if (!this.currentArmor) return 0;
    return this.currentArmor.durability / this.currentArmor.maxDurability;
  }

  getDurability() {
    if (!this.currentArmor) return 0;
    return Math.ceil(this.currentArmor.durability);
  }

  getMaxDurability() {
    if (!this.currentArmor) return 0;
    return this.currentArmor.maxDurability;
  }

  isEquipped() {
    return this.currentArmor !== null;
  }

  getArmorLevel() {
    return this.currentArmor ? this.currentArmor.level : 0;
  }

  getArmorColor() {
    return this.currentArmor ? this.currentArmor.color : null;
  }

  getArmorName() {
    return this.currentArmor ? this.currentArmor.name : null;
  }

}
