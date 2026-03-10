console.log("SCRIPT CHARGÉ !");

// === CONFIGURATION ===
const CONFETTI_COUNT = 50; // Réduit de 100 à 50 pour Safari
const BASE_DURATION_PER_100 = 2000;
const DURATIONS = {
  impot: (95 / 100) * BASE_DURATION_PER_100,
  tva: (205 / 100) * BASE_DURATION_PER_100,
  cotisations: 3000,
};
const RAIN_DURATION = 3000;
const RAIN_BILL_COUNT = 500;

function fmt(n) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// === COMPTEURS ===
function startCounters() {
  console.log("startCounters appelée");
  const els = {
    impot: document.getElementById("impot"),
    tva: document.getElementById("tva"),
    cotis: document.getElementById("cotisations"),
    total: document.getElementById("totalValue"),
  };

  const vals = [95, 205, 500];
  const durations = [DURATIONS.impot, DURATIONS.tva, DURATIONS.cotisations];
  const times = [0, durations[0], durations[0] + durations[1]];
  const totalDuration = durations[0] + durations[1] + durations[2];
  const start = performance.now();

  function animate() {
    const t = performance.now() - start;

    if (t <= durations[0]) {
      const val = (t / durations[0]) * vals[0];
      els.impot.textContent = fmt(val);
    } else {
      els.impot.textContent = fmt(vals[0]);
    }

    if (t > times[1] && t <= times[2]) {
      const val = ((t - times[1]) / durations[1]) * vals[1];
      els.tva.textContent = fmt(val);
    } else if (t > times[2]) {
      els.tva.textContent = fmt(vals[1]);
    }

    if (t > times[2] && t <= totalDuration) {
      const val = ((t - times[2]) / durations[2]) * vals[2];
      els.cotis.textContent = fmt(val);
    } else if (t > totalDuration) {
      els.cotis.textContent = fmt(vals[2]);
    }

    let total = 0;
    if (t <= durations[0]) {
      total = (t / durations[0]) * vals[0];
    } else if (t <= times[2]) {
      total = vals[0] + ((t - times[1]) / durations[1]) * vals[1];
    } else if (t <= totalDuration) {
      total = vals[0] + vals[1] + ((t - times[2]) / durations[2]) * vals[2];
    } else {
      total = vals[0] + vals[1] + vals[2];
    }
    els.total.textContent = fmt(total);

    if (t < totalDuration) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}

// === CONFETTIS ===
function scheduleConfetti() {
  console.log("scheduleConfetti appelée");
  const d1 = DURATIONS.impot;
  const d2 = DURATIONS.tva;
  const d3 = DURATIONS.cotisations;

  setTimeout(() => boom(), d1);
  setTimeout(() => boom(), d1 + d2);
  setTimeout(() => boom(), d1 + d2 + d3);
}

function boom() {
  console.log("BOOM confetti");
  const sources = [
    { x: window.innerWidth * 0.2, y: window.innerHeight + 50 },
    { x: window.innerWidth * 0.4, y: window.innerHeight + 50 },
    { x: window.innerWidth * 0.6, y: window.innerHeight + 50 },
    { x: window.innerWidth * 0.8, y: window.innerHeight + 50 },
  ];

  // Étaler la création sur 50ms pour éviter le freeze Safari
  sources.forEach((src, srcIndex) => {
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      setTimeout(() => {
        const el = document.createElement("div");
        el.className = "money-emoji";
        const emojis = ["💸", "💰", "🇫🇷"];
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left = src.x + "px";
        el.style.top = src.y + "px";
        el.style.willChange = "transform";

        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.5;
        const v = 1000 + Math.random() * 800;
        const vx = Math.cos(a) * v;
        const vy = Math.sin(a) * v;
        const dur = 2.5 + Math.random() * 0.5;
        const g = 600;
        const tx = vx * dur;
        const ty = vy * dur + 0.5 * g * dur * dur;
        const rot = -540 + Math.random() * 1080;

        el.animate(
          [
            { transform: "translate3d(0,0,0) rotate(0deg)", opacity: 1 },
            {
              transform: `translate3d(${tx}px,${ty}px,0) rotate(${rot}deg)`,
              opacity: 0.8,
            },
          ],
          {
            duration: dur * 1000,
            easing: "cubic-bezier(0.25,0.46,0.45,0.94)",
          },
        );

        document.body.appendChild(el);
        setTimeout(() => el.remove(), dur * 1000 + 100);
      }, i * 0.5); // Étaler sur 25ms (50 confettis * 0.5ms)
    }
  });
}

// === PLUIE FINALE ===
function scheduleFinalRain() {
  const totalTime = DURATIONS.impot + DURATIONS.tva + DURATIONS.cotisations;
  const confettiDuration = 3000; // Durée max des confettis (2.5s + 0.5s)
  const delayAfterConfetti = 500; // Délai supplémentaire après les confettis

  console.log(
    "Pluie programmée dans",
    totalTime + confettiDuration + delayAfterConfetti,
    "ms",
  );

  setTimeout(
    () => {
      console.log("DÉCLENCHEMENT PLUIE !");
      for (let i = 0; i < RAIN_BILL_COUNT; i++) {
        setTimeout(
          () => {
            const bill = document.createElement("div");
            bill.style.position = "fixed";
            bill.style.left = Math.random() * window.innerWidth + "px";
            bill.style.top = "-100px";
            bill.style.fontSize = 1.2 + Math.random() * 1 + "rem";
            bill.style.pointerEvents = "none";
            bill.style.zIndex = "10000";
            bill.textContent = "💶";
            bill.style.willChange = "transform, opacity";

            const fallTime = 3000 + Math.random() * 2000;
            const horizontalDrift = (Math.random() - 0.5) * 200;
            const rotationSpeed = (Math.random() - 0.5) * 180;
            const finalY = window.innerHeight + window.innerHeight * 0.2;

            // Animation simplifiée pour Safari
            bill.animate(
              [
                {
                  transform: `translate3d(0px, 0px, 0px) rotate(0deg)`,
                  opacity: 1,
                },
                {
                  transform: `translate3d(${horizontalDrift}px, ${finalY}px, 0px) rotate(${rotationSpeed}deg)`,
                  opacity: 0,
                },
              ],
              {
                duration: fallTime,
                easing: "ease-in",
              },
            );

            document.body.appendChild(bill);
            setTimeout(() => bill.remove(), fallTime + 100);
          },
          (i / RAIN_BILL_COUNT) * RAIN_DURATION,
        );
      }
    },
    totalTime + confettiDuration + delayAfterConfetti,
  );
}

// === DÉMARRAGE ===
window.addEventListener("load", () => {
  console.log("Page chargée, démarrage dans 500ms");
  setTimeout(() => {
    console.log("DÉMARRAGE !");
    startCounters();
    scheduleConfetti();
    scheduleFinalRain();
  }, 1500);
});
