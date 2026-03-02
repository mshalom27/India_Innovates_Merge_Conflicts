/* ============================================================
   AURA-GRID – home.js: Animations, Interactions, Simulated Data
   ============================================================ */

/* ── Navbar scroll effect ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
  // Update active nav link
  const sections = ['hero','problem','pillars','flows','tech','faq'];
  const links = document.querySelectorAll('.nav-links a');
  let currentSection = 'hero';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 200) currentSection = id;
  });
  links.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${currentSection}`);
  });
});

/* ── Stat Counter Animation ── */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  let start = 0;
  const duration = 1800;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-value[data-target]').forEach(el => counterObserver.observe(el));

/* ── Fade-in on scroll for cards ── */
const fadeEls = document.querySelectorAll('.pillar-card, .problem-card, .faq-card, .flow-step, .fd-node');
const fadeObs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => {
        e.target.style.opacity = '1';
        e.target.style.transform = e.target.style.transform.replace('translateY(20px)', 'translateY(0)');
      }, 60 * i);
      fadeObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
fadeEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = (el.style.transform || '') + ' translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  fadeObs.observe(el);
});

/* ── Intersection Hero Animation ── */
const ambulance = document.getElementById('hero-ambulance');
if (ambulance) {
  let phase = 0; // 0=moving right, 1=at center, 2=clear
  let pos = { x: 0, y: 140 };
  let targetX = 300;
  let speed = 1.5;

  // Traffic light elements (N/S/E/W)
  const lights = {
    n: { r: document.getElementById('tl-n-r'), a: document.getElementById('tl-n-a'), g: document.getElementById('tl-n-g') },
    s: { r: document.getElementById('tl-s-r'), a: document.getElementById('tl-s-a'), g: document.getElementById('tl-s-g') },
    e: { r: document.getElementById('tl-e-r'), a: document.getElementById('tl-e-a'), g: document.getElementById('tl-e-g') },
    w: { r: document.getElementById('tl-w-r'), a: document.getElementById('tl-w-a'), g: document.getElementById('tl-w-g') },
  };

  function setLight(dir, state) {
    const l = lights[dir];
    if (!l) return;
    Object.values(l).forEach(el => el && el.classList.remove('active-red','active-amber','active-green'));
    if (state === 'red')   l.r && l.r.classList.add('active-red');
    if (state === 'amber') l.a && l.a.classList.add('active-amber');
    if (state === 'green') l.g && l.g.classList.add('active-green');
  }

  setLight('n','red'); setLight('s','red');
  setLight('e','green'); setLight('w','green');

  let animFrame;
  let cycleTime = 0;

  function runAmbulance() {
    if (!ambulance) return;
    ambulance.style.left = pos.x + 'px';
    ambulance.style.top  = pos.y + 'px';

    pos.x += speed;

    // Approaching center
    if (pos.x >= 100 && pos.x < 110) {
      // Safety buffer: yellow
      setLight('n','amber'); setLight('s','amber');
    }
    if (pos.x >= 120 && pos.x < 125) {
      setLight('n','red'); setLight('s','red');
      setLight('e','red'); setLight('w','red');
    }
    if (pos.x >= 135) {
      setLight('e','green'); setLight('w','green');
    }

    if (pos.x > 290) {
      pos.x = 0;
      setLight('n','red'); setLight('s','red');
      setLight('e','green'); setLight('w','green');
    }
    animFrame = requestAnimationFrame(runAmbulance);
  }
  runAmbulance();

  // Pulse detect badge
  const badge = document.getElementById('detect-badge');
  if (badge) {
    setInterval(() => {
      badge.style.opacity = badge.style.opacity === '0.3' ? '1' : '0.3';
    }, 800);
  }
}

/* ── Flow Tabs ── */
function showFlow(index, btn) {
  document.querySelectorAll('.flow-panel').forEach((p, i) => {
    p.classList.toggle('active', i === index);
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

/* ── FAQ Toggle ── */
function toggleFaq(card) {
  const isOpen = card.classList.contains('open');
  document.querySelectorAll('.faq-card').forEach(c => c.classList.remove('open'));
  if (!isOpen) card.classList.add('open');
}

/* ── Progress bar animate on scroll ── */
const progressObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const fills = e.target.querySelectorAll('.progress-fill[data-width]');
      fills.forEach(f => {
        f.style.width = f.dataset.width;
      });
      progressObs.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.progress-bar').forEach(b => progressObs.observe(b));

/* ── Live "typing" effect for mono texts ── */
function typeText(el, text, speed = 60) {
  let i = 0;
  el.textContent = '';
  const t = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) clearInterval(t);
  }, speed);
}

/* ── Smooth scroll for nav links ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ── Auto-cycle flow tabs for demo ── */
let flowIndex = 0;
setInterval(() => {
  // Only auto-cycle if no tab has been manually clicked recently
  if (document.hidden) return;
  // Don't auto-cycle - user controls it
}, 5000);

/* ── Console Easter Egg ── */
console.log('%c⬡ AURA-GRID / FLOW-AI', 'font-size:20px;font-weight:900;color:#00f5ff;');
console.log('%cAI-Powered Traffic Management — Prototype v1.0', 'color:#94a3b8;');
console.log('%cBuilt for Smart City Innovation Challenge 2026 🚦', 'color:#00ff9d;');
