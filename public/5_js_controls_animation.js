    function setupControls() {
      window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
      });

      window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
        if (e.key.toLowerCase() === 'e') window.eKeyUsed = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (window.popupOpen) return; // Popup açıkken kamera dönmesin
        if (document.pointerLockElement === renderer.domElement) {
          yaw -= e.movementX * 0.002;
          pitch += e.movementY * 0.002;
          pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
        } else {
          mouseX = (e.clientX / window.innerWidth) * 2 - 1;
          mouseY = (e.clientY / window.innerHeight) * 2 - 1;
          yaw = -mouseX * Math.PI * 0.5;
          pitch = -mouseY * 0.3;
        }
      });

      // Pointer lock for better camera control
      renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
      });

      document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement) {
          // Pointer lock exited
        }
      });

      window.addEventListener('click', (e) => {
        const mouse = new THREE.Vector2();
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(photoFrames);

        if (intersects.length > 0) {
          const photo = intersects[0].object;
          showPhoto(photo.userData.index);
        }

        // Close popups
        if (e.target.classList.contains('message-popup') || e.target.classList.contains('photo-popup')) {
          document.getElementById('message-popup').classList.remove('show');
          document.getElementById('photo-popup').classList.remove('show');
        }
      });

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    function showPhoto(index) {
      const colors = ['#ff69b4', '#ffb6c1', '#ffc0cb', '#ff1493', '#db7093'];
      const color1 = colors[index % colors.length];
      const color2 = colors[(index + 1) % colors.length];
      
      const photoFrame = document.getElementById('photo-frame');
      photoFrame.style.background = `linear-gradient(135deg, ${color1}, ${color2})`;
      
      document.getElementById('photo-number').textContent = index;
      document.getElementById('photo-popup').classList.add('show');
    }

    let time = 0;
    let walkCycle = 0;
    let currentAnimation = null; // Şu an oynatılan animasyon
    let isDancingToggle = false; // Dans toggle durumu
    let lastQKeyState = false; // Q tuşunun önceki durumu
    
    // ANİMASYON HIZ AYARLARI - SABİT DEĞERLER
    let walkAnimSpeed = 1.14;   // Yürüme animasyon hızı
    let runAnimSpeed = 1.28;    // Koşma animasyon hızı
    let walkMoveSpeed = 0.016;  // Yürüme hareket hızı
    let runMoveSpeed = 0.073;   // Koşma hareket hızı
    let lastSpeedAdjust = 0;    // Son ayarlama zamanı
    
    function animate() {
      requestAnimationFrame(animate);
      time += 16;
      walkCycle += 0.1;

      // FBX ANİMASYON GÜNCELLEMESİ
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      if (partnerMixer) partnerMixer.update(delta);
      
      // ROOT MOTION: Sadece X ve Z sıfırla, Y'ye ASLA dokunma!
      // Y'yi sıfırlarsak kalça yere iner, ayaklar yeraltına girer!
      if (playerGroup.userData.fbxModel) {
        const fbxModel = playerGroup.userData.fbxModel;
        fbxModel.position.x = 0;
        fbxModel.position.z = 0;
        // fbxModel.position.y → DOKUNMA! Animasyon doğal yüksekliği ayarlar
        
        fbxModel.traverse((child) => {
          if (child.userData.isRootBone) {
            child.position.x = 0; // Sadece X sıfırla (yan kayma yok)
            child.position.z = 0; // Sadece Z sıfırla (ileri kayma yok)
            // child.position.y → DOKUNMA! Kalçanın doğal yüksekliği korunsun
          }
        });
      }
      if (partnerGroup && partnerGroup.userData.fbxModel) {
        const fbxModel = partnerGroup.userData.fbxModel;
        fbxModel.position.x = 0;
        fbxModel.position.z = 0;
        
        fbxModel.traverse((child) => {
          if (child.userData.isRootBone) {
            child.position.x = 0;
            child.position.z = 0;
            // child.position.y → DOKUNMA!
          }
        });
      }

      
      // Player movement - KAMERA YÖNÜNE GÖRE
      const isMoving = keys['w'] || keys['s'] || keys['a'] || keys['d'];
      const isRunning = keys['shift']; // SHIFT = KOŞMA
      
      // Q TUŞU - DANS MENÜSÜ AÇ
      const qKeyPressed = keys['q'];
      if (qKeyPressed && !lastQKeyState) {
        // Q tuşuna basıldı - dans menüsünü aç
        document.getElementById('dance-menu').style.display = 'flex';
        // Pointer lock'u kaldır (menüde fare kullanabilsin)
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        console.log('💃 Dans menüsü açıldı');
      }
      lastQKeyState = qKeyPressed;
      
      // FBX ANİMASYON KONTROLÜ (Her iki karakter için)
      if (playerGroup.userData.walkAction && playerGroup.userData.runAction) {
        const walkAction = playerGroup.userData.walkAction;
        const runAction = playerGroup.userData.runAction;
        const danceAction = playerGroup.userData.danceAction; // Eski - geriye uyumluluk
        const idleAction = playerGroup.userData.idleAction; // Opsiyonel
        
        // 4 Dans action'ları
        const danceAction1 = playerGroup.userData.danceAction1;
        const danceAction2 = playerGroup.userData.danceAction2;
        const danceAction3 = playerGroup.userData.danceAction3;
        const danceAction4 = playerGroup.userData.danceAction4;
        
        // Tüm temel animasyonlar yüklendiyse devam et
        if (walkAction && runAction) {
        
        // Mevcut oynatılan animasyonun hızını güncelle (runtime ayarlar için)
        if (walkAction && walkAction.enabled && walkAction.isRunning()) {
          walkAction.setEffectiveTimeScale(walkAnimSpeed);
        }
        if (runAction && runAction.enabled && runAction.isRunning()) {
          runAction.setEffectiveTimeScale(runAnimSpeed);
        }
        
        // Hangi animasyon oynatılmalı?
        let targetAnimation = null;
        
        if (selectedDance > 0) {
          // Dans seçilmiş (1-4)
          targetAnimation = `dance${selectedDance}`;
          // Dans ederken sadece X/Z sıfırla, Y doğal kalsın
          const fbxM = playerGroup.userData.fbxModel;
          if (fbxM) { fbxM.position.x = 0; fbxM.position.z = 0; }
          // playerGroup.position.y → dokunma
        } else if (isMoving && isRunning) {
          targetAnimation = 'run';
        } else if (isMoving) {
          targetAnimation = 'walk';
        } else if (idleAction) {
          targetAnimation = 'idle';
        }
        
        // EN BASİT SİSTEM - Sadece weight değiştir!
        if (currentAnimation !== targetAnimation && targetAnimation) {
          console.log('🎬 Geçiş:', currentAnimation, '→', targetAnimation);
          
          // Tüm animasyonların weight'ini 0 yap (gizle)
          if (walkAction) walkAction.setEffectiveWeight(0);
          if (runAction) runAction.setEffectiveWeight(0);
          if (idleAction) idleAction.setEffectiveWeight(0);
          
          // 4 Dans weight'lerini 0 yap
          if (danceAction1) danceAction1.setEffectiveWeight(0);
          if (danceAction2) danceAction2.setEffectiveWeight(0);
          if (danceAction3) danceAction3.setEffectiveWeight(0);
          if (danceAction4) danceAction4.setEffectiveWeight(0);
          
          // Hedef animasyonu göster (weight=1)
          if (targetAnimation === 'walk' && walkAction) {
            walkAction.setEffectiveWeight(1);
            walkAction.setEffectiveTimeScale(walkAnimSpeed);
            console.log('✅ Walk görünür');
          } else if (targetAnimation === 'run' && runAction) {
            runAction.setEffectiveWeight(1);
            runAction.setEffectiveTimeScale(runAnimSpeed);
            console.log('✅ Run görünür');
          } else if (targetAnimation === 'dance1' && danceAction1) {
            danceAction1.setEffectiveWeight(1);
            console.log('✅ Dans 1 görünür');
          } else if (targetAnimation === 'dance2' && danceAction2) {
            danceAction2.setEffectiveWeight(1);
            console.log('✅ Dans 2 görünür');
          } else if (targetAnimation === 'dance3' && danceAction3) {
            danceAction3.setEffectiveWeight(1);
            console.log('✅ Dans 3 görünür');
          } else if (targetAnimation === 'dance4' && danceAction4) {
            danceAction4.setEffectiveWeight(1);
            console.log('✅ Dans 4 görünür');
          } else if (targetAnimation === 'idle' && idleAction) {
            idleAction.setEffectiveWeight(1);
            console.log('✅ Idle görünür');
          }
          
          currentAnimation = targetAnimation;
        }
        } // Animasyonlar yüklü kontrolü sonu
      }
      
      if (isMoving) {
        // HAREKET HIZI (Ayarlanabilir değerler)
        const currentSpeed = isRunning ? runMoveSpeed : walkMoveSpeed;
        
        // Kamera yönüne göre hareket
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        
        if (keys['w']) {
          playerGroup.position.x += forward.x * currentSpeed;
          playerGroup.position.z += forward.z * currentSpeed;
        }
        if (keys['s']) {
          playerGroup.position.x -= forward.x * currentSpeed;
          playerGroup.position.z -= forward.z * currentSpeed;
        }
        if (keys['a']) {
          playerGroup.position.x -= right.x * currentSpeed;
          playerGroup.position.z -= right.z * currentSpeed;
        }
        if (keys['d']) {
          playerGroup.position.x += right.x * currentSpeed;
          playerGroup.position.z += right.z * currentSpeed;
        }
        
        // Karakter hareket yönüne dönsün
        const moveAngle = Math.atan2(forward.x, forward.z);
        playerGroup.rotation.y = moveAngle;
      }
      
      // ZIPLAMA
      if (keys[' '] && playerGroup.userData.onGround) {
        playerGroup.userData.velocityY = 0.15;
        playerGroup.userData.onGround = false;
      }
      
      // MÜZİK KONTROL (M tuşu)
      if (keys['m'] && !window.musicToggleCooldown) {
        const music = document.getElementById('background-music');
        if (music.paused) {
          music.play().catch(e => console.log('Müzik çalınamadı:', e));
          console.log('🎵 Müzik başlatıldı');
        } else {
          music.pause();
          console.log('🔇 Müzik durduruldu');
        }
        window.musicToggleCooldown = true;
        setTimeout(() => {
          window.musicToggleCooldown = false;
        }, 500);
      }
      
      // Yerçekimi
      if (!playerGroup.userData.velocityY) playerGroup.userData.velocityY = 0;
      if (!playerGroup.userData.onGround) {
        playerGroup.userData.velocityY -= 0.008;
        playerGroup.position.y += playerGroup.userData.velocityY;
        
        if (playerGroup.position.y <= 0) {
          playerGroup.position.y = 0;
          playerGroup.userData.velocityY = 0;
          playerGroup.userData.onGround = true;
        }
      } else {
        playerGroup.userData.onGround = true;
      }

      // ── MÜZEİÇİ SINIRLAR ──
      if (window.insideMuseum) {
        playerGroup.position.x = Math.max(-12.5, Math.min(12.5, playerGroup.position.x));
        playerGroup.position.z = Math.max(-17.5, Math.min(17.5, playerGroup.position.z));
      } else {
        // ── DIŞ SINIRLAR ──
        playerGroup.position.x = Math.max(-50, Math.min(50, playerGroup.position.x));
        playerGroup.position.z = Math.max(-50, Math.min(50, playerGroup.position.z));
        
        const px = playerGroup.position.x;
        const pz = playerGroup.position.z;
        
        // ══════════════════════════════════════
        // MÜZE BİNASI - BULLET-PROOF COLLISION
        // En yakın duvara it sistemi - geçilemez
        // ══════════════════════════════════════
        
        // Müze bounding box (world space, biraz geniş tutuldu)
        const musMinX = -15, musMaxX = 15;
        const musMinZ = -22, musMaxZ = 22;
        
        const inMuseumBox = px > musMinX && px < musMaxX && pz > musMinZ && pz < musMaxZ;
        
        if (inMuseumBox && !window.insideMuseum) {
          // Oyuncu dışarıdayken müze kutusuna girdi → en yakın duvara it
          const dLeft  = px - musMinX;   // Sol duvara mesafe
          const dRight = musMaxX - px;   // Sağ duvara mesafe
          const dBack  = pz - musMinZ;   // Arka duvara mesafe
          const dFront = musMaxZ - pz;   // Ön duvara mesafe (girişten)
          
          const minDist = Math.min(dLeft, dRight, dBack, dFront);
          
          if (minDist === dFront) {
            playerGroup.position.z = musMaxZ; // Ön duvarın dışına
          } else if (minDist === dBack) {
            playerGroup.position.z = musMinZ; // Arka duvarın dışına
          } else if (minDist === dLeft) {
            playerGroup.position.x = musMinX; // Sol duvarın dışına
          } else {
            playerGroup.position.x = musMaxX; // Sağ duvarın dışına
          }
        }
        
        // Nehir geçilmesin
        if (px > 29 && px < 40 && pz > -65 && pz < 65) {
          playerGroup.position.x = px < 34.5 ? 29 : 40;
        }
        
        // Çit
        if (pz > 12.5 && pz < 15.5 && Math.abs(px) < 23 && Math.abs(px) > 4) {
          playerGroup.position.z = pz < 14 ? 12.5 : 15.5;
        }
        if (pz > -38 && pz < 14 && px > 22 && px < 24.5) playerGroup.position.x = 22;
        if (pz > -38 && pz < 14 && px < -22 && px > -24.5) playerGroup.position.x = -22;
      }

      // GEOMETRİK KARAKTER ANİMASYONLARI (Sadece Batuhan için)
      // FBX karakterlerde (Merve) bu animasyonlar kullanılmaz
      if (playerGroup.leftArm && playerGroup.rightArm && !playerGroup.userData.fbxModel) {
        // Bu Batuhan (geometrik karakter)
        if (isMoving) {
          // YÜRÜME ANİMASYONU
          playerGroup.leftArm.rotation.x = Math.sin(walkCycle) * 0.5;
          playerGroup.leftArm.rotation.z = 0;
          playerGroup.rightArm.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
          playerGroup.rightArm.rotation.z = 0;
          
          // BACAK ANİMASYONU
          if (playerGroup.leftLeg && playerGroup.rightLeg) {
            playerGroup.leftLeg.rotation.x = Math.sin(walkCycle) * 0.4;
            playerGroup.rightLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.4;
          }
        } else {
          // Durduğunda normal pozisyon
          playerGroup.leftArm.rotation.x = 0;
          playerGroup.leftArm.rotation.y = 0;
          playerGroup.leftArm.rotation.z = 0;
          playerGroup.rightArm.rotation.x = 0;
          playerGroup.rightArm.rotation.y = 0;
          playerGroup.rightArm.rotation.z = 0;
          
          if (playerGroup.leftLeg && playerGroup.rightLeg) {
            playerGroup.leftLeg.rotation.x = 0;
            playerGroup.rightLeg.rotation.x = 0;
          }
        }
      }

      // Third-person camera - SABİT TAKİP
      const cameraDistance = 3.5; // Daha yakın
      const cameraHeight = 2.5;
      
      camera.position.x = playerGroup.position.x - Math.sin(yaw) * cameraDistance * Math.cos(pitch);
      camera.position.y = playerGroup.position.y + cameraHeight + Math.sin(pitch) * 2;
      camera.position.z = playerGroup.position.z - Math.cos(yaw) * cameraDistance * Math.cos(pitch);
      
      // Camera look at player
      camera.lookAt(playerGroup.position.x, playerGroup.position.y + 0.8, playerGroup.position.z);

      // Send position AND animation state to server
      socket.emit('update_position', {
        position: {
          x: playerGroup.position.x,
          y: playerGroup.position.y,
          z: playerGroup.position.z
        },
        rotation: playerGroup.rotation.y,
        animation: currentAnimation, // Şu anki animasyon
        danceNumber: selectedDance // Seçili dans (0 = yok, 1-4 = dans)
      });

      // Animate messages
      messages.forEach((msg, i) => {
        msg.position.y = msg.userData.baseY + Math.sin(time * 0.002 + i) * 0.1;
        msg.rotation.y += 0.01;
      });

      // Her frame başında indicator sıfırla
      const indicator = document.getElementById('message-indicator');
      indicator.classList.remove('show');
      indicator.textContent = '💌 E tuşuna bas ve mesajı oku!';

      // Check near message — dilek panosu bölgesini hariç tut
      nearMessage = null;
      const wishStandWorldPos = new THREE.Vector3(-10, 0, -14);
      const distToWishStand = playerGroup.position.distanceTo(wishStandWorldPos);
      if (distToWishStand > 2.5) { // Pano yakınında değilse mesaj zarflarını kontrol et
        messages.forEach((msg) => {
          const dist = playerGroup.position.distanceTo(msg.position);
          if (dist < 1.5) nearMessage = msg.userData;
        });
      }

      if (nearMessage) {
        document.getElementById('message-indicator').classList.add('show');
        document.getElementById('message-indicator').textContent = '💌 E tuşuna bas ve mesajı oku!';
        if (keys['e'] && !window.eKeyUsed && !window.popupOpen) {
          window.eKeyUsed = true;
          window.popupOpen = true;
          if (document.pointerLockElement) document.exitPointerLock();
          const popup = document.getElementById('message-popup');
          popup.querySelector('.icon').textContent = '💕';
          const titleEl = popup.querySelector('.npc-name');
          if (titleEl) titleEl.textContent = '';
          document.getElementById('message-text').textContent = nearMessage.text;
          popup.classList.add('show');
          // Tıklayınca kapat
          function closeMsg() {
            popup.classList.remove('show');
            window.popupOpen = false;
            window.eKeyUsed = false;
            popup.removeEventListener('click', closeMsg);
            const btn = popup.querySelector('.npc-close-btn');
            if (btn) btn.removeEventListener('click', closeMsg);
            setTimeout(() => { if (renderer && renderer.domElement) renderer.domElement.requestPointerLock(); }, 100);
          }
          popup.addEventListener('click', closeMsg);
          const closeBtn = popup.querySelector('.npc-close-btn');
          if (closeBtn) closeBtn.addEventListener('click', closeMsg);
        }
      }

      // NPC scope için erken tanımla
      let nearNPC = null;

      // DİLEK AĞACI ETKİLEŞİMİ - Önce input, sonra mesaj
      if (window.wishTreePos && !window.insideMuseum) {
        const distToWish = playerGroup.position.distanceTo(window.wishTreePos);
        if (distToWish < 4 && !nearNPC) {
          // indicator already declared above
          indicator.textContent = '🌳 E tuşuna bas - Dilek tut';
          indicator.classList.add('show');
          if (keys['e'] && !window.eKeyUsed && !window.popupOpen) {
            window.eKeyUsed = true;
            openWishPopup();
          }
        }
      }
      let nearDoor = false;
      
      if (!window.insideMuseum) {
        // DIŞARIDA: Kapıya yakın mı? (E tuşu ile şifre girişi)
        const doorPos = new THREE.Vector3(0, 0, 21);
        const distToDoor = playerGroup.position.distanceTo(doorPos);
        
        if (distToDoor < 4) {
          nearDoor = true;
          if (keys['e'] && !window.eKeyUsed) {
            window.eKeyUsed = true;
            window.popupOpen = true;
            if (document.pointerLockElement) document.exitPointerLock();
            document.getElementById('password-popup').style.display = 'flex';
            setTimeout(() => document.getElementById('password-input').focus(), 100);
          }
        }
      } else {
        // İÇERİDE: Çıkış kapısına yakın mı? (E tuşu ile çıkış)
        const exitDoorPos = new THREE.Vector3(0, 0, 16);
        const distToExit = playerGroup.position.distanceTo(exitDoorPos);
        
        if (distToExit < 3.5) {
          nearDoor = true;
          if (keys['e'] && !window.eKeyUsed) {
            window.eKeyUsed = true;
            exitMuseum();
          }
        }
      }

      if (nearDoor) {
        indicator.textContent = window.insideMuseum ? '🚪 E tuşuna bas - Müzeden Çık' : '🔐 E tuşuna bas - Müzeye Gir';
        indicator.classList.add('show');
      }

      // Animate floating hearts
      scene.children.forEach((child) => {
        if (child.userData.floatOffset !== undefined) {
          child.position.y += Math.sin(time * 0.001 + child.userData.floatOffset) * 0.002;
          child.rotation.y += 0.01;
        }
      });

      // KELEBEK ANİMASYONLARI
      if (window.butterflies) {
        window.butterflies.forEach((butterfly, i) => {
          const data = butterfly.userData;
          data.path += data.speed;
          
          // Sinüs dalgası ile uç
          butterfly.position.x += Math.cos(data.path) * 0.05;
          butterfly.position.z += Math.sin(data.path) * 0.05;
          butterfly.position.y = 1.5 + Math.sin(data.path * 3) * 0.5;
          
          // Kanat çırpma
          if (butterfly.children[0] && butterfly.children[1]) {
            const wingAngle = Math.sin(time * data.wingSpeed * 0.001) * 0.5;
            butterfly.children[0].rotation.y = -wingAngle;
            butterfly.children[1].rotation.y = wingAngle;
          }
          
          // Yönlendir
          butterfly.rotation.y = data.path;
          
          // Sınırlar içinde tut
          if (Math.abs(butterfly.position.x) > 50) butterfly.position.x *= -0.9;
          if (Math.abs(butterfly.position.z) > 50) butterfly.position.z *= -0.9;
        });
      }

      // ŞELALe ANİMASYONU
      if (window.waterfallBubbles && window.waterfallGroup) {
        window.waterfallBubbles.forEach(bub => {
          bub.position.y -= bub.userData.vy * (-1); // düşüyor
          bub.position.x += bub.userData.vx;
          if (bub.position.y < 0.5) {
            bub.position.y = bub.userData.startY;
            bub.position.x = (Math.random()-0.5)*7;
          }
        });
        // Su paneli dalgalanma
        window.waterfallGroup.children.forEach(c => {
          if (c.userData.isWaterfall) {
            c.material.opacity = 0.5 + Math.sin(time*0.003 + c.userData.offset)*0.2;
          }
        });
      }
      
      // UÇAN FENER ANİMASYONU
      if (window.lanterns) {
        window.lanterns.forEach(ln => {
          const d = ln.userData;
          ln.position.y += d.riseSpeed;
          ln.position.x = d.baseX + Math.sin(time*d.swaySpeed + d.swayOffset) * d.swayAmt;
          ln.rotation.z = Math.sin(time*d.swaySpeed*0.7 + d.swayOffset)*0.08;
          ln.rotation.x = Math.sin(time*d.swaySpeed*0.5)*0.05;
          // Tepeye ulaşınca aşağıya reset
          if (ln.position.y > d.maxY) {
            ln.position.y = 1.5 + Math.random()*2;
            ln.position.x = d.baseX;
            ln.position.z = d.baseZ;
          }
        });
      }
      
      // DİLEK AĞACI - kurdeleler sallanıyor
      if (window.wishTreeGroup) {
        window.wishTreeGroup.children.forEach(c => {
          if (c.userData.isRibbon) {
            c.rotation.z = Math.sin(time*0.001 + c.userData.sway)*0.15;
            c.rotation.x = Math.sin(time*0.0013 + c.userData.sway*0.7)*0.1;
          }
        });
      }
      
      // SALINCAK ANİMASYONU
      if (window.swingGroup) {
        window.swingAngle = Math.sin(time * 0.0015) * 0.35;
        // Koltuk ve ipler birlikte sallanıyor
        window.swingGroup.children.forEach(c => {
          if (c.position && c.position.y >= 3.3 && c.position.y <= 6.5 && c.position.x === 0) {
            c.rotation.x = window.swingAngle;
          }
          // İpler
          if (c.geometry && c.position.y > 4 && c.position.y < 6.5 && Math.abs(c.position.x) > 0.3) {
            c.rotation.x = window.swingAngle;
          }
        });
      }
      
      // NPC ANİMASYONLARI + ETKİLEŞİM MESAFESI
      if (window.npcs && playerGroup) {
        nearNPC = null;
        let nearNPCDist = 999;
        
        window.npcs.forEach((npc, idx) => {
          const d = npc.userData;
          const t = time * 0.001;
          
          // Patrol tipi
          if (d.type === 'patrol' && d.patrolPoints) {
            d.patrolT += 0.004;
            const pts = d.patrolPoints;
            const from = pts[d.patrolIndex % pts.length];
            const to = pts[(d.patrolIndex + 1) % pts.length];
            if (d.patrolT >= 1) {
              d.patrolT = 0;
              d.patrolIndex = (d.patrolIndex + 1) % pts.length;
            }
            const newX = from[0] + (to[0]-from[0]) * d.patrolT;
            const newZ = from[1] + (to[1]-from[1]) * d.patrolT;
            const dx = newX - npc.position.x;
            const dz = newZ - npc.position.z;
            if (Math.abs(dx) + Math.abs(dz) > 0.01) {
              npc.rotation.y = Math.atan2(dx, dz);
            }
            npc.position.x = newX;
            npc.position.z = newZ;
            // Yürüme animasyonu
            d.lArm.rotation.x = Math.sin(t*4 + idx) * 0.45;
            d.rArm.rotation.x = -Math.sin(t*4 + idx) * 0.45;
            d.lLeg.rotation.x = -Math.sin(t*4 + idx) * 0.35;
            d.rLeg.rotation.x = Math.sin(t*4 + idx) * 0.35;
          } else if (d.type === 'idle_sway' || d.type === 'static') {
            // Hafif sallanma (nefes efekti)
            npc.position.y = Math.sin(t * 0.8 + idx) * 0.015;
            d.lArm.rotation.z = Math.sin(t*0.6 + idx)*0.06;
            d.rArm.rotation.z = -Math.sin(t*0.6 + idx)*0.06;
          }
          
          // Mesafe kontrolü
          const dist = playerGroup.position.distanceTo(npc.position);
          if (dist < 3.5 && dist < nearNPCDist) {
            nearNPCDist = dist;
            nearNPC = npc;
          }
        });
        
        // NPC yakınsa göster
        if (nearNPC && !window.insideMuseum) {
          // indicator already declared above
          indicator.textContent = `💬 E tuşuna bas - ${nearNPC.userData.name} ile konuş`;
          indicator.classList.add('show');
          
          if (keys['e'] && !window.eKeyUsed && !window.popupOpen) {
            window.eKeyUsed = true;
            window.popupOpen = true;
            if (document.pointerLockElement) document.exitPointerLock();
            showNPCDialog(nearNPC.userData.name, nearNPC.userData.dialog);
          }
        }
      }

      // KUŞ ANİMASYONLARI
      if (window.birds) {
        window.birds.forEach((bird) => {
          const data = bird.userData;
          data.angle += data.speed * 0.01;
          
          // Dairesel uçuş
          bird.position.x = Math.cos(data.angle) * data.radius;
          bird.position.z = Math.sin(data.angle) * data.radius;
          bird.position.y = 15 + Math.sin(data.angle * 3) * 3;
          
          // Yönlendir
          bird.rotation.y = data.angle + Math.PI / 2;
        });
      }

      // ✈️ UÇAK ANİMASYONU
      if (window.airplane) {
        window.airplaneAngle += 0.0008;
        const radius = 120;
        const height = 55 + Math.sin(window.airplaneAngle * 0.5) * 5;
        window.airplane.position.x = Math.cos(window.airplaneAngle) * radius;
        window.airplane.position.z = Math.sin(window.airplaneAngle) * radius;
        window.airplane.position.y = height;
        // Doğru yön: burun (local +X) hareket yönüne baksın
        // Hareket yönü: d/dt(cos(a), 0, sin(a)) = (-sin(a), 0, cos(a))
        // Local +X'i bu vektöre hizalamak için: rotation.y = -a - PI/2
        window.airplane.rotation.y = -window.airplaneAngle - Math.PI / 2;
        // Hafif yalpalama
        window.airplane.rotation.z = Math.sin(window.airplaneAngle * 2) * 0.04;
        // Pervane dönüşü
        if (window.airplaneProps) {
          window.airplaneProps.forEach(p => { p.rotation.x += 0.4; });
        }
      }

      renderer.render(scene, camera);
    }

    // Event Listeners - DOM yüklendikten sonra
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✅ DOM yüklendi, event listener\'lar ekleniyor...');
      
      // Menu butonları
      const createBtn = document.getElementById('create-room-btn');
      const joinBtn = document.getElementById('join-room-btn');
      const submitBtn = document.getElementById('join-submit-btn');
      
      if (createBtn) {
        createBtn.addEventListener('click', createRoom);
        console.log('✅ Create button listener eklendi');
      }
      
      if (joinBtn) {
        joinBtn.addEventListener('click', showJoinInput);
        console.log('✅ Join button listener eklendi');
      }
      
      if (submitBtn) {
        submitBtn.addEventListener('click', joinRoom);
        console.log('✅ Submit button listener eklendi');
      }
      
      // Enter tuşu ile oda kodunu gönder
      const roomInput = document.getElementById('room-code-input');
      if (roomInput) {
        roomInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') joinRoom();
        });
      }
      
      // Karakter seçimi
      const batuhanBtn = document.getElementById('select-batuhan');
      const merveBtn = document.getElementById('select-merve');
      
      if (batuhanBtn) {
        batuhanBtn.addEventListener('click', () => selectCharacter('batuhan'));
        console.log('✅ Batuhan button listener eklendi');
      }
      
      if (merveBtn) {
        merveBtn.addEventListener('click', () => selectCharacter('merve'));
        console.log('✅ Merve button listener eklendi');
      }
    });
  </script>
</body>
</html>
