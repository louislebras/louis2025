document.addEventListener("DOMContentLoaded", function () {
  const container = document.querySelector(".visualizer-home");
  const medias = Array.from(container.children);
  let index = 0;
  let timer = null;
  let isHolding = false;
  let isPaused = false;

  function showNext() {
    medias.forEach((media) => {
      media.classList.remove("active");
      if (media.tagName === "VIDEO") {
        media.pause();
        media.currentTime = 0;
      }
    });

    medias[index].classList.add("active");
    if (medias[index].tagName === "VIDEO") {
      medias[index].play();
    }

    index = (index + 1) % medias.length;

    if (!isHolding && !isPaused) {
      timer = setTimeout(showNext, 700);
    }
  }

  container.addEventListener("mousedown", () => {
    isHolding = true;
    clearTimeout(timer);
    if (medias[index - 1] && medias[index - 1].tagName === "VIDEO") {
      medias[index - 1].pause();
    }
  });

  container.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isHolding = true;
    clearTimeout(timer);
    if (medias[index - 1] && medias[index - 1].tagName === "VIDEO") {
      medias[index - 1].pause();
    }
  });

  container.addEventListener("mouseup", () => {
    if (isHolding) {
      isHolding = false;
      if (!isPaused) {
        if (medias[index - 1] && medias[index - 1].tagName === "VIDEO") {
          medias[index - 1].play();
        }
        timer = setTimeout(showNext, 700);
      }
    }
  });

  container.addEventListener("mouseleave", () => {
    if (isHolding) {
      isHolding = false;
      if (!isPaused) {
        if (medias[index - 1] && medias[index - 1].tagName === "VIDEO") {
          medias[index - 1].play();
        }
        timer = setTimeout(showNext, 700);
      }
    }
  });

  container.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (isHolding) {
      isHolding = false;
      if (!isPaused) {
        if (medias[index - 1] && medias[index - 1].tagName === "VIDEO") {
          medias[index - 1].play();
        }
        timer = setTimeout(showNext, 700);
      }
    }
  });

  container.addEventListener("click", () => {
    if (!isHolding) {
      isPaused = !isPaused;
      if (isPaused) {
        clearTimeout(timer);
        if (medias[index - 1] && medias[index - 1].tagName === "VIDEO") {
          medias[index - 1].pause();
        }
      } else {
        if (medias[index - 1] && medias[index - 1].tagName === "VIDEO") {
          medias[index - 1].play();
        }
        timer = setTimeout(showNext, 700);
      }
    }
  });

  if (medias.length > 0) {
    showNext();
  }
});
