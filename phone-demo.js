// Phone demo support.
//
// Every .phone-screen contains a .phone-viewport that is a fixed 390x844 "logical"
// phone screen. This script scales it to fit the frame, so app code written for a
// normal phone size looks right at any size on the page.
//
// If a screen has data-demo="name", demos/name/demo.js is loaded the first time the
// screen comes near the viewport. That file must export:
//
//   export function mount(root) { ...render the app into root...; return optionalCleanup; }

const BASE_WIDTH = 390;
const screens = Array.from(document.querySelectorAll(".phone-screen"));

screens.forEach((screen) => {
  const viewport = screen.querySelector(".phone-viewport");
  const fit = () => screen.style.setProperty("--scale", String(screen.clientWidth / BASE_WIDTH));
  fit();
  new ResizeObserver(fit).observe(screen);
});

async function loadDemo(screen) {
  const name = screen.dataset.demo;
  const placeholder = screen.querySelector(".phone-placeholder");

  if (!name || !/^[\w-]+$/.test(name)) return;

  try {
    const demo = await import(`./demos/${name}/demo.js`);
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;inset:0;overflow:hidden";
    screen.querySelector(".phone-viewport").append(host);
    demo.mount(host);
    if (placeholder) placeholder.remove();
  } catch (error) {
    console.warn(`Could not load demo "${name}":`, error);
    if (placeholder) {
      placeholder.textContent = "Demo could not load. If you opened this file directly, run a local server instead (see README).";
    }
  }
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      loadDemo(entry.target);
    });
  },
  { rootMargin: "100% 0px" }
);

screens.filter((screen) => screen.dataset.demo).forEach((screen) => observer.observe(screen));
