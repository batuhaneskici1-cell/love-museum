    // Three.js setup
    function initThreeJS() {
      const container = document.getElementById('game-container');
      
      scene = new THREE.Scene();
      
      // GÜZEL SKYBOX - Altın saatli yumuşak gökyüzü
      const skyGeo = new THREE.SphereGeometry(500, 32, 15);
      const skyMat = new THREE.ShaderMaterial({
        uniforms: {
          topColor:    { value: new THREE.Color(0x4488ff) },
          midColor:    { value: new THREE.Color(0x88ccff) },
          bottomColor: { value: new THREE.Color(0xffd6a0) },
          offset: { value: 33 },
          exponent: { value: 0.5 }
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 midColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            vec3 col = h > 0.1 ? mix(midColor, topColor, pow(max(h-0.1, 0.0)*1.11, exponent)) 
                               : mix(bottomColor, midColor, max(h + 0.1, 0.0) * 10.0);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        side: THREE.BackSide
      });
      const sky = new THREE.Mesh(skyGeo, skyMat);
      scene.add(sky);
      
      scene.fog = new THREE.FogExp2(0xaad4f0, 0.006); // Hafif sis efekti

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 2, 15); // Dışarıda başla

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      // Lighting - GÜNEŞ IŞIĞI (daha yumuşak)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Biraz daha parlak
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight(0xffffff, 1.0); // Daha az yoğun, beyaz ışık
      sunLight.position.set(30, 50, 30);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 4096;
      sunLight.shadow.mapSize.height = 4096;
      sunLight.shadow.camera.left = -60;
      sunLight.shadow.camera.right = 60;
      sunLight.shadow.camera.top = 60;
      sunLight.shadow.camera.bottom = -60;
      sunLight.shadow.camera.far = 200;
      scene.add(sunLight);

      // ZENGİN ÇİMEN ZEMİN - yumuşak, göz yormayan
      const grassCanvas = document.createElement('canvas');
      grassCanvas.width = 256; grassCanvas.height = 256;
      const gCtx = grassCanvas.getContext('2d');
      
      // Düz yeşil zemin
      gCtx.fillStyle = '#4e7d28';
      gCtx.fillRect(0, 0, 256, 256);
      
      // Çok az, çok hafif ton farkı
      const grassTones = ['#456e22','#568530','#4a7826','#527f2c','#3f6a1e'];
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const r = 3 + Math.random() * 14;
        gCtx.beginPath();
        gCtx.arc(x, y, r, 0, Math.PI * 2);
        gCtx.fillStyle = grassTones[Math.floor(Math.random() * grassTones.length)] + '55';
        gCtx.fill();
      }
      
      const grassTex = new THREE.CanvasTexture(grassCanvas);
      grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
      grassTex.repeat.set(12, 12); // Daha az tile = daha az göz yorgunluğu
      
      const groundGeo = new THREE.PlaneGeometry(300, 300, 1, 1);
      const groundMat = new THREE.MeshStandardMaterial({ 
        map: grassTex,
        color: 0x4e7d28, // Base color ile harmanlama
        roughness: 0.92,
        metalness: 0.0
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      

      // ========================================
      // 🌿 KENNEY NATURE KIT - TASARLI DÜNYA
      // ========================================
      const gltfLoader = new THREE.GLTFLoader();
      
      function placeModel(name, x, y, z, scale, rotY) {
        gltfLoader.load(`/models/${name}.glb`,
          function(gltf) {
            const obj = gltf.scene;
            obj.position.set(x, y, z);
            obj.scale.setScalar(scale || 1);
            obj.rotation.y = rotY || 0;
            obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            scene.add(obj);
          }, undefined, () => {}
        );
      }
      
      function scatterModels(names, count, xRange, zRange, minScale, maxScale) {
        for (let i = 0; i < count; i++) {
          const name = names[Math.floor(Math.random() * names.length)];
          let x = (Math.random() - 0.5) * xRange;
          let z = (Math.random() - 0.5) * zRange;
          if (Math.abs(x) < 24 && z > -40 && z < 14) x += x > 0 ? 28 : -28;
          const s = minScale + Math.random() * (maxScale - minScale);
          placeModel(name, x, 0, z, s, Math.random() * Math.PI * 2);
        }
      }

      // ── AĞAÇLAR ──
      const oakTrees = ['tree_oak', 'tree_detailed', 'tree_default'];
      const pineTrees = ['tree_pineRoundA', 'tree_pineRoundB', 'tree_pineTallA'];
      const smallTrees = ['tree_simple', 'tree_small', 'tree_fat', 'tree_tall'];
      const allTrees = [...oakTrees, ...pineTrees];
      
      for (let i = 0; i < 18; i++) {
        const name = allTrees[Math.floor(Math.random() * allTrees.length)];
        placeModel(name, 50 + Math.random() * 14, 0, -70 + i * 8, 1.2 + Math.random() * 0.8, Math.random() * Math.PI * 2);
      }
      for (let i = 0; i < 18; i++) {
        const name = oakTrees[Math.floor(Math.random() * oakTrees.length)];
        placeModel(name, -46 - Math.random() * 12, 0, -70 + i * 8, 1.0 + Math.random() * 1.0, Math.random() * Math.PI * 2);
      }
      for (let i = 0; i < 14; i++) {
        const name = allTrees[Math.floor(Math.random() * allTrees.length)];
        placeModel(name, -52 + i * 8, 0, -65 - Math.random() * 10, 1.3 + Math.random() * 0.7, Math.random() * Math.PI * 2);
      }
      for (let i = 0; i < 10; i++) {
        const name = smallTrees[Math.floor(Math.random() * smallTrees.length)];
        const x = -40 + i * 9;
        if (Math.abs(x) > 18) placeModel(name, x, 0, 52 + Math.random() * 14, 0.8 + Math.random() * 0.6, Math.random() * Math.PI * 2);
      }
      scatterModels(smallTrees, 12, 30, 50, 0.7, 1.2);

      // ── ÇİÇEKLER - Bol ve renkli ──
      const flowers = ['flower_purpleA','flower_purpleB','flower_purpleC','flower_redA','flower_redB','flower_redC','flower_yellowA','flower_yellowB','flower_yellowC'];
      scatterModels(flowers, 120, 85, 110, 0.8, 1.6); // Daha fazla çiçek
      // Müze yolu boyunca çiçek şeridi (yeni konumlar - sütunların dışı)
      for (let z = 15; z <= 58; z += 1.8) {
        placeModel(flowers[Math.floor(Math.random() * flowers.length)], -5.5 + Math.random()*1.2 - 6, 0, z, 1.1, Math.random()*Math.PI);
        placeModel(flowers[Math.floor(Math.random() * flowers.length)],  5.5 - Math.random()*1.2 + 6, 0, z, 1.1, Math.random()*Math.PI);
      }
      // Nehir kenarı çiçek şeridi
      for (let z = -55; z <= 55; z += 2.5) {
        placeModel(flowers[Math.floor(Math.random()*flowers.length)], 27+Math.random()*2, 0, z+Math.random()*2, 1.0, Math.random()*Math.PI);
      }
      // Kamp etrafı yoğun çiçekler (güzel alan)
      scatterModels(flowers, 25, 15, 15, 1.0, 1.5); // -30 bölgesi

      // ── ÇIMEN VE ÇALILAR - daha yoğun ──
      scatterModels(['grass','grass_large','grass_leafs','grass_leafsLarge'], 100, 95, 120, 0.6, 1.4);
      scatterModels(['plant_bush','plant_bushDetailed','plant_bushLarge','plant_bushSmall'], 50, 85, 95, 0.7, 1.5);

      // ── KAYALAR ──
      for (let z = -55; z <= 55; z += 8) {
        placeModel(['rock_smallA','rock_smallB','stone_smallA','stone_smallB'][Math.floor(Math.random()*4)], 30 + Math.random()*3, 0, z + Math.random()*4, 0.8 + Math.random()*0.5, Math.random()*Math.PI*2);
      }
      scatterModels(['rock_largeA','rock_largeB','rock_largeC','rock_largeD'], 8, 90, 100, 0.8, 1.5);
      scatterModels(['rock_tallA','rock_tallB','rock_tallE'], 6, 90, 100, 0.7, 1.2);
      scatterModels(['rock_smallA','rock_smallC','stone_smallA','stone_smallD'], 20, 80, 90, 0.5, 1.0);

      // ── MANTARLAR ──
      const mushrooms = ['mushroom_redGroup','mushroom_tanGroup','mushroom_red','mushroom_tan'];
      for (let i = 0; i < 8; i++) placeModel(mushrooms[Math.floor(Math.random()*mushrooms.length)], -38-Math.random()*8, 0, -40+i*12, 0.8+Math.random()*0.5, Math.random()*Math.PI*2);
      for (let i = 0; i < 6; i++) placeModel(mushrooms[Math.floor(Math.random()*mushrooms.length)], 50+Math.random()*8, 0, -30+i*14, 0.7+Math.random()*0.4, Math.random()*Math.PI*2);

      // ── KÜTÜKLER ──
      scatterModels(['stump_roundDetailed','stump_squareDetailed','stump_old'], 10, 80, 90, 0.7, 1.1);
      scatterModels(['log','log_large','log_stack'], 8, 70, 80, 0.8, 1.2);

      // ── NEHİR (tile tabanlı) ──
      for (let z = -60; z <= 60; z += 4) placeModel('ground_riverStraight', 33, 0, z, 2.0, 0);
      for (let i = 0; i < 8; i++) placeModel(i%2===0?'lily_large':'lily_small', 33+(Math.random()-0.5)*4, 0.05, -50+i*14, 0.8, Math.random()*Math.PI*2);

      // ── KÖPRÜ ──
      placeModel('bridge_wood', 33, 0, 0, 2.0, 0);

      // ── TAŞLI YOL (Müze dışı yakın çevre - kaldırıldı, yeni giriş tasarımı içinde) ──
      // Müzeden uzakta kalan bölüm yolu
      for (let z = 40; z <= 55; z += 4) placeModel('ground_pathStraight', 0, 0, z, 2.0, 0);

      // ── MÜZENİN ÖNÜ: HEYKELLİ GİRİŞ ──
      // Büyük giriş sütunları - yol başında (daha geri)
      for (const [sx,sz] of [[-12,44],[12,44],[-12,52],[12,52]]) {
        placeModel('statue_column', sx, 0, sz, 1.8, 0);
      }
      // Obelisk'ler - yol girişi anıtsal kapısı
      placeModel('statue_obelisk', -10, 0, 58, 1.8, 0);
      placeModel('statue_obelisk',  10, 0, 58, 1.8, 0);
      // Statue ring (dekoratif)
      placeModel('statue_ring', 0, 0, 56, 1.2, 0);
      placeModel('statue_block', -16, 0, 48, 1.2, 0.4);
      placeModel('statue_block',  16, 0, 48, 1.2, -0.4);

      // ── ÇİT (Müze bahçesi etrafı - daha geniş) ──
      for (let x = -22; x <= -5; x += 2.5) placeModel('fence_simple', x, 0, 42, 1.1, 0);
      for (let x =   5; x <=  22; x += 2.5) placeModel('fence_simple', x, 0, 42, 1.1, 0);
      for (let z = -22; z <= 42; z += 2.5) {
        placeModel('fence_simple', -23, 0, z, 1.1, Math.PI/2);
        placeModel('fence_simple',  23, 0, z, 1.1, Math.PI/2);
      }
      placeModel('fence_gate', 0, 0, 42, 1.2, 0);
      // Bahçe köşe direkleri
      for (const [gx,gz] of [[-23,42],[23,42],[-23,-22],[23,-22]]) {
        placeModel('statue_column', gx, 0, gz, 0.9, 0);
      }

      // ── KAMP ATEŞİ (romantik alan) ──
      placeModel('campfire_stones', -30, 0, 25, 1.6, 0);
      placeModel('log_large', -28, 0, 25, 1.0, Math.PI*0.1);
      placeModel('log_large', -32, 0, 25, 1.0, Math.PI*0.9);
      placeModel('stump_roundDetailed', -30, 0, 23, 0.9, 0);
      placeModel('stump_roundDetailed', -30, 0, 27, 0.9, 0);
      placeModel('stump_roundDetailed', -28, 0, 27, 0.8, 0.5);
      // Kamp etrafı çiçek çemberi
      for (let i = 0; i < 12; i++) {
        const a = (i/12)*Math.PI*2;
        placeModel(flowers[Math.floor(Math.random()*flowers.length)], -30+Math.cos(a)*6, 0, 25+Math.sin(a)*6, 1.0, a);
      }
      // Kamp yanında çadır
      placeModel('tent_detailedOpen', -38, 0, 28, 1.2, Math.PI*0.8);

      // ── KÖPRÜ BAŞI KAYALARI ──
      placeModel('rock_largeA', 29, 0, -4, 0.9, 0.3);
      placeModel('rock_largeB', 29, 0,  4, 0.8, 1.1);
      placeModel('stone_largeA', 37, 0, -4, 0.9, 0.5);
      placeModel('stone_largeB', 37, 0,  4, 0.8, 1.2);
      // Köprü yanı fenerler (stump ile temsil)
      placeModel('stump_squareDetailed', 30, 0, -2, 0.7, 0);
      placeModel('stump_squareDetailed', 30, 0,  2, 0.7, 0);
      placeModel('stump_squareDetailed', 36, 0, -2, 0.7, 0);
      placeModel('stump_squareDetailed', 36, 0,  2, 0.7, 0);
      
      // ── SAĞ TARAF: PİKNİK ALANI ──
      placeModel('log_stack', 22, 0, 30, 1.1, 0.2);
      placeModel('log_stack', 25, 0, 35, 1.0, 1.0);
      placeModel('campfire_logs', 23, 0, 33, 1.2, 0);
      for (let i = 0; i < 8; i++) {
        placeModel(flowers[Math.floor(Math.random()*flowers.length)], 18+Math.random()*10, 0, 26+Math.random()*12, 1.0, Math.random()*Math.PI*2);
      }
      
      // ── HAVUZ (geometrik - nehir kenarı) ──
      placeModel('platform_stone', 22, 0, -15, 1.5, 0);
      placeModel('pot_large', 20, 0, -13, 1.2, 0);
      placeModel('pot_large', 24, 0, -13, 1.2, Math.PI*0.5);
      placeModel('lily_large', 22, 0, -15, 1.0, 0);
      placeModel('lily_small', 20, 0, -16, 0.9, Math.random()*Math.PI);

      // ── UZAK DAĞLAR - gerçekçi katmanlı ──
      const mountainColors = [0x5a7040, 0x4a6030, 0x6a8050, 0x3d5228];
      for (let i = 0; i < 16; i++) {
        const h = 22 + Math.random()*18;
        const r = 20 + Math.random()*16;
        const sides = 5 + Math.floor(Math.random()*3);
        const col = mountainColors[i%4];
        const mountain = new THREE.Mesh(
          new THREE.ConeGeometry(r, h, sides),
          new THREE.MeshStandardMaterial({color:col, flatShading:true, roughness:0.9})
        );
        const angle = (i/16)*Math.PI*2 + Math.random()*0.4;
        const dist = 110 + Math.random()*30;
        mountain.position.set(Math.cos(angle)*dist, h/2-5, Math.sin(angle)*dist);
        scene.add(mountain);
        // Kar tepesi
        const snowR = r * 0.28;
        const snowH = h * 0.22;
        const snow = new THREE.Mesh(
          new THREE.ConeGeometry(snowR, snowH, sides),
          new THREE.MeshStandardMaterial({color:0xf5f5f5, roughness:0.4})
        );
        snow.position.copy(mountain.position);
        snow.position.y += h/2 - snowH*0.3;
        scene.add(snow);
        // Dağ önü sis efekti (yoğun ağaç)
        if (dist < 130 && Math.random() > 0.5) {
          for (let t = 0; t < 4; t++) {
            const treeNames = ['tree_pineRoundA','tree_pineTallA','tree_cone','tree_blocks'];
            const tn = treeNames[Math.floor(Math.random()*treeNames.length)];
            const tx = mountain.position.x + (Math.random()-0.5)*r*0.8;
            const tz = mountain.position.z + (Math.random()-0.5)*r*0.8;
            placeModel(tn, tx, 0, tz, 1.0+Math.random()*0.8, Math.random()*Math.PI*2);
          }
        }
      }

      // ── GÜNEŞ ──
      const sunSphere = new THREE.Mesh(
        new THREE.SphereGeometry(4, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfffacd })
      );
      sunSphere.position.set(80, 90, -120);
      scene.add(sunSphere);
      // Güneş etrafı halo
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(6, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.25 })
      );
      halo.position.copy(sunSphere.position);
      scene.add(halo);
      
      // ── BULUTLAR - Büyük ve katmanlı ──
      for (let i = 0; i < 20; i++) {
        const cloud = new THREE.Group();
        const cloudCount = 5 + Math.floor(Math.random() * 5);
        for (let j = 0; j < cloudCount; j++) {
          const r = 2.5 + Math.random() * 3.5;
          const s = new THREE.Mesh(
            new THREE.SphereGeometry(r, 8, 6),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })
          );
          s.position.set(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 8
          );
          cloud.add(s);
        }
        cloud.position.set(
          Math.random() * 220 - 110,
          28 + Math.random() * 25,
          Math.random() * 220 - 110
        );
        cloud.scale.set(1.0 + Math.random() * 0.8, 0.7, 1.0 + Math.random() * 0.5);
        scene.add(cloud);
      }

      // ── KELEBEKLER ──
      window.butterflies = [];
      for (let i = 0; i < 12; i++) {
        const bg = new THREE.Group();
        const wMat = new THREE.MeshBasicMaterial({color: new THREE.Color().setHSL(Math.random(),0.8,0.65), side:THREE.DoubleSide});
        const lw = new THREE.Mesh(new THREE.CircleGeometry(0.15,6), wMat); lw.position.x=-0.1; bg.add(lw);
        const rw = new THREE.Mesh(new THREE.CircleGeometry(0.15,6), wMat); rw.position.x= 0.1; bg.add(rw);
        bg.position.set(Math.random()*50-25, 1.5+Math.random()*2, Math.random()*50-25);
        bg.userData = {speed:0.02+Math.random()*0.03, wingSpeed:5+Math.random()*5, path:Math.random()*Math.PI*2};
        scene.add(bg); window.butterflies.push(bg);
      }

      // ── KUŞLAR ──
      // ══════════════════════════════════════════
      // ✈️ UÇAK + PANKART - "Seni çok seviyorum"
      // ══════════════════════════════════════════
      const airplaneGroup = new THREE.Group();
      
      // Gövde
      const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3, metalness: 0.4 });
      const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 5, 10), fuselageMat);
      fuselage.rotation.z = Math.PI/2; airplaneGroup.add(fuselage);
      // Burun
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 10), fuselageMat);
      nose.rotation.z = -Math.PI/2; nose.position.x = 3.1; airplaneGroup.add(nose);
      // Kuyruk
      const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.8), fuselageMat);
      tailFin.position.set(-2.2, 0.5, 0); airplaneGroup.add(tailFin);
      const tailH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 2.2), fuselageMat);
      tailH.position.set(-2.3, 0, 0); airplaneGroup.add(tailH);
      // Ana kanatlar
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.3, metalness: 0.5 });
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 5.5), wingMat);
      wingL.position.set(0.2, -0.1, 0); airplaneGroup.add(wingL);
      // Motor
      const engineMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.6 });
      [-1.5, 1.5].forEach(ez => {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.7, 8), engineMat);
        eng.rotation.z = Math.PI/2; eng.position.set(0.5, -0.3, ez); airplaneGroup.add(eng);
        const prop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.06), engineMat);
        prop.position.set(0.9, -0.3, ez); prop.userData.isProp = true; airplaneGroup.add(prop);
      });
      // Pencereler
      const winMat = new THREE.MeshBasicMaterial({ color: 0xa8d8f0, transparent: true, opacity: 0.8 });
      for (let i = 0; i < 4; i++) {
        const w = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.18), winMat);
        w.position.set(0.37, 0.12, -1.2 + i * 0.7); airplaneGroup.add(w);
      }
      
      // Pankart ipi
      const bannerRopeMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
      const bannerRope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 12, 4), bannerRopeMat);
      bannerRope.rotation.z = Math.PI/2; bannerRope.position.x = -9; airplaneGroup.add(bannerRope);
      
      // Pankart canvas texture — yazı ters çizilir çünkü pano arkadan görünüyor
      const bannerCanvas = document.createElement('canvas');
      bannerCanvas.width = 2048; bannerCanvas.height = 384;
      const bCtx = bannerCanvas.getContext('2d');
      // Arka plan
      bCtx.fillStyle = '#fffef0';
      bCtx.fillRect(0, 0, 2048, 384);
      // Kenarlık
      bCtx.strokeStyle = '#ff1493'; bCtx.lineWidth = 18;
      bCtx.strokeRect(9, 9, 2030, 366);
      bCtx.strokeStyle = '#ffd700'; bCtx.lineWidth = 7;
      bCtx.strokeRect(24, 24, 2000, 336);
      // Yazıyı aynalı çiz → mesh döndürülmeden doğru okunur
      bCtx.save();
      bCtx.translate(2048, 0);
      bCtx.scale(-1, 1);
      bCtx.fillStyle = 'rgba(220,0,100,0.18)';
      bCtx.font = 'bold 155px serif'; bCtx.textAlign = 'center';
      bCtx.fillText('💕 Seni Çok Seviyorum 💕', 1028, 242);
      bCtx.fillStyle = '#cc0055';
      bCtx.fillText('💕 Seni Çok Seviyorum 💕', 1024, 238);
      bCtx.restore();
      
      const bannerTex = new THREE.CanvasTexture(bannerCanvas);
      const bannerMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 3.2),
        new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide, transparent: true })
      );
      bannerMesh.position.x = -18;
      bannerMesh.rotation.y = Math.PI; // Aynalı canvas + aynalı mesh = düzgün yazı ✓
      airplaneGroup.add(bannerMesh);
      
      airplaneGroup.position.set(-80, 55, -30);
      scene.add(airplaneGroup);
      window.airplane = airplaneGroup;
      window.airplaneAngle = 0;
      window.airplaneProps = airplaneGroup.children.filter(c => c.userData.isProp);

      window.birds = [];
      for (let i = 0; i < 8; i++) {
        const bg = new THREE.Group();
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.1,0.3,4), new THREE.MeshBasicMaterial({color:0x444444}));
        body.rotation.x = Math.PI/2; bg.add(body);
        bg.position.set(Math.random()*100-50, 12+Math.random()*15, Math.random()*100-50);
        bg.userData = {speed:0.05+Math.random()*0.05, angle:Math.random()*Math.PI*2, radius:30+Math.random()*20};
        scene.add(bg); window.birds.push(bg);
      }


      // ══════════════════════════════════════════
      // 🌊 ŞELALE - Nehir kaynağı kuzeyde
      // ══════════════════════════════════════════
      const waterfallGroup = new THREE.Group();
      waterfallGroup.position.set(33, 0, -48);
      
      // Kaya katmanları
      const wRock = new THREE.MeshStandardMaterial({ color: 0x7a6855, roughness: 0.9 });
      const wRock2 = new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 0.85 });
      // Ana kaya bloğu
      const wBase = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 6), wRock);
      wBase.position.set(0, 4, 0); wBase.castShadow = true; waterfallGroup.add(wBase);
      // Katmanlı kayalar
      [[- 4,1.5,1.5,3,3],[4,1.0,1.2,3,2.5],[0,0.8,1.8,10,1.5],[-3,2,1.2,4,4],[3,2.5,1.0,3.5,5]].forEach(([x,z2,s,w2,h2]) => {
        const r = new THREE.Mesh(new THREE.BoxGeometry(w2,h2,s*2), Math.random()>0.5?wRock:wRock2);
        r.position.set(x, h2/2, z2); r.castShadow=true; waterfallGroup.add(r);
      });
      // Su akışı (katmanlı şeffaf paneller)
      const wWaterMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7, roughness: 0.05, metalness:0.1 });
      for (let i = 0; i < 5; i++) {
        const wPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7 - i*0.3), wWaterMat);
        wPanel.position.set(-2.5 + i*1.1, 4.5 - i*0.15, 1.8);
        waterfallGroup.add(wPanel);
        wPanel.userData.isWaterfall = true;
        wPanel.userData.offset = i * 0.4;
      }
      // Havuz dibinde su
      const poolMat = new THREE.MeshStandardMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.8, roughness: 0.05 });
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.3, 16), poolMat);
      pool.position.set(0, 0.15, 5); waterfallGroup.add(pool);
      // Su kabarcıkları (küçük küreler)
      window.waterfallBubbles = [];
      for (let i = 0; i < 20; i++) {
        const bub = new THREE.Mesh(new THREE.SphereGeometry(0.08 + Math.random()*0.12, 5, 5),
          new THREE.MeshBasicMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.6 }));
        bub.position.set((Math.random()-0.5)*7, 8 + Math.random()*1.5, 1.5 + Math.random()*0.5);
        bub.userData = { vy: -0.04 - Math.random()*0.06, startY: 8 + Math.random()*1.5, vx: (Math.random()-0.5)*0.02 };
        waterfallGroup.add(bub); window.waterfallBubbles.push(bub);
      }
      // Etraf kayaları
      [[6,0,4],[7,0,2],[-6,0,3],[-7,0,1],[4,0,7],[- 4,0,7]].forEach(([rx,ry,rz]) => {
        placeModel(['cliff_rock','rock_largeA','rock_largeB','cliff_stone'][Math.floor(Math.random()*4)], 33+rx, ry, -48+rz, 0.8+Math.random()*0.5, Math.random()*Math.PI*2);
      });
      // Çevre bitkileri
      for (let i = 0; i < 6; i++) {
        placeModel('plant_bush', 33+(Math.random()-0.5)*14, 0, -48+(Math.random()-0.5)*10+6, 0.9, Math.random()*Math.PI*2);
      }
      scene.add(waterfallGroup);
      window.waterfallGroup = waterfallGroup;
      
      // Şelale nokta ışığı (su mavisi)
      const wLight = new THREE.PointLight(0x29b6f6, 0.8, 20);
      wLight.position.set(33, 3, -43); scene.add(wLight);

      // ══════════════════════════════════════════
      // 🏮 UÇAN FENERLER - Nehir kıyısı boyunca
      // ══════════════════════════════════════════
      window.lanterns = [];
      const lanternPositions = [
        [10, -10], [15, -25], [5, -35], [-5, -20], [-12, -30],
        [20, 5], [8, -45], [-8, -10], [18, -40], [-3, -5],
        [25, -15], [12, 15], [-15, -5], [22, -50]
      ];
      lanternPositions.forEach(([lx, lz], i) => {
        const lg = new THREE.Group();
        // Fenerin gövdesi (kağıt kutu)
        const lBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.55, 0.4),
          new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.08 + i*0.03, 0.9, 0.7), transparent: true, opacity: 0.85 })
        );
        lg.add(lBody);
        // İç ışık (glowing core)
        const lCore = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.35, 0.22),
          new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.95 }));
        lg.add(lCore);
        // Üst ve alt çerçeve
        [-0.27, 0.27].forEach(dy => {
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.44),
            new THREE.MeshBasicMaterial({ color: 0x8b4513 }));
          frame.position.y = dy; lg.add(frame);
        });
        // Işık efekti
        const lPt = new THREE.PointLight(new THREE.Color().setHSL(0.08 + i*0.03, 1, 0.7), 0.5, 6);
        lg.add(lPt);
        
        lg.position.set(lx, 3 + Math.random()*4, lz);
        lg.userData = {
          baseX: lx, baseZ: lz,
          startY: 3 + Math.random()*4,
          riseSpeed: 0.003 + Math.random()*0.003,
          swaySpeed: 0.001 + Math.random()*0.002,
          swayAmt: 0.3 + Math.random()*0.4,
          swayOffset: Math.random()*Math.PI*2,
          maxY: 18 + Math.random()*10
        };
        scene.add(lg); window.lanterns.push(lg);
      });

      // ══════════════════════════════════════════
      // 🌳 DİLEK AĞACI - Nehir yakınında, yalnız ve büyük
      // ══════════════════════════════════════════
      const wishTreeGroup = new THREE.Group();
      wishTreeGroup.position.set(-20, 0, -15);
      
      // Gövde - büyük ve kıvrımlı
      const wtBark = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
      const wtTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 5, 10), wtBark);
      wtTrunk.position.y = 2.5; wishTreeGroup.add(wtTrunk);
      // Eğimli gövde dalları
      [[0.4,3.5,0.25,0.15,2.5,0.3,-0.4],[- 0.35,3.5,-0.25,0.12,2,0.25,0.4]].forEach(([bx,by,bz,r1,h,r2,rot]) => {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,8), wtBark);
        branch.position.set(bx+bx*1.2, by, bz+bz*1.2);
        branch.rotation.z = rot; wishTreeGroup.add(branch);
      });
      // Yaprak kümeleri - mor/pembe çiçekli (dilek ağacı özel)
      const wtLeafMats = [
        new THREE.MeshStandardMaterial({ color: 0x7b2d8b, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.8 }),
      ];
      [[0,6,0,2.8],[1.5,5.5,0.8,1.8],[-1.5,5.5,-0.8,1.8],[0.8,7,0.5,1.5],[-0.8,7,-0.5,1.5],[0,8,0,1.2]].forEach(([x,y,z,r],i) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), wtLeafMats[i%3]);
        leaf.position.set(x,y,z); leaf.castShadow=true; wishTreeGroup.add(leaf);
      });
      // Ağaçtan sarkan iplikler (dilek bağlama)
      const ribbonColors = [0xff1493, 0xffd700, 0xff6347, 0x9b59b6, 0x00bcd4, 0xff69b4];
      for (let i = 0; i < 10; i++) {
        const angle = (i/10)*Math.PI*2;
        const r = 1 + Math.random()*1.5;
        const ribbon = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.8 + Math.random()*0.8, 0.04),
          new THREE.MeshStandardMaterial({ color: ribbonColors[i%ribbonColors.length] })
        );
        ribbon.position.set(Math.cos(angle)*r, 4.8 + Math.random()*0.5, Math.sin(angle)*r);
        ribbon.rotation.z = (Math.random()-0.5)*0.3;
        ribbon.userData.isRibbon = true;
        ribbon.userData.sway = Math.random()*Math.PI*2;
        wishTreeGroup.add(ribbon);
      }
      // Tabela
      const signMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.7, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x8b5e3c })
      );
      signMesh.position.set(0, 1.2, 0.8); wishTreeGroup.add(signMesh);
      
      scene.add(wishTreeGroup);
      window.wishTreePos = new THREE.Vector3(-20, 0, -15);
      window.wishTreeGroup = wishTreeGroup;
      
      // Işık
      const wtLight = new THREE.PointLight(0xd4a0ff, 0.6, 12);
      wtLight.position.set(-20, 5, -15); scene.add(wtLight);
      
      // Etraf çiçekleri
      for (let i = 0; i < 16; i++) {
        const a = (i/16)*Math.PI*2;
        placeModel(flowers[Math.floor(Math.random()*flowers.length)], -20+Math.cos(a)*4, 0, -15+Math.sin(a)*4, 1.2, a);
      }

      // ══════════════════════════════════════════
      // 🧺 PİKNİK ALANI - Açık alanda, güneşli köşe
      // ══════════════════════════════════════════
      const picnicGroup = new THREE.Group();
      picnicGroup.position.set(-35, 0, -5);
      
      // Battaniye (renkli kumaş)
      const blanketMat = new THREE.MeshStandardMaterial({ color: 0xff6b9d, roughness: 0.95 });
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(4, 0.06, 3), blanketMat);
      blanket.position.y = 0.03; picnicGroup.add(blanket);
      // Battaniye deseni (üst şeritler)
      const stripeColors = [0xffd700, 0xff1493, 0xffffff];
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(4, 0.07, 0.3),
          new THREE.MeshStandardMaterial({ color: stripeColors[i] }));
        stripe.position.set(0, 0.04, -0.9 + i*0.9); picnicGroup.add(stripe);
      }
      // Sepet
      const basketMat = new THREE.MeshStandardMaterial({ color: 0xc8a46e, roughness: 0.9 });
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.5, 10), basketMat);
      basket.position.set(1.6, 0.35, 1); picnicGroup.add(basket);
      const basketLid = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 4, 0, Math.PI*2, 0, Math.PI/2), basketMat);
      basketLid.position.set(1.6, 0.6, 1); picnicGroup.add(basketLid);
      // Sandviç (kutu)
      const foodMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3 });
      const sandwich = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.25), foodMat);
      sandwich.position.set(0.5, 0.1, 0.8); picnicGroup.add(sandwich);
      // Elma (kırmızı küre)
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 7),
        new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.4 }));
      apple.position.set(-0.3, 0.12, 0.7); picnicGroup.add(apple);
      // Bardaklar
      [[-0.6, 0.15, -0.5],[0.3, 0.15, -0.5]].forEach(([cx,cy,cz]) => {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xff69b4, transparent: true, opacity: 0.75 }));
        cup.position.set(cx, cy, cz); picnicGroup.add(cup);
      });
      // Çiçek buketi battaniyede
      for (let i = 0; i < 4; i++) {
        const pf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6),
          new THREE.MeshStandardMaterial({ color: [0xff1493,0xffd700,0xff69b4,0x9b59b6][i] }));
        pf.position.set(-1.2 + i*0.2, 0.2 + Math.random()*0.1, -0.8 + Math.random()*0.2); picnicGroup.add(pf);
        const ps = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x2d6e1f }));
        ps.position.set(-1.2 + i*0.2, 0.08, -0.8 + Math.random()*0.2); picnicGroup.add(ps);
      }
      scene.add(picnicGroup);
      // Etraf ağaçları (gölge)
      placeModel('tree_oak', -40, 0, -8, 1.3, 0.3);
      placeModel('tree_detailed', -32, 0, -10, 1.1, 1.0);
      // Çiçek çemberi
      for (let i = 0; i < 10; i++) {
        const a = (i/10)*Math.PI*2;
        placeModel(flowers[Math.floor(Math.random()*flowers.length)], -35+Math.cos(a)*6, 0, -5+Math.sin(a)*6, 1.1, a);
      }

      // ══════════════════════════════════════════
      // 🌿 SALINCAK - İki büyük ağaç arasında
      // ══════════════════════════════════════════
      const swingGroup = new THREE.Group();
      swingGroup.position.set(-8, 0, -38);
      
      // Sol ağaç gövdesi
      const swTreeMat = new THREE.MeshStandardMaterial({ color: 0x4a2e0a, roughness: 0.9 });
      const swLeafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a1f, roughness: 0.8 });
      [-4, 4].forEach((tx, i) => {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 7, 8), swTreeMat);
        trunk.position.set(tx, 3.5, 0); swingGroup.add(trunk);
        // Yapraklar
        [[0,7.5,0,2.2],[tx>0?1:-1,7,0.5,1.5],[0,8.5,0,1.5]].forEach(([lx,ly,lz,lr]) => {
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr, 8, 6), swLeafMat);
          leaf.position.set(tx+lx, ly, lz); leaf.castShadow=true; swingGroup.add(leaf);
        });
      });
      // Yatay kiriş (iki ağaç arası)
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 6), swTreeMat);
      beam.rotation.z = Math.PI/2; beam.position.set(0, 7, 0); swingGroup.add(beam);
      // İpler
      const ropeMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a, roughness: 0.9 });
      [-0.6, 0.6].forEach(rx => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 5), ropeMat);
        rope.position.set(rx, 5.25, 0); swingGroup.add(rope);
      });
      // Tahta koltuk
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), seatMat);
      seat.position.set(0, 3.5, 0); swingGroup.add(seat);
      // Koltuk kenar çubukları
      [-0.72, 0.72].forEach(rx => {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.55), seatMat);
        bar.position.set(rx, 3.5, 0); swingGroup.add(bar);
      });
      
      // Salınan grup (ipler + koltuk)
      const swingPivot = new THREE.Group();
      swingPivot.position.set(0, 7, 0);
      scene.add(swingGroup);
      window.swingGroup = swingGroup;
      window.swingAngle = 0;
      window.swingSeat = seat;
      window.swingRopes = swingGroup.children.filter(c => c.geometry && c.geometry.type === 'CylinderGeometry' && c.position.y < 6.5 && c.position.y > 4);
      
      // Etraf çiçekleri
      for (let i = 0; i < 12; i++) {
        const a = (i/12)*Math.PI*2;
        placeModel(flowers[Math.floor(Math.random()*flowers.length)], -8+Math.cos(a)*7, 0, -38+Math.sin(a)*7, 1.0, a);
      }
      placeModel('plant_bushDetailed', -13, 0, -38, 1.1, 0);
      placeModel('plant_bushDetailed', -3, 0, -38, 1.1, 0);

      // ══════════════════════════════════════════
      // 🧍 NPC'LER - Geometrik karakterler
      // ══════════════════════════════════════════
      window.npcs = [];
      
      function createNPC(x, z, config) {
        const g = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: config.skin || 0xf4a460, roughness: 0.8 });
        const bodyMat = new THREE.MeshStandardMaterial({ color: config.bodyColor, roughness: 0.7 });
        const pantMat = new THREE.MeshStandardMaterial({ color: config.pantColor || 0x2c3e50, roughness: 0.7 });
        const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor || 0x2c1810, roughness: 0.9 });
        
        // Kafa
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
        head.position.y = 1.75; head.castShadow = true; g.add(head);
        // Saç
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.44), hairMat);
        hair.position.set(0, 1.98, -0.02); g.add(hair);
        // Gövde
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.6, 0.28), bodyMat);
        body.position.y = 1.18; body.castShadow = true; g.add(body);
        // Sol kol
        const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), bodyMat);
        lArm.position.set(-0.37, 1.18, 0); g.add(lArm);
        // Sağ kol
        const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), bodyMat);
        rArm.position.set(0.37, 1.18, 0); g.add(rArm);
        // Sol bacak
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), pantMat);
        lLeg.position.set(-0.15, 0.58, 0); g.add(lLeg);
        // Sağ bacak
        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.22), pantMat);
        rLeg.position.set(0.15, 0.58, 0); g.add(rLeg);
        
        // Yüz detayları
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
        [-0.1, 0.1].forEach(ex => {
          const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), eyeMat);
          eye.position.set(ex, 1.77, 0.22); g.add(eye);
        });
        // Gülümseyen ağız
        const smileMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
        const smile = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.05), smileMat);
        smile.position.set(0, 1.66, 0.22); g.add(smile);
        
        g.position.set(x, 0, z);
        g.userData = {
          ...config,
          lArm, rArm, lLeg, rLeg, head,
          walkCycle: Math.random()*Math.PI*2,
          isNPC: true,
          dialogShown: false
        };
        
        scene.add(g);
        window.npcs.push(g);
        return g;
      }
      
      // NPC 1: Müze bekçisi - müze önünde bekliyor
      const guard = createNPC(18, 22, {
        name: 'Bekçi Mehmet',
        dialog: '🎩 Merhaba! Burası Aşkınızın Müzesi. Müzeye girmek için kapıda sana özel bir soru sorulacak... Kolay gelsin! 😊',
        skin: 0xd4a574,
        bodyColor: 0x1a237e,
        pantColor: 0x0d47a1,
        hairColor: 0x1a1a1a,
        type: 'patrol',
        patrolPoints: [[18,22],[14,26],[10,21],[14,18],[18,22]],
        patrolIndex: 0, patrolT: 0
      });
      
      // NPC 2: Bahçıvan - bahçede dolaşıyor
      const gardener = createNPC(-28, 5, {
        name: 'Bahçıvan Ali',
        dialog: '🌺 Günaydın! Bu bahçeyi yıllardır bakıyorum. En güzel çiçekleri sizin için yetiştirdim. Şelalenin yanındaki mor çiçeklere mutlaka bakın! 🌸',
        skin: 0xc8a882,
        bodyColor: 0x388e3c,
        pantColor: 0x4e342e,
        hairColor: 0x3e2723,
        type: 'patrol',
        patrolPoints: [[-28,5], [-20,8], [-15,2], [-22,-5], [-30,-3], [-28,5]],
        patrolIndex: 0, patrolT: 0
      });
      
      // NPC 3: Aşık çift - piknik alanı yanında (idle_sway - yürümüyor)
      const romantic1 = createNPC(-38, -2, {
        name: 'Romantik Çift ❤️',
        dialog: '💕 Ne kadar güzel bir yer burası değil mi? Biz de ilk yıl dönümümüzde geldik. Siz de mi ilk kez buradasınız?',
        skin: 0xfdbcb4,
        bodyColor: 0xf06292,
        pantColor: 0xad1457,
        hairColor: 0x4a148c,
        type: 'idle_sway'
      });
      romantic1.rotation.y = Math.PI*0.2;
      
      const romantic2 = createNPC(-40, -3, {
        name: 'Romantik Çift ❤️',
        dialog: '💑 Biz burada saatlerce oturup nehri izledik. Dilek ağacına da gittik — dileğimiz gerçekleşti! 🌳✨',
        skin: 0xd4a574,
        bodyColor: 0x1565c0,
        pantColor: 0x0d47a1,
        hairColor: 0x1a1a1a,
        type: 'idle_sway'
      });
      romantic2.rotation.y = -Math.PI*0.3;
      
      // NPC 4: Şair - Dilek ağacı çevresinde dolaşıyor
      const poet = createNPC(-22, -18, {
        name: 'Şair Baba',
        dialog: '📜 "Sevgi bir ağaçtır,\nkökleri kalpte,\ndallari gökte...\nSen benim baharımsın." \n\n— Sana özel yazdım 🌸',
        skin: 0xc8a882,
        bodyColor: 0x6d4c41,
        pantColor: 0x3e2723,
        hairColor: 0x757575,
        type: 'patrol',
        patrolPoints: [[-22,-18],[-17,-15],[-16,-20],[-20,-24],[-24,-22],[-22,-18]],
        patrolIndex: 0, patrolT: 0
      });
      
      // NPC 5: Balıkçı - Nehir boyunca dolaşıyor
      const fisherman = createNPC(26, -20, {
        name: 'Balıkçı Dede',
        dialog: '🎣 50 yıldır bu nehirde balık tutarım. Ama en güzel avım karımı buraya getirdiğim gün oldu. Siz de değerli anlar geçirin! 🐟',
        skin: 0xb07850,
        bodyColor: 0x546e7a,
        pantColor: 0x37474f,
        hairColor: 0xf5f5f5,
        type: 'patrol',
        patrolPoints: [[26,-20],[26,-35],[26,-48],[26,-35],[26,-20],[26,-10],[26,-20]],
        patrolIndex: 0, patrolT: 0
      });
      
      // NPC 6: Fotoğrafçı - avenu boyunca dolaşıyor
      const photographer = createNPC(3, 50, {
        name: 'Fotoğrafçı Zeynep',
        dialog: '📸 Dur dur dur! Tam burada durun — arka plan müthiş! Bu müzenin her köşesi fotoğraf karesine giriyor. Keşke sizi çekebilseydim! 😄',
        skin: 0xf4c2a1,
        bodyColor: 0xce93d8,
        pantColor: 0x7b1fa2,
        hairColor: 0x1a1a1a,
        type: 'patrol',
        patrolPoints: [[3,50],[6,44],[3,38],[-4,44],[3,50]],
        patrolIndex: 0, patrolT: 0
      });

      // ══════════════════════════════════════════
      // MÜZE BİNASI - GERÇEKÇİ NEOKLASİK YAPI
