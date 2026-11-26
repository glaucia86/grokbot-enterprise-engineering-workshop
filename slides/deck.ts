import Reveal from "reveal.js";
import Notes from "reveal.js/plugin/notes";

const portrait = window.matchMedia("(orientation: portrait) and (max-width: 760px)");
const slideSize = () => portrait.matches ? { width: 800, height: 1240 } : { width: 1280, height: 720 };

await Reveal.initialize({
  ...slideSize(),
  margin: 0.04,
  center: false,
  hash: true,
  slideNumber: "c/t",
  controlsTutorial: false,
  controlsBackArrows: "visible",
  scrollActivationWidth: 0,
  transition: "none",
  backgroundTransition: "none",
  plugins: [Notes],
});

portrait.addEventListener("change", () => Reveal.configure(slideSize()));
