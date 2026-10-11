"use strict";
(() => {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const previous = document.getElementById("prev");
  const next = document.getElementById("next");
  const position = document.getElementById("position");
  let current = 0;
  let replayTimer = null;
  const fromHash = () => {
    const match = location.hash.match(/^#slide-(\d+)$/);
    return match ? Number(match[1]) - 1 : 0;
  };
  function show(index, updateHash = true) {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    const backwards = target < current;
    if (replayTimer !== null) {
      clearInterval(replayTimer);
      replayTimer = null;
      document.getElementById("replay-play").textContent = "Play recorded sequence";
    }
    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === target);
      slide.classList.toggle("backwards", i === target && backwards);
    });
    current = target;
    previous.disabled = target === 0;
    next.disabled = target === slides.length - 1;
    position.textContent = `${target + 1} / ${slides.length}`;
    if (updateHash) history.replaceState(null, "", `#slide-${target + 1}`);
    window.scrollTo({top: 0, behavior: "instant"});
  }
  previous.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));
  document.getElementById("home").addEventListener("click", () => show(0));
  document.getElementById("brand").addEventListener("click", (event) => {
    event.preventDefault();
    show(0);
  });
  window.addEventListener("hashchange", () => show(fromHash(), false));
  document.addEventListener("keydown", (event) => {
    if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.altKey ||
        event.ctrlKey || event.metaKey || event.target.closest(".replay")) return;
    if (event.key === "ArrowRight") {event.preventDefault(); show(current + 1);}
    if (event.key === "ArrowLeft") {event.preventDefault(); show(current - 1);}
    if (event.key === "Home") {event.preventDefault(); show(0);}
  });
  let touch = null;
  document.getElementById("deck").addEventListener("touchstart", (event) => {
    if (event.target.closest("pre,.table-scroll,a,button")) {touch = null; return;}
    touch = {x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY};
  }, {passive: true});
  document.getElementById("deck").addEventListener("touchend", (event) => {
    if (!touch) return;
    const dx = event.changedTouches[0].clientX - touch.x;
    const dy = event.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      show(current + (dx < 0 ? 1 : -1));
    }
  }, {passive: true});
  const toc = document.getElementById("toc");
  const tocSlide = toc.closest(".slide");
  slides.forEach((slide, i) => {
    if (slide === tocSlide) return;
    const link = document.createElement("a");
    link.href = `#slide-${i + 1}`;
    link.textContent = `${String(i + 1).padStart(2, "0")} · ${slide.querySelector("h1").textContent}`;
    link.addEventListener("click", (event) => {event.preventDefault(); show(i);});
    toc.append(link);
  });
  const rows = JSON.parse(document.getElementById("recorded-run").textContent);
  let replayIndex = 0;
  function renderReplay() {
    const row = rows[replayIndex];
    document.getElementById("replay-cycle").textContent = `Cycle ${row.cycle} / tick ${row.tick}`;
    for (let led = 0; led < 2; led++) {
      document.getElementById(`led${led}`).classList.toggle("lit", row.leds[led]);
      const button = document.getElementById(`button${led}`);
      button.textContent = row.buttons[led] ? "Button held (active-low)" : "Button released";
      button.classList.toggle("held", row.buttons[led]);
    }
    document.getElementById("replay-row").textContent =
      `cycle=${row.cycle} LED0=${row.leds[0] ? "ON" : "OFF"} LED1=${row.leds[1] ? "ON" : "OFF"} tick=${row.tick}`;
  }
  function stopReplay() {
    if (replayTimer !== null) clearInterval(replayTimer);
    replayTimer = null;
    document.getElementById("replay-play").textContent = "Play recorded sequence";
  }
  document.getElementById("replay-step").addEventListener("click", () => {
    stopReplay(); replayIndex = (replayIndex + 1) % rows.length; renderReplay();
  });
  document.getElementById("replay-reset").addEventListener("click", () => {
    stopReplay(); replayIndex = 0; renderReplay();
  });
  document.getElementById("replay-play").addEventListener("click", (event) => {
    if (replayTimer !== null) {stopReplay(); return;}
    if (replayIndex === rows.length - 1) replayIndex = 0;
    renderReplay();
    event.target.textContent = "Pause";
    replayTimer = setInterval(() => {
      if (replayIndex === rows.length - 1) {stopReplay(); return;}
      replayIndex++; renderReplay();
    }, 700);
  });
  document.documentElement.classList.add("ready");
  show(fromHash(), false);
  // A deep link's native anchor jump can land after show(); keep the top bar visible.
  window.addEventListener("load", () => window.scrollTo({top: 0, behavior: "instant"}));
  renderReplay();
})();
