const form = document.getElementById("chooser");
const input = document.getElementById("numberInput");
const status = document.getElementById("status");
const revealSection = document.getElementById("revealSection");
const revealText = document.getElementById("revealText");
const cardNumber = document.getElementById("cardNumber");
const video = document.getElementById("revealVideo");
const restartButton = document.getElementById("restartButton");

const showStatus = (message, invalid = false) => {
  status.textContent = message;
  status.style.color = invalid ? "#ff8d8d" : "#b8c4ff";
};

const setFormDisabled = (disabled) => {
  input.disabled = disabled;
  form.querySelector('button[type="submit"]').disabled = disabled;
};

const reset = () => {
  revealSection.classList.add("hidden");
  form.classList.remove("hidden");
  status.textContent = "";
  input.value = "";
  input.focus();
  setFormDisabled(false);
};

const playReveal = async (num) => {
  try {
    showStatus("Locking in your number...", false);
    setFormDisabled(true);

    const response = await fetch(`/api/reveal?num=${encodeURIComponent(num)}`);
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error || "Unable to process number.");
    }

    const data = await response.json();
    cardNumber.textContent = data.number;
    revealText.textContent = data.message;

    form.classList.add("hidden");
    revealSection.classList.remove("hidden");
    video.currentTime = 0;
    await video.play().catch(() => null);
    showStatus("");
  } catch (error) {
    showStatus(error.message, true);
    setFormDisabled(false);
  }
};

const sanitizeDigits = () => {
  const cleaned = input.value.replace(/[^0-9]/g, "").slice(0, 2);
  if (input.value !== cleaned) input.value = cleaned;
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sanitizeDigits();

  const value = input.value.trim();
  if (!/^\d{2}$/.test(value)) {
    showStatus("Enter exactly two digits, like 07 or 88.", true);
    return;
  }

  playReveal(value);
});

restartButton.addEventListener("click", reset);
input.addEventListener("input", () => {
  sanitizeDigits();
  status.textContent = "";
});
