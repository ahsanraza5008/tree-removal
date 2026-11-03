// Small runtime: menu toggle, sticky mobile call bar, process-line reveal, footer year.
(function () {
  var SITE = { year: new Date().getFullYear() };
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = SITE.year;

  var header = document.querySelector(".site-header");
  var btn = document.querySelector(".menu-btn");
  if (btn && header) {
    btn.addEventListener("click", function () {
      var open = header.classList.toggle("menu-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  // Sticky call bar shows once the hero has scrolled away
  var bar = document.getElementById("callbar");
  var hero = document.querySelector(".hero");
  if (bar && "IntersectionObserver" in window) {
    if (hero) {
      new IntersectionObserver(function (e) { bar.classList.toggle("is-on", !e[0].isIntersecting); }, { threshold: 0 }).observe(hero);
    } else { bar.classList.add("is-on"); }

    var steps = document.querySelectorAll(".steps");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.35 });
    steps.forEach(function (s) { io.observe(s); });
  } else if (bar) { bar.classList.add("is-on"); document.querySelectorAll(".steps").forEach(function (s) { s.classList.add("is-in"); }); }
})();
