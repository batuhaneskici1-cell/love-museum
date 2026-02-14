# 💕 Aşkımızın Müzesi - Multiplayer 3D Love Gallery

Sevgililer Günü için özel tasarlanmış multiplayer 3D müze deneyimi. İki kişi aynı anda bağlanıp birlikte fotoğraflarınızı gezebilir, gizli mesajları keşfedebilirsiniz!

## 🎮 Özellikler

- ✨ **Gerçek Zamanlı Multiplayer**: Socket.io ile anlık senkronizasyon
- 🎨 **3D Müze**: Three.js ile profesyonel 3D grafik
- 🖼️ **20 Fotoğraf Çerçevesi**: Kendi fotoğraflarınızı ekleyebilirsiniz
- 💌 **5 Gizli Aşk Mesajı**: Yerde bulunan zarfları açın
- 👥 **İki Karakter**: Siyah ve kahverengi saçlı karakterler
- 🚪 **Oda Sistemi**: Benzersiz kod ile oda oluştur/katıl
- 🎮 **Kolay Kontroller**: WASD + Fare

## 🚀 Hızlı Başlangıç

### 1. Dosyaları İndirin
Tüm projeyi bilgisayarınıza indirin.

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Sunucuyu Başlatın
```bash
npm start
```

Tarayıcınızda `http://localhost:3000` adresine gidin!

## 🌐 Domain'e Deployment

### Render.com'a Deploy (ÜCRETSİZ)

1. [Render.com](https://render.com)'a kaydolun
2. "New +" → "Web Service" seçin
3. GitHub repo'nuzu bağlayın (veya manuel upload)
4. Ayarlar:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. "Create Web Service" butonuna basın
6. 2-3 dakika sonra siteniz hazır!

**Canlı URL'iniz:** `https://[isim].onrender.com`

### Vercel'e Deploy (Alternatif - Daha Hızlı)

**NOT:** Vercel serverless olduğu için Socket.io için Render veya Railway önerilir.

### Railway.app (Kolay Alternatif)

1. [Railway.app](https://railway.app)'e gidin
2. GitHub'dan projeyi import edin
3. Otomatik deploy olur!

## 📸 Kendi Fotoğraflarınızı Ekleme

### Yöntem 1: Basit (Placeholder yerine URL)

`public/index.html` dosyasında, `createPhotoFrames()` fonksiyonunda:

```javascript
// Photo texture yükle
const textureLoader = new THREE.TextureLoader();
const photoTexture = textureLoader.load('https://sizdeki-foto-url.com/foto1.jpg');

const photoMat = new THREE.MeshStandardMaterial({
  map: photoTexture  // Renk yerine texture kullan
});
```

### Yöntem 2: Profesyonel (Dosya Upload)

1. `public/photos/` klasörü oluşturun
2. Fotoğraflarınızı buraya koyun: `foto1.jpg`, `foto2.jpg`, ...
3. Kodda şöyle yükleyin:

```javascript
const photos = [
  '/photos/foto1.jpg',
  '/photos/foto2.jpg',
  // ... 20 taneye kadar
];

// createPhotoFrames fonksiyonunda:
const photoTexture = textureLoader.load(photos[index]);
```

## 💌 Gizli Mesajları Özelleştirme

`public/index.html` içinde `createMessages()` fonksiyonunu bulun:

```javascript
const messageData = [
  { x: -10, z: -15, text: "Kendi mesajınız buraya ❤️" },
  { x: 10, z: -10, text: "İkinci mesajınız 💕" },
  // ... istediğiniz kadar mesaj ekleyin
];
```

## 🎮 Nasıl Oynanır?

### 1. İlk Kişi (Oda Sahibi)
1. Siteye girin
2. "Oda Oluştur" butonuna basın
3. Ekranda 6 haneli kod görünür (örn: ABC123)
4. Bu kodu sevgilinize gönderin
5. Sevgiliniz katılana kadar bekleyin

### 2. İkinci Kişi (Misafir)
1. Aynı siteye girin
2. "Odaya Katıl" butonuna basın
3. Gönderilen kodu girin (ABC123)
4. "Katıl" butonuna basın

### 3. İkisi de içerideyken
- **W/A/S/D**: Hareket et
- **Fare**: Etrafa bak
- **E tuşu**: Yakında mesaj varsa oku
- **Tıklama**: Fotoğrafa yakından bak

## 🛠️ Teknik Detaylar

### Kullanılan Teknolojiler
- **Backend**: Node.js + Express + Socket.io
- **Frontend**: Vanilla JavaScript + Three.js
- **Real-time**: WebSocket (Socket.io)

### Proje Yapısı
```
love-museum/
├── server.js           # Backend server
├── package.json        # Dependencies
├── public/
│   ├── index.html     # Ana sayfa (tüm kod burada)
│   └── photos/        # Fotoğraflar buraya (opsiyonel)
└── README.md
```

## 🎨 Görsel Özelleştirmeler

### Renkleri Değiştirme
CSS değişkenlerini `index.html` içindeki `<style>` bölümünde bulabilirsiniz:
- Müze duvar rengi: `0xfff0f5`
- Zemin rengi: `0xf5e6e8`
- Işık renkleri: `0xff69b4`, `0xffb6c1`

### Karakter Saç Renkleri
`createCharacters()` fonksiyonunda:
```javascript
// Siyah saç
const hairMat = new THREE.MeshStandardMaterial({ color: 0x000000 });

// Kahverengi saç
const partnerHairMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
```

## 🐛 Sorun Giderme

### Port Already in Use
```bash
# Port değiştir
PORT=3001 npm start
```

### Socket Bağlanamıyor
`public/index.html` içinde socket URL'ini güncelleyin:
```javascript
const socket = io('https://sizin-domain.com');
```

### Fotoğraflar Görünmüyor
- Fotoğraf URL'lerini kontrol edin
- CORS hatası varsa aynı domain'de host edin

## 💝 İpuçları

1. **Mesajları kişiselleştirin** - Her mesajı özel anılarınızla değiştirin
2. **Fotoğraf sırası** - Kronolojik veya tematik sıralama daha etkili
3. **Gizli mesaj yerleri** - Fotoğrafların yakınına yerleştirin
4. **Partner'ınıza rehberlik** - İlk girişte kontrolleri açıklayın

## 📱 Mobil Uyumluluk

Şu an masaüstü için optimize edilmiştir. Mobil için:
- Touch kontrolleri eklenebilir
- Joystick UI eklenmeli
- Performans optimize edilmeli

## 🎁 Sevgililer Günü İçin

Bu proje özel olarak sevgililer günü hediyesi olarak tasarlanmıştır. Kendi fotoğraflarınızı, mesajlarınızı ekleyip benzersiz bir deneyim yaratabilirsiniz!

---

**Mutlu Sevgililer Günü! 💕**

Sorularınız için: [GitHub Issues](https://github.com/...)
