const container = document.getElementById("background");
    const colors = ["var(--bubble-gold)", "var(--bubble-gray)", "var(--bubble-white)"];

    // Crear burbujas
    function createBubbles(num = 25) {
      for (let i = 0; i < num; i++) {
        const bubble = document.createElement("div");
        bubble.classList.add("bubble");

        // tamaño aleatorio
        const size = Math.random() * 60 + 20;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;

        // posición aleatoria
        bubble.style.top = `${Math.random() * 100}%`;
        bubble.style.left = `${Math.random() * 100}%`;

        // color aleatorio
        bubble.style.background = colors[Math.floor(Math.random() * colors.length)];

        // movimiento aleatorio
        bubble.style.setProperty("--x-move", `${Math.random() * 200 - 100}px`);
        bubble.style.setProperty("--y-move", `${Math.random() * 200 - 100}px`);
        bubble.style.animationDuration = `${6 + Math.random() * 6}s`;

        container.appendChild(bubble);
      }
    }

    // Alternar día/noche
    const toggleBtn = document.getElementById("toggle");
const toggleIcon = toggleBtn.querySelector("i");

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("night");

  if (document.body.classList.contains("night")) {
    toggleIcon.classList.remove("fa-moon");
    toggleIcon.classList.add("fa-sun");
  } else {
    toggleIcon.classList.remove("fa-sun");
    toggleIcon.classList.add("fa-moon");
  }
});
    createBubbles(25);
    
