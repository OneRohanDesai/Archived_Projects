// app.js
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".role-nav");
  if (nav) {
    const current = window.location.pathname;
    nav.querySelectorAll("a").forEach(a => {
      if (a.getAttribute("href") === current) a.classList.add("active");
    });
  }
});
