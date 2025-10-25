document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('a.footnote-backref').forEach(function(link) {
    link.addEventListener('click', function(e) {
        console.log("test")
      const id = this.getAttribute('href').replace('#', '');
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 5) + (target.offsetHeight / 5);
        window.scrollTo({ top: y, behavior: 'smooth' });
        history.pushState(null, '', '#' + id);
      }
    });
  });
});