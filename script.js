// --- 1. UTILS: TEXT SCRAMBLE ---
class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.update = this.update.bind(this);
    }

    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];

        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }

        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }

    update() {
        let output = '';
        let complete = 0;

        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span class="dud">${char}</span>`;
            } else {
                output += from;
            }
        }

        this.el.innerHTML = output;

        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }

    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

// Scramble Effect to Elements
const phrases = document.querySelectorAll('.scramble-text');
phrases.forEach(el => {
    const fx = new TextScramble(el);
    let counter = 0;

    // Trigger on intersection
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !el.classList.contains('scrambled-done')) {
                // Use the data-text attribute or current text
                const text = el.getAttribute('data-text') || el.innerText;
                fx.setText(text);
                el.classList.add('scrambled-done');
            }
        });
    });
    observer.observe(el);

    // Hover effect for links
    if (el.classList.contains('scramble-hover')) {
        el.addEventListener('mouseenter', () => fx.setText(el.getAttribute('data-text') || el.innerText));
    }
});


// --- 2. THREE.JS ENGINE (ROTATING PARTICLES + BLOOM) ---
const initThreeJS = () => {
    const canvas = document.querySelector('#bg-canvas');
    const scene = new THREE.Scene();
    // Subtle fog to hide distance
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 3; // Initial zoom

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // --- PARTICLE FIELD ---
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 4000; // High count for premium feel

    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        // Spread particles in a large sphere/cloud
        posArray[i] = (Math.random() - 0.5) * 15;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Material
    const material = new THREE.PointsMaterial({
        size: 0.008, // Slightly larger for bloom
        color: 0x00f2ff, // Neon Cyan
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, material);
    scene.add(particlesMesh);

    // --- POST PROCESSING (BLOOM) ---
    const renderScene = new THREE.RenderPass(scene, camera);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.1;
    bloomPass.strength = 1.5; // High glow intensity
    bloomPass.radius = 0.5;

    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- MOUSE INTERACTION ---
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates -0.5 to 0.5
        mouseX = event.clientX / window.innerWidth - 0.5;
        mouseY = event.clientY / window.innerHeight - 0.5;
    });

    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
        const elapsedTime = clock.getElapsedTime();

        // 1. Constant minimal rotation
        particlesMesh.rotation.y = elapsedTime * 0.05;
        particlesMesh.rotation.x = elapsedTime * 0.02;

        // 2. Mouse influence (Parallax/Tilt)
        particlesMesh.rotation.y += mouseX * 0.1;
        particlesMesh.rotation.x += mouseY * 0.1;

        // 3. Gentle breathing/pulse of camera
        camera.position.z = 3 + Math.sin(elapsedTime * 0.5) * 0.2;

        // Render via Composer (for Bloom)
        composer.render();
        requestAnimationFrame(animate);
    }

    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Start 3D Engine
initThreeJS();

// --- 3. CURSOR LOGIC ---
const cursorDot = document.querySelector('.cursor-dot');
const cursorRing = document.querySelector('.cursor-ring');

window.addEventListener('mousemove', (e) => {
    cursorDot.style.left = `${e.clientX}px`;
    cursorDot.style.top = `${e.clientY}px`;

    // Lag effect for ring
    setTimeout(() => {
        cursorRing.style.left = `${e.clientX}px`;
        cursorRing.style.top = `${e.clientY}px`;
    }, 50);
});

// Cursor active state
document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursorRing.style.transform = 'scale(1.5) rotate(45deg)';
        cursorRing.style.borderColor = '#bc13fe'; // Purple active
    });
    el.addEventListener('mouseleave', () => {
        cursorRing.style.transform = 'scale(1) rotate(0deg)';
        cursorRing.style.borderColor = '#00f2ff'; // Cyan default
    });
});

// --- 4. MOBILE MENU TOGGLE ---
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (mobileMenu) {
    // Toggle menu on hamburger click
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });

    // Close menu when clicking on a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !mobileMenu.contains(e.target)) {
            navLinks.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });
}
