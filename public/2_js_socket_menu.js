  <script>
    // YÜKLEME EKRANI KONTROLCÜSÜ
    const loadingManager = {
      total: 0,
      loaded: 0,
      messages: [
        "Kalbine bağlanılıyor… Lütfen bekleyin 💘",
        "Birlikte sonsuz level'a geçiliyor…",
        "Sarılma DLC'si yükleniyor…",
        "Sana aşırı düşme hatası algılandı! (çözüm aranmıyor)",
        "Aşk XP'si kazanılıyor…",
        "Kıskanma modu kapatıldı. (belki 😏)",
        "Gülüşün sisteme entegre edildi ✔",
        "Seni sevmek varsayılan ayar olarak seçildi ✔",
        "Sevgi barı fullendi ❤️",
        "Seni görünce sistem ısınıyor…",
        "Sana bakınca utangaçlık modu açılıyor…",
        "Kalp çarpıntısı güncellemesi indiriliyor…"
      ],
      currentMessageIndex: 0,
      
      init() {
        this.updateMessage();
        setInterval(() => this.updateMessage(), 4000); // Her 4 saniyede bir mesaj değiştir
      },
      
      updateMessage() {
        const msgElement = document.getElementById('loading-messages');
        if (msgElement) {
          msgElement.style.animation = 'none';
          setTimeout(() => {
            msgElement.textContent = this.messages[this.currentMessageIndex];
            msgElement.style.animation = 'fadeIn 1s';
            this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
          }, 50);
        }
      },
      
      addItem(name) {
        this.total++;
        const itemsElement = document.getElementById('loading-items');
        if (itemsElement) {
          const item = document.createElement('div');
          item.id = `loading-item-${this.total}`;
          item.textContent = `⏳ ${name}...`;
          item.style.opacity = '0';
          item.style.transition = 'opacity 0.5s';
          itemsElement.appendChild(item);
          setTimeout(() => item.style.opacity = '1', 10);
        }
      },
      
      completeItem(name) {
        this.loaded++;
        const percentage = Math.round((this.loaded / this.total) * 100);
        // Gerçek yükleme sahte ilerlemeden büyükse güncelle
        const displayPercent = Math.max(percentage, Math.round(this._fakeProgress || 0));
        
        // Update bar
        const bar = document.getElementById('loading-bar');
        if (bar) bar.style.width = displayPercent + '%';
        
        // Update percentage
        const perc = document.getElementById('loading-percentage');
        if (perc) perc.textContent = displayPercent + '%';
        
        // Mark item complete
        const itemsElement = document.getElementById('loading-items');
        if (itemsElement) {
          const items = itemsElement.children;
          for (let item of items) {
            if (item.textContent.includes(name)) {
              item.textContent = `✅ ${name}`;
              item.style.color = '#4ade80';
            }
          }
        }
        
        // Tümü yüklendiyse ekranı kapat
        if (this.loaded >= this.total && this.total > 0) {
          if (this._fakeInterval) clearInterval(this._fakeInterval);
          setTimeout(() => this.hide(), 500);
        }
      },
      
      show() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
          screen.style.display = 'flex';
          screen.style.opacity = '1';
        }
        
        // Sahte ön ilerleme: 0% → 40% (dosyalar yüklenene kadar oyalar)
        this._fakeProgress = 0;
        this._fakeInterval = setInterval(() => {
          if (this._fakeProgress < 40) {
            this._fakeProgress += 0.15; // Çok yavaş ilerle
            const realPercent = this.total > 0 ? Math.round((this.loaded / this.total) * 100) : 0;
            if (realPercent < this._fakeProgress) {
              const bar = document.getElementById('loading-bar');
              if (bar) bar.style.width = this._fakeProgress + '%';
              const perc = document.getElementById('loading-percentage');
              if (perc) perc.textContent = Math.round(this._fakeProgress) + '%';
            }
          } else {
            clearInterval(this._fakeInterval);
          }
        }, 120); // 120ms × ~267 adım = ~32 saniyede %40'a ulaşır
      },
      
      hide() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
          screen.style.transition = 'opacity 1s';
          screen.style.opacity = '0';
          setTimeout(() => {
            screen.style.display = 'none';
          }, 1000);
        }
      }
    };
    
    // Yükleme ekranını başlat
    loadingManager.init();
    
    // Socket.io connection
    const socket = io();
    
    let scene, camera, renderer;
    let playerGroup, partnerGroup;
    let mixer, partnerMixer;
    let clock = new THREE.Clock();
    let keys = {};
    let mouseX = 0;
    let mouseY = 0;
    let yaw = 0;
    let pitch = 0.3; // Kamera açısı (yukarı/aşağı)
    let isHost = false;
    let roomCode = '';
    let partnerConnected = false;
    let photoFrames = [];
    let messages = [];
    let nearMessage = null;
    let selectedCharacter = null;
    let pendingAction = null; // 'create' or 'join'
    let selectedDance = 0; // 0 = dans yok, 1-4 = dans numarası
    let currentDanceAction = null; // Şu an çalan dans animasyonu

    let moveSpeed = 0.1; // Yürüme hızı

    // Socket events
    socket.on('room_created', (data) => {
      roomCode = data.roomCode;
      isHost = data.isHost;
      document.getElementById('room-code-text').textContent = roomCode;
      document.getElementById('room-display').style.display = 'block';
    });

    socket.on('room_joined', (data) => {
      roomCode = data.roomCode;
      isHost = data.isHost;
      partnerConnected = true;
      
      // Partner status güncelle (misafir odaya girince host zaten orada)
      const statusEl = document.getElementById('partner-status');
      if (statusEl) {
        statusEl.textContent = 'Bağlandı 💑';
        statusEl.classList.remove('waiting');
        statusEl.classList.add('connected');
      }
      
      // Menu ekranını gizle, karakter seçim ekranını göster
      document.getElementById('menu-screen').style.display = 'none';
      document.getElementById('character-screen').style.display = 'flex';
    });

    socket.on('partner_joined', () => {
      partnerConnected = true;
      console.log('💑 Partner katıldı!');
      
      // Partner status güncelle
      const statusEl = document.getElementById('partner-status');
      if (statusEl) {
        statusEl.textContent = 'Bağlandı 💑';
        statusEl.classList.remove('waiting');
        statusEl.classList.add('connected');
      }
      
      // Make partner visible immediately
      if (partnerGroup) {
        partnerGroup.visible = true;
      }
      
      // If we're waiting, show character selection
      if (!selectedCharacter) {
        document.getElementById('menu-screen').style.display = 'none';
        document.getElementById('character-screen').style.display = 'flex';
      }
    });

    socket.on('partner_moved', (data) => {
      if (partnerGroup) {
        partnerGroup.position.set(data.position.x, data.position.y, data.position.z);
        partnerGroup.rotation.y = data.rotation;
        
        // ANİMASYON SENKRONİZASYONU
        if (data.animation && partnerGroup.userData) {
          const partnerWalk = partnerGroup.userData.walkAction;
          const partnerRun = partnerGroup.userData.runAction;
          const partnerIdle = partnerGroup.userData.idleAction;
          const partnerDance1 = partnerGroup.userData.danceAction1;
          const partnerDance2 = partnerGroup.userData.danceAction2;
          const partnerDance3 = partnerGroup.userData.danceAction3;
          const partnerDance4 = partnerGroup.userData.danceAction4;
          
          // Tüm animasyonları gizle
          if (partnerWalk) partnerWalk.setEffectiveWeight(0);
          if (partnerRun) partnerRun.setEffectiveWeight(0);
          if (partnerIdle) partnerIdle.setEffectiveWeight(0);
          if (partnerDance1) partnerDance1.setEffectiveWeight(0);
          if (partnerDance2) partnerDance2.setEffectiveWeight(0);
          if (partnerDance3) partnerDance3.setEffectiveWeight(0);
          if (partnerDance4) partnerDance4.setEffectiveWeight(0);
          
          // İlgili animasyonu göster
          if (data.animation === 'walk' && partnerWalk) {
            partnerWalk.setEffectiveWeight(1);
          } else if (data.animation === 'run' && partnerRun) {
            partnerRun.setEffectiveWeight(1);
          } else if (data.animation === 'idle' && partnerIdle) {
            partnerIdle.setEffectiveWeight(1);
          } else if (data.animation === 'dance1' && partnerDance1) {
            partnerDance1.setEffectiveWeight(1);
          } else if (data.animation === 'dance2' && partnerDance2) {
            partnerDance2.setEffectiveWeight(1);
          } else if (data.animation === 'dance3' && partnerDance3) {
            partnerDance3.setEffectiveWeight(1);
          } else if (data.animation === 'dance4' && partnerDance4) {
            partnerDance4.setEffectiveWeight(1);
          }
          
          if (data.animation && data.animation.startsWith('dance')) {
            const partnerFbx = partnerGroup.userData.fbxModel;
            if (partnerFbx) { partnerFbx.position.x = 0; partnerFbx.position.z = 0; }
          }
        }
        
        // Make sure partner is visible
        if (!partnerGroup.visible && partnerConnected) {
          partnerGroup.visible = true;
        }
      }
    });

    socket.on('partner_disconnected', () => {
      partnerConnected = false;
      document.getElementById('partner-status').textContent = 'Ayrıldı 💔';
      document.getElementById('partner-status').classList.remove('connected');
      document.getElementById('partner-status').classList.add('waiting');
      if (partnerGroup) {
        partnerGroup.visible = false;
      }
    });

    socket.on('error', (data) => {
      showError(data.message);
    });

    // Menu functions
    function createRoom() {
      console.log('🏠 Oda oluşturuluyor...');
      pendingAction = 'create';
      socket.emit('create_room');
    }

    function showJoinInput() {
      console.log('🚪 Katılma ekranı açılıyor...');
      document.getElementById('join-input').style.display = 'block';
      document.getElementById('room-code-input').focus();
    }

    function joinRoom() {
      const code = document.getElementById('room-code-input').value.toUpperCase();
      console.log('🔑 Odaya katılmaya çalışıyor:', code);
      if (code.length === 6) {
        pendingAction = 'join';
        socket.emit('join_room', code);
      } else {
        showError('Geçersiz oda kodu!');
      }
    }

    function selectCharacter(character) {
      console.log('👤 Karakter seçildi:', character);
      selectedCharacter = character;
      startGame();
    }

    function showError(message) {
      const errorEl = document.getElementById('error-msg');
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 3000);
    }

    function checkPassword() {
      const input = document.getElementById('password-input').value.toLowerCase().trim();
      const errorEl = document.getElementById('password-error');
      
      if (input === 'batuhan') {
        // Doğru şifre!
        closePasswordPopup();
        enterMuseum();
      } else {
        // Yanlış şifre
        errorEl.textContent = '❌ Yanlış cevap! Tekrar dene.';
        errorEl.style.display = 'block';
        document.getElementById('password-input').value = '';
        setTimeout(() => {
          errorEl.style.display = 'none';
        }, 2000);
      }
    }

    function closePasswordPopup() {
      document.getElementById('password-popup').style.display = 'none';
      document.getElementById('password-input').value = '';
      document.getElementById('password-error').style.display = 'none';
      window.popupOpen = false;
      if (renderer && renderer.domElement) {
        setTimeout(() => renderer.domElement.requestPointerLock(), 100);
      }
    }

    // Global fonksiyonlar - HTML onclick için
    window.checkPassword = checkPassword;
    window.closePasswordPopup = closePasswordPopup;
    
    // DANS SEÇİM FONKSİYONLARI
    window.selectDance = function(danceNumber) {
      selectedDance = danceNumber;
      document.getElementById('dance-menu').style.display = 'none';
      console.log('💃 Dans seçildi:', danceNumber);
      
      // Pointer lock'u geri al
      if (document.pointerLockElement === null && renderer && renderer.domElement) {
        renderer.domElement.requestPointerLock();
      }
    };
    
    window.closeDanceMenu = function() {
      selectedDance = 0; // Dans kapalı
      document.getElementById('dance-menu').style.display = 'none';
      console.log('❌ Dans iptal edildi');
      
      // Pointer lock'u geri al
      if (document.pointerLockElement === null && renderer && renderer.domElement) {
        renderer.domElement.requestPointerLock();
      }
    };

    function enterMuseum() {
      window.insideMuseum = true;
      // KAPIYA DOKUNMA - Her zaman fiziksel olarak kilitli kalır
      // window.museumDoor.userData.locked = false; // BU SATIR KALDIRILD!
      window.museumInterior.visible = true;
      
      // Dış dünyayı tamamen gizle
      scene.children.forEach(child => {
        if (child !== window.museumInterior && child !== playerGroup && child !== partnerGroup) {
          child.visible = false;
        }
      });
      
      scene.background = new THREE.Color(0xfff0e8);
      scene.fog = null;
      
      // Karakteri içeriye ışınla - kapıdan biraz içeride
      playerGroup.position.set(0, 0, 14);
      yaw = Math.PI; // İçeriye baksın
      
      window.popupOpen = false;
      setTimeout(() => {
        if (renderer && renderer.domElement) renderer.domElement.requestPointerLock();
      }, 200);
      
      console.log('Müzeye hoş geldiniz!');
    }
    
    function exitMuseum() {
      window.insideMuseum = false;
      window.museumInterior.visible = false;
      
      // Dış dünyayı geri göster
      scene.children.forEach(child => {
        if (child !== window.museumInterior) {
          child.visible = true;
        }
      });
      
      // Gökyüzü rengini geri al
      scene.background = null;
      scene.fog = new THREE.FogExp2(0xaad4f0, 0.006);
      
      // Karakteri dışarıya ışınla — kapıdan UZAĞA (z:30 → kapı z:21'de, arası 9 birim)
      playerGroup.position.set(0, 0, 30);
      yaw = Math.PI; // Dışarıya baksın
      
      // Kapı etkileşimini bir süre kilitle (tekrar açılmasın)
      window.eKeyUsed = true;
      window.popupOpen = false;
      setTimeout(() => { 
        window.eKeyUsed = false;
        if (renderer && renderer.domElement) renderer.domElement.requestPointerLock();
      }, 800);
      
      console.log('Müzeden çıkıldı!');
    }
    
    window.exitMuseum = exitMuseum;
    
    // R TUŞU - SPAWN NOKTASINA IŞINLA
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r' && playerGroup && !window.popupOpen) {
        if (window.insideMuseum) {
          exitMuseum();
        }
        playerGroup.position.set(0, 0, 55);
        yaw = Math.PI;
        // Kısa flash efekti
        const flashDiv = document.createElement('div');
        flashDiv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:white;opacity:0.8;z-index:9999;pointer-events:none;transition:opacity 0.5s';
        document.body.appendChild(flashDiv);
        setTimeout(() => { flashDiv.style.opacity = '0'; setTimeout(() => flashDiv.remove(), 500); }, 50);
      }
    });
    
    // DİLEK POPUP FONKSİYONLARI
    window.wishText = '';
    
    function openWishPopup() {
      window.popupOpen = true;
      if (document.pointerLockElement) document.exitPointerLock();
      const popup = document.getElementById('wish-popup');
      popup.style.display = 'flex';
      setTimeout(() => document.getElementById('wish-input').focus(), 100);
    }
    
    function closeWishPopup() {
      document.getElementById('wish-popup').style.display = 'none';
      document.getElementById('wish-input').value = '';
      document.getElementById('wish-char-count').textContent = '120 karakter kaldı';
      window.popupOpen = false;
      window.eKeyUsed = false;
      setTimeout(() => { if (renderer && renderer.domElement) renderer.domElement.requestPointerLock(); }, 100);
    }
    
    function submitWish() {
      const text = document.getElementById('wish-input').value.trim();
      if (!text) return;
      
      window.wishText = text;
      closeWishPopup();
      
      // Dilek kabul mesajını göster
      const wishes = [
        '🌟 "Hep birlikte, hep mutlu..." — Dileğin kabul oldu! 💫',
        '✨ Ağaç fısıldıyor: "Sevginiz sonsuza dek sürsün..." 🌸',
        '💕 Dileğin ağacın köküne işlendi — gerçek olacak! 🌺',
        '🌈 "En büyük dilek zaten gerçek — birbirinizi buldunuz." 💝',
      ];
      const wish = wishes[Math.floor(Math.random()*wishes.length)];
      
      setTimeout(() => {
        window.popupOpen = true;
        if (document.pointerLockElement) document.exitPointerLock();
        showNPCDialog('🌳 Dilek Ağacı', wish + '\n\n📜 Dileğin müze duvarına işlendi!');
        
        // Müze duvarına ekle (hemen)
        if (window.addWishToWall) window.addWishToWall(text);
      }, 200);
    }
    
    window.openWishPopup = openWishPopup;
    window.closeWishPopup = closeWishPopup;
    window.submitWish = submitWish;
    
    function showNPCDialog(name, text) {
      document.getElementById('message-text').innerHTML = text.replace(/\n/g, '<br>');
      const popup = document.getElementById('message-popup');
      const icon = popup.querySelector('.icon');
      if (icon) icon.textContent = '💬';
      let titleEl = popup.querySelector('.npc-name');
      if (!titleEl) {
        titleEl = document.createElement('h3');
        titleEl.className = 'npc-name';
        titleEl.style.cssText = 'color:white;font-size:22px;margin-bottom:15px;text-shadow:1px 1px 5px rgba(0,0,0,0.3)';
        popup.querySelector('.message-content').insertBefore(titleEl, popup.querySelector('.icon').nextSibling);
      }
      titleEl.textContent = name;
      
      // Kapat butonu ekle (yoksa)
      let closeBtn = popup.querySelector('.npc-close-btn');
      if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'npc-close-btn';
        closeBtn.textContent = '✕ Kapat';
        closeBtn.style.cssText = 'margin-top:20px;padding:10px 28px;font-size:16px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);border-radius:30px;cursor:pointer;font-family:serif;display:block;margin-left:auto;margin-right:auto;';
        popup.querySelector('.message-content').appendChild(closeBtn);
      }
      
      popup.classList.add('show');
      
      function closeDialog() {
        popup.classList.remove('show');
        window.popupOpen = false;
        window.eKeyUsed = false;
        popup.removeEventListener('click', onPopupClick);
        closeBtn.removeEventListener('click', closeDialog);
        setTimeout(() => { if (renderer && renderer.domElement) renderer.domElement.requestPointerLock(); }, 100);
      }
      function onPopupClick(e) {
        if (e.target === popup) closeDialog(); // sadece overlay'e tıklayınca
      }
      popup.addEventListener('click', onPopupClick);
      closeBtn.addEventListener('click', closeDialog);
    }
    window.showNPCDialog = showNPCDialog;

    function startGame() {
      if (!selectedCharacter) return;
      
      // Menü ve karakter ekranlarını gizle
      document.getElementById('menu-screen').style.display = 'none';
      document.getElementById('character-screen').style.display = 'none';
      
      // YÜKLEME EKRANINI GÖSTER
      loadingManager.show();
      
      // Kısa bir süre sonra yüklemeyi başlat (ekran görünsün diye)
      setTimeout(() => {
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.display = 'block';
        initThreeJS();
      }, 100);
      
      // Müziği başlatmayı dene (kullanıcı etkileşimi sonrası)
      setTimeout(() => {
        const music = document.getElementById('background-music');
        music.volume = 0.3; // Ses seviyesi %30
        music.play().catch(e => {
          console.log('Müzik başlatılamadı. M tuşuna basarak başlatabilirsiniz.');
        });
      }, 500);
    }

