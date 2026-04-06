# 🌲 WildZone — 2D Browser Battle Royale

> Tarayıcıda çalışan, Phaser 3 ile yapılmış çok oyunculu bir battle royale demodur.  
> A multiplayer battle royale demo built with Phaser 3, running entirely in the browser.

> Kurulum gerektirmez — linke gir, karakter seç, oyna.  
> No installation required — open the link, pick a character, play.

**🎮 [Live Demo → wildzone-demo.onrender.com](https://wildzone-demo.onrender.com)**

> ⚠️ **TR:** Demo Render.com ücretsiz planında çalışmaktadır. 15 dakika pasiflikten sonra sunucu uyku moduna girer; ilk açılış **~30 saniye** sürebilir.  
> ⚠️ **EN:** Hosted on Render.com free tier. The server sleeps after 15 minutes of inactivity; first load may take **~30 seconds**.

> 🖥️ **TR:** Bu demo yalnızca **bilgisayar** (PC/Mac) için tasarlanmıştır. Mobil cihazlarda düzgün çalışmaz.  
> 🖥️ **EN:** This demo is designed for **desktop/laptop only**. Mobile devices are not supported.

---

## Ekran Görüntüleri / Screenshots

> *(Ekran görüntüleri eklenecek / Screenshots coming soon)*

---

## Özellikler / Features

| 🇹🇷 Türkçe | 🇬🇧 English |
|-----------|------------|
| 🌐 Tarayıcı tabanlı — kurulum yok | Browser-based — no installation |
| 👥 Aynı anda 40 oyuncuya kadar destek | Up to 40 simultaneous players via Socket.io |
| 🤖 Singleplayer demo — 2 test botu otomatik spawn olur | Singleplayer demo — 2 test bots spawn automatically |
| 🗺️ 3000×3000 piksel açık dünya haritası | 3000×3000 px open-world map |
| 💥 10 farklı silah, 3 zırh tipi, 4 karakter, 7 aksesuar | 10 weapons, 3 armor types, 4 characters, 7 accessories |
| 🏗️ Barikat inşaat sistemi (3 malzeme türü) | Barricade building system (3 material types) |
| 🎯 Sunucu taraflı hile önleme | Server-side anti-cheat |

---

## Nasıl Oynanır / How to Play

### Lobi / Lobby

🇹🇷
1. Kullanıcı adı gir (maks. 16 karakter, harf/rakam/alt çizgi)
2. 4 karakter arasından birini seç
3. İsteğe bağlı aksesuar tak (şapka, maske veya pelerin)
4. **OYUNA GİR** — singleplayer demoda 2 test botu seni karşılar

🇬🇧
1. Enter a username (max 16 chars, letters/numbers/underscore)
2. Choose one of 4 characters
3. Optionally equip an accessory (hat, mask, or cape)
4. Click **OYUNA GİR** — in singleplayer demo, 2 test bots will spawn

---

### Kontroller / Controls

| Tuş / Key | 🇹🇷 Eylem | 🇬🇧 Action |
|-----------|----------|-----------|
| `W A S D` | Hareket | Move |
| `Sol Tık / Left Click` | Ateş / Yakın dövüş | Shoot / Melee attack |
| `Sağ Tık / Right Click` | Zoom (sniper için) | Zoom (sniper) |
| `Q` | Silah değiştir / Barikat materyali | Switch weapon / Cycle barricade material |
| `E` | Silah/zırh al · Kamuflajı etkinleştir | Pick up loot · Activate camouflage |
| `R` | Şarjör doldur | Reload |
| `G` | Silahı bırak | Drop weapon |
| `Shift` | Sprint (stamina harcar) | Sprint (costs stamina) |
| `F` | İnşaat modunu aç/kapat | Toggle build mode |

---

### Hasar & İyileşme / Damage & Healing

🇹🇷
- Her oyuncu **100 HP** ile başlar
- Zırh, hasarı HP'ye geçmeden önce emer
- Son hasardan **4 saniye** sonra HP yavaşça yenilenir (~5.7 HP/s)

🇬🇧
- Every player starts with **100 HP**
- Armor absorbs damage before it reaches HP
- HP slowly regenerates **4 seconds** after the last hit (~5.7 HP/s)

---

## Silahlar / Weapons

### Ateşli Silahlar / Ranged Weapons

| Silah / Weapon | Hasar / Damage | Şarjör / Magazine | Menzil / Range | Nadirlik / Rarity |
|----------------|---------------:|------------------:|---------------:|-------------------|
| Tabanca / Pistol | 25 | 12 / 60 | 500 px | ⚪ Common |
| Pompalı / Shotgun | 15×6 pellets | 6 / 30 | 220 px | 🟢 Uncommon |
| Makineli / SMG | 18 (auto) | 30 / 120 | 380 px | 🟢 Uncommon |
| Sniper | 70 | 5 / 20 | ∞ | 🔵 Rare |
| Bazuka / Bazooka | 90 (splash) | 1 / 8 | ∞ | 🔵 Rare |
| Zıpkın / Harpoon | 15 + pull | 1 / 6 | 450 px | 🟢 Uncommon |

> 🇹🇷 **Bazuka**: 100 px yarıçapında alan hasarı — duvarları ve barrikatları da kırar.  
> 🇬🇧 **Bazooka**: 100 px splash radius — destroys props and barricades.

> 🇹🇷 **Zıpkın**: İsabet halinde oyuncuyu sana doğru çeker.  
> 🇬🇧 **Harpoon**: Pulls the hit player toward you.

---

### Yakın Dövüş / Melee Weapons

| Silah / Weapon | Hasar / Damage | Menzil / Range | Nadirlik / Rarity |
|----------------|---------------:|---------------:|-------------------|
| Yumruk / Fist *(default)* | 10 | 60 px | — |
| Kılıç / Sword | 15 | 70 px | ⚪ Common |
| Kazma / Pickaxe | 20 | 65 px | 🟢 Uncommon |
| Balta / Axe | 30 | 60 px | 🔵 Rare |

---

### Yardımcı / Utility

| Item | 🇹🇷 Açıklama | 🇬🇧 Description | Nadirlik / Rarity |
|------|-------------|----------------|-------------------|
| Çalı Kamuflajı / Bush | Hareketsiz durunca görünmez olursun | Stand still to become invisible — breaks on fire | 🟢 Uncommon |

---

## Zırh / Armor

| Zırh / Armor | Seviye / Level | Dayanıklılık / Durability | Nadirlik / Rarity |
|--------------|---------------:|--------------------------:|-------------------|
| Hafif Yelek / Light Vest | 1 | 50 | ⚪ Common |
| Taktik Yelek / Tactical Vest | 2 | 75 | 🟢 Uncommon |
| Ağır Zırh / Heavy Armor | 3 | 100 | 🔵 Rare |

🇹🇷
- Zırh, hasar tamamen emilene kadar can kaybını engeller
- Kırılan zırhın taşan hasarı cana geçer
- Daha yüksek seviyeli zırh, düşük seviyeli zırhın üzerine giyilebilir
- Zırh kuşanma işlemi **5 saniyelik bekleme süresine** tabidir

🇬🇧
- Armor blocks all damage until it breaks
- Overflow damage from a broken piece carries over to HP
- Higher-level armor can be equipped over lower-level armor
- Equipping armor has a **5-second cooldown**

---

## Kaynaklar & İnşaat / Resources & Building

### Haritadaki Nesneler / Map Objects

| Nesne / Object | HP | Kaynak / Resource | Yeniden Doğar / Respawn |
|----------------|---:|-------------------|------------------------|
| Ağaç / Tree | 60 | 🪵 Wood (5/hit) | 120s |
| Kaya / Rock | 80 | 🪨 Stone (4/hit) | ✗ |
| Çalılık / Bush | 20 | 🪵 Wood (2/hit) | 60s |
| Metal Sandık / Metal Crate | 120 | 🔩 Metal (6/hit) | ✗ |

---

### Barikat Sistemi / Barricade System (`F` — İnşaat Modu / Build Mode)

🇹🇷 Haritaya **maksimum 5 barikat** yerleştirilebilir. `Q` ile malzeme döngüsü, **Sol Tık** ile yerleştir.  
🇬🇧 Place up to **5 barricades** on the map. Press `Q` to cycle materials, **Left Click** to place.

| Malzeme / Material | Maliyet / Cost | HP |
|-------------------|---------------:|---:|
| Ahşap / Wood | 25 🪵 | 80 |
| Taş / Stone | 12 🪨 | 220 |
| Metal | 8 🔩 | 420 |

---

## Teknik Altyapı / Tech Stack

| Katman / Layer | Teknoloji / Technology |
|----------------|----------------------|
| Oyun Motoru / Game Engine | [Phaser 3](https://phaser.io/) (v3.60) |
| Ağ / Network | [Socket.io](https://socket.io/) (v4.6) |
| Sunucu / Server | Node.js + Express |
| Hosting | Render.com (Free Tier) |

---

### Sunucu Taraflı Güvenlik / Server-Side Security

| 🇹🇷 | 🇬🇧 |
|----|-----|
| Hız/Teleport koruması — mesafe+zaman doğrulaması | Speed/teleport guard — distance+time validation per move packet |
| Ateş hızı sınırı — `player:shoot` olmadan `player:hit` kabul edilmez | Fire rate limit — `player:hit` rejected without a prior `player:shoot` |
| Menzil dışı hasar reddi (%50 gecikme toleransı) | Out-of-range damage rejection (50% lag tolerance) |
| Zırh cooldown — 5 sn dolmadan zırh değiştirilemez | Armor equip cooldown — 5s between equips |
| Kullanıcı adı temizleme — maks. 16 karakter | Username sanitization — max 16 alphanumeric chars |

---

## Yerel Kurulum / Local Setup

```bash
git clone https://github.com/keremtunayetkinn/wildzone-demo.git
cd wildzone-demo
npm install
npm start
# → http://localhost:3000
```

🇹🇷 Geliştirme modunda (otomatik yeniden başlatma):  
🇬🇧 Development mode (auto-restart on file change):

```bash
npm run dev
```

---

## Proje Yapısı / Project Structure

```
wildzone-demo/
├── server/
│   ├── index.js          # Express + Socket.io server
│   ├── GameRoom.js       # Game room logic, anti-cheat
│   └── constants.js      # Server-side constants
├── client/
│   ├── index.html
│   └── src/
│       ├── main.js       # Phaser config & asset loading
│       ├── scenes/       # BootScene, LobbyScene, GameScene, HUDScene
│       ├── entities/     # Player, RemotePlayer, TestBot, PropEntity, LootDrop
│       ├── systems/      # Network, Input, Weapon, Loot, Melee, Barricade, Armor...
│       └── constants/    # weapons.js, armor.js, props.js, barricades.js...
└── render.yaml           # Render.com auto-deploy config
```

---

## Lisans / License

MIT
