import Reveal, { type RevealConfig } from "reveal.js";
import Notes from "reveal.js/plugin/notes";

const portrait = window.matchMedia("(orientation: portrait) and (max-width: 760px)");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const slideSize = () => portrait.matches ? { width: 800, height: 1240 } : { width: 1280, height: 720 };
const motion = (): RevealConfig => ({
  transition: reduced.matches ? "none" : "fade",
  autoAnimate: !reduced.matches,
});

for (const slide of document.querySelectorAll<HTMLElement>(".slides > section")) {
  slide.dataset.backgroundColor = slide.classList.contains("dark") ? "#10131e" : "#f6f4ee";
}

await Reveal.initialize({
  ...slideSize(),
  margin: 0.04,
  center: false,
  hash: true,
  slideNumber: "c/t",
  controlsTutorial: false,
  controlsBackArrows: "visible",
  scrollActivationWidth: 0,
  ...motion(),
  transitionSpeed: "fast",
  autoAnimateDuration: 0.36,
  backgroundTransition: "none",
  plugins: document.body.hasAttribute("data-presenter") ? [Notes] : [],
});

portrait.addEventListener("change", () => Reveal.configure(slideSize()));
reduced.addEventListener("change", () => Reveal.configure(motion()));
