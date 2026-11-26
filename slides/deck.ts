import Reveal, { type RevealConfig } from "reveal.js";
import Notes from "reveal.js/plugin/notes";

const portrait = window.matchMedia("(orientation: portrait) and (max-width: 760px)");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
const print = window.matchMedia("print");
const slideSize = () => portrait.matches ? { width: 800, height: 1240 } : { width: 1280, height: 720 };
const motion = (): RevealConfig => ({
  transition: reduced.matches ? "none" : "fade",
});

const palette = getComputedStyle(document.documentElement);
for (const slide of document.querySelectorAll<HTMLElement>(".slides > section")) {
  slide.dataset.backgroundColor = palette.getPropertyValue(slide.classList.contains("dark") ? "--ink" : "--paper").trim();
  if (slide.matches(".cover, .chapter")) slide.dataset.backgroundGradient = palette.getPropertyValue("--spotlight").trim();
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
  backgroundTransition: "none",
  plugins: document.body.hasAttribute("data-presenter") ? [Notes] : [],
});

portrait.addEventListener("change", () => Reveal.configure(slideSize()));

let eyes = Reveal.getCurrentSlide().querySelectorAll<SVGGElement>(".avatar-gaze");
const rest = () => eyes.forEach((eye) => eye.style.removeProperty("transform"));

window.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse") return rest();
  if (!mouse.matches || reduced.matches || print.matches || Reveal.isOverview()) return;
  for (const eye of eyes) {
    const face = eye.ownerSVGElement!.getBoundingClientRect();
    const x = event.clientX - (face.left + face.width / 2);
    const y = event.clientY - (face.top + face.height / 2);
    const scale = 8 / Math.max(140, Math.hypot(x, y));
    eye.style.transform = `translate(${x * scale}px, ${y * scale}px)`;
  }
});

const expression = document.querySelector<HTMLElement>(".expression")!;
const image = expression.querySelector("img")!;
const button = expression.querySelector("button")!;
const still = image.getAttribute("src")!;
function showExpression(playing: boolean) {
  const source = playing ? image.dataset.animation! : still;
  if (image.getAttribute("src") !== source) image.src = source;
  button.textContent = playing ? "Stop avatar animation" : "Play avatar animation";
}

button.hidden = reduced.matches;
button.addEventListener("click", () => showExpression(image.getAttribute("src") === still));
button.addEventListener("keydown", (event) => {
  if (event.key === " ") event.stopPropagation();
});

function resetSlide() {
  rest();
  showExpression(false);
}

Reveal.on("slidechanged", () => {
  resetSlide();
  eyes = Reveal.getCurrentSlide().querySelectorAll<SVGGElement>(".avatar-gaze");
});
Reveal.on("overviewshown", resetSlide);
window.addEventListener("blur", rest);
document.documentElement.addEventListener("pointerleave", rest);
document.addEventListener("visibilitychange", resetSlide);
window.addEventListener("beforeprint", resetSlide);
print.addEventListener("change", resetSlide);
mouse.addEventListener("change", rest);
reduced.addEventListener("change", () => {
  Reveal.configure(motion());
  button.hidden = reduced.matches;
  resetSlide();
});
