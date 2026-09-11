const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('.side-nav');
const sidebar = document.querySelector('.sidebar');
const links = [...document.querySelectorAll('.nav-link')];

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  mobileNav?.classList.toggle('open', !open);
  sidebar?.classList.toggle('nav-open', !open);
});

links.forEach((link) => link.addEventListener('click', () => {
  links.forEach((item) => item.classList.remove('active'));
  link.classList.add('active');
  mobileNav?.classList.remove('open');
  sidebar?.classList.remove('nav-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const sections = [...document.querySelectorAll('main section[id]')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-35% 0px -55% 0px' });
sections.forEach((section) => observer.observe(section));

document.querySelectorAll('.publication[href="#"]').forEach((item) => {
  item.addEventListener('click', (event) => event.preventDefault());
});
