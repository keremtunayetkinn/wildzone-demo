# 🌲 WildZone — 2D Browser Battle Royale

> Tarayıcıda çalışan, Phaser 3 ile yapılmış çok oyunculu bir battle royale demodur.  
> Kurulum gerektirmez — linke gir, karakter seç, oyna.

**🎮 [Canlı Demo → wildzone-demo.onrender.com](https://wildzone-demo.onrender.com)**

> ⚠️ Demo Render.com ücretsiz planında çalışmaktadır. 15 dakika pasiflikten sonra sunucu uyku moduna girer; ilk açılış **~30 saniye** sürebilir.

---

## Ekran Görüntüleri

> *(Ekran görüntüleri eklenecek)*

---

## Özellikler

- 🌐 **Tarayıcı tabanlı** — kurulum yok, link paylaş, oyna
- 👥 **Çok oyunculu** — aynı anda 40 oyuncuya kadar destek (Socket.io)
- 🤖 **Singleplayer demo** — oyuna girince 2 test botu otomatik spawn olur, mekanikleri yalnız test edebilirsin
- 🗺️ **3000×3000 piksel** açık dünya haritası
- 💥 **10 farklı silah**, **3 zırh tipi**, **4 karakter**, **7 aksesuar**
- 🏗️ **Barikat inşaat sistemi** (3 malzeme türü)
- 🎯 **Hız koruması ve sunucu taraflı hile önleme**

---

## Nasıl Oynanır

### Lobi

1. Kullanıcı adı gir (maks. 16 karakter, harf/rakam/alt çizgi)
2. 4 karakter arasından birini seç
3. İsteğe bağlı aksesuar tak (şapka, maske veya pelerin)
4. **OYUNA GİR** — singleplayer demoda 2 test botu seni karşılar

### Kontroller

| Tuş | Eylem |
|-----|-------|
| `W A S D` | Hareket |
| `Sol Tık` | Ateş / Yakın dövüş |
| `Sağ Tık` | Hedefleme (zoom, sniper için) |
| `Q` | Silah değiştir / Barikat materyali değiştir |
| `E` | Yere düşen silahı/zırhı al · Kamuflajı etkinleştir |
| `R` | Şarjör doldur |
| `G` | Silahı bırak |
| `Shift` | Sprint (stamina harcar) |
| `F` | İnşaat modunu aç/kapat |

### Hasar & İyileşme

- Her oyuncu **100 HP** ile başlar
- Zırh, hasarı HP'ye geçmeden önce emer
- Son hasardan **4 saniye** sonra HP yavaşça yenilenir (~5.7 HP/s)

---

## Silahlar

### Ateşli Silahlar

| Silah | Hasar | Şarjör | Menzil | Nadirlik |
|-------|------:|------:|------:|---------|
| Tabanca | 25 | 12 / 60 | 500 px | ⚪ Common |
| Pompalı Tüfek | 15×6 saçma | 6 / 30 | 220 px | 🟢 Uncommon |
| Makineli Tabanca | 18 (otomatik) | 30 / 120 | 380 px | 🟢 Uncommon |
| Sniper | 70 | 5 / 20 | ∞ | 🔵 Rare |
| Bazuka | 90 (alan) | 1 / 8 | ∞ | 🔵 Rare |
| Zıpkın | 15 + çekme | 1 / 6 | 450 px | 🟢 Uncommon |

> **Bazuka**: 100 px yarıçapında alan hasarı — duvarları ve barrikatları da kırar.  
> **Zıpkın**: İsabet halinde oyuncuyu sana doğru çeker.

### Yakın Dövüş

| Silah | Hasar | Menzil | Nadirlik |
|-------|------:|------:|---------|
| Yumruk *(varsayılan)* | 10 | 60 px | — |
| Kılıç | 15 | 70 px | ⚪ Common |
| Kazma | 20 | 65 px | 🟢 Uncommon |
| Balta | 30 | 60 px | 🔵 Rare |

### Yardımcı

| Item | Açıklama | Nadirlik |
|------|---------|---------|
| Çalı Kamuflajı | Hareketsiz durunca görünmez olursun, ateş edince bozulur | 🟢 Uncommon |

---

## Zırh

| Zırh | Seviye | Dayanıklılık | Nadirlik |
|------|------:|------:|---------|
| Hafif Yelek | 1 | 50 | ⚪ Common |
| Taktik Yelek | 2 | 75 | 🟢 Uncommon |
| Ağır Zırh | 3 | 100 | 🔵 Rare |

- Zırh, hasar tamamen emilene kadar can kaybını engeller
- Kırılan zırhın taşan hasarı cana geçer
- Daha yüksek seviyeli zırh, düşük seviyeli zırhın üzerine giyilebilir
- Zırh kuşanma işlemi **5 saniyelik bekleme süresine** tabidir

---

## Kaynaklar & İnşaat

### Haritadaki Nesneler

| Nesne | HP | Kaynak | Yeniden Doğar |
|-------|---:|-------|---------|
| Ağaç | 60 | 🪵 Ahşap (5/vuruş) | 120 sn sonra |
| Kaya | 80 | 🪨 Taş (4/vuruş) | ✗ |
| Çalılık | 20 | 🪵 Ahşap (2/vuruş) | 60 sn sonra |
| Metal Sandık | 120 | 🔩 Metal (6/vuruş) | ✗ |

### Barikat Sistemi (`F` tuşu ile inşaat modu)

- Haritaya **maksimum 5 barikat** yerleştirilebilir
- `Q` ile malzeme döngüsü, **Sol Tık** ile yerleştir

| Malzeme | Maliyet | HP |
|---------|------:|---:|
| Ahşap | 25 🪵 | 80 |
| Taş | 12 🪨 | 220 |
| Metal | 8 🔩 | 420 |

---

## Teknik Altyapı

| Katman | Teknoloji |
|--------|---------|
| Oyun Motoru | [Phaser 3](https://phaser.io/) (v3.60) |
| Ağ | [Socket.io](https://socket.io/) (v4.6) |
| Sunucu | Node.js + Express |
| Hosting | Render.com (Free Tier) |

### Sunucu Taraflı Güvenlik

- **Hız/Teleport koruması**: Her hareket paketinde mesafe+zaman doğrulaması
- **Ateş hızı sınırı**: `player:shoot` olmadan `player:hit` kabul edilmez
- **Mesafe kontrolü**: Sniper dışında menzil dışı hasar reddedilir (%50 gecikme toleransı)
- **Zırh cooldown**: 5 sn dolmadan zırh değiştirilemez
- **Kullanıcı adı temizleme**: Alfanümerik + alt çizgi, maks. 16 karakter

---

## Yerel Kurulum

```bash
git clone https://github.com/keremtunayetkinn/wildzone-demo.git
cd wildzone-demo
npm install
npm start
# → http://localhost:3000
```

Geliştirme modunda (otomatik yeniden başlatma):

```bash
npm run dev
```

---

## Proje Yapısı

```
wildzone-demo/
├── server/
│   ├── index.js          # Express + Socket.io sunucusu
│   ├── GameRoom.js        # Oyun odası mantığı, hile önleme
│   └── constants.js       # Sunucu sabitleri
├── client/
│   ├── index.html
│   └── src/
│       ├── main.js        # Phaser konfigürasyonu
│       ├── scenes/        # BootScene, LobbyScene, GameScene, HUDScene
│       ├── entities/      # Player, RemotePlayer, TestBot, PropEntity, LootDrop
│       ├── systems/       # Network, Input, Weapon, Loot, Melee, Barricade, Armor...
│       └── constants/     # weapons.js, armor.js, props.js, barricades.js...
└── render.yaml            # Render.com otomatik deploy konfigürasyonu
```

---

## Lisans

MIT
