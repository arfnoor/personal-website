// Marks the section crossing the middle of the viewport as active, which
// triggers the fade/slide transition in style.css, and updates the counter.
(() => {
  const sections = Array.from(document.querySelectorAll(".section"));
  const current = document.getElementById("progress-current");
  const total = document.getElementById("progress-total");

  if (total) total.textContent = String(sections.length);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-active", entry.isIntersecting);
        if (entry.isIntersecting && current) {
          current.textContent = String(sections.indexOf(entry.target) + 1);
        }
      });
    },
    // A thin band across the middle of the screen works for sections of any height
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
})();
