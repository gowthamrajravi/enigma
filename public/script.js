const form = document.getElementById("chooser");
const input = document.getElementById("numberInput");
const status = document.getElementById("status");
const revealSection = document.getElementById("revealSection");
const revealText = document.getElementById("revealText");
const cardNumber = document.getElementById("cardNumber");
const video = document.getElementById("revealVideo");
const restartButton = document.getElementById("restartButton");

const showStatus = (message, isError = false) => {
  status.textContent = message;
  status.style.color = isError ? "#ff8b8b" : "#b8c4ff";
};

const toggleForm = (show) => {
  form.style.display = show ? "flex" : "none";
  input.disabled = !show;
  form.querySelector("button").disabled = !show;
};

const reset = () => {
  revealSection.classList.add("hidden");
  toggleForm(true);
  status.textContent = "";
  input.value = "";
  input.focus();
};

const playReveal = async (num) => {
  try {
    showStatus("Locking in your number...");
    toggleForm(false);

    const response = await fetch(`/api/reveal?num=${encodeURIComponent(num)}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Unable to process number.");
    }

    const data = await response.json();
    cardNumber.textContent = data.number;
    revealText.textContent = data.message;

    form.style.display = "none";
    revealSection.classList.remove("hidden");

    // Scroll to reveal section on mobile
    if (window.innerWidth < 640) {
      setTimeout(() => {
        revealSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }

    // Reset and play video
    video.currentTime = 0;
    await video.play().catch(() => {});
    showStatus("");
  } catch (error) {
    showStatus(error.message, true);
    toggleForm(true);
  }
};

const sanitizeInput = () => {
  const val = input.value.replace(/[^0-9]/g, "").slice(0, 2);
  if (input.value !== val) input.value = val;
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sanitizeInput();

  const value = input.value.trim();
  if (!/^\d{2}$/.test(value)) {
    showStatus("Enter exactly two digits (00-99).", true);
    return;
  }

  playReveal(value);
});

restartButton.addEventListener("click", reset);

input.addEventListener("input", () => {
  sanitizeInput();
  status.textContent = "";
});

// Prevent zoom on input focus on iOS
document.addEventListener("touchstart", (e) => {
  if (e.target === input) {
    e.target.style.fontSize = "16px";
  }
}, false);
