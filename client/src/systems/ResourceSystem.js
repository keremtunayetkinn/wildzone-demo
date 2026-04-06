// wildzone/client/src/systems/ResourceSystem.js
import { RESOURCES } from '../constants/resources.js';

export default class ResourceSystem {
  constructor() {
    this.wood  = 0;
    this.stone = 0;
    this.metal = 0;
  }

  add(type, amount) {
    if (!(type in RESOURCES)) return;
    const max = RESOURCES[type].max;
    this[type] = Math.min(this[type] + amount, max);
  }

  spend(type, amount) {
    if (!this.canAfford(type, amount)) return false;
    this[type] -= amount;
    return true;
  }

  canAfford(type, amount) {
    return (this[type] ?? 0) >= amount;
  }

  getAll() {
    return { wood: this.wood, stone: this.stone, metal: this.metal };
  }

  serialize() {
    return { wood: this.wood, stone: this.stone, metal: this.metal };
  }

  static deserialize(data) {
    const rs = new ResourceSystem();
    rs.wood  = data.wood  ?? 0;
    rs.stone = data.stone ?? 0;
    rs.metal = data.metal ?? 0;
    return rs;
  }
}
