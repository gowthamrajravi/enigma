const form = document.getElementById("chooser");
const input = document.getElementById("numberInput");
const status = document.getElementById("status");
const revealSection = document.getElementById("revealSection");
const revealText = document.getElementById("revealText");
const cardNumber = document.getElementById("cardNumber");
const video = document.getElementById("revealVideo");
const restartButton = document.getElementById("restartButton");

// NEW: Get the magic overlay container
const overlay = document.getElementById("magicOverlay");

// NEW: Set the exact second your dad flips the blank card around (e.g., 12.5 seconds)
const REVEAL_TIMESTAMP = 12.5; 

const showStatus = (message, isError = false) => {
  status.textContent = message;
  status.style.color = isError ? "#ff8b8b" : "#b8c4ff";
};

const toggleForm = (show) => {
  form.style.display = show ? "flex" : "none";
  input.disabled = !show;
  form.querySelector("button").disabled = !show;
};

// NEW: We define the timing checker separately so we can safely remove it later
const timeChecker = () => {
  if (video.currentTime >= REVEAL_TIMESTAMP) {
    overlay.style.opacity = "1"; // Fade the marker text in!
    video.removeEventListener("timeupdate", timeChecker); // Stop checking to save memory
  }
};

const reset = () => {
  revealSection.classList.add("hidden");
  toggleForm(true);
  status.textContent = "";
  input.value = "";
  
  // NEW: Reset the video and hide the overlay so the trick works a second time
  video.pause();
  video.removeEventListener("timeupdate", timeChecker); 
  overlay.style.opacity = "0"; 

  input.focus();
};

const playReveal = async (num) => {
  try {
    showStatus("Locking in your number...");
    toggleForm(false);

    // Keep your existing API fetch logic
    const response = await fetch(`/api/reveal?num=${encodeURIComponent(num)}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Unable to process number.");
    }

    const data = await response.json();
    // Use the backend number, or fallback to the input just in case
    cardNumber.textContent = data.number || num; 
    revealText.textContent = data.message;

    // NEW: Ensure the overlay is totally invisible before showing the video section
    overlay.style.opacity = "0";

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
    
    // NEW: Start watching the video clock right before it plays
    video.addEventListener("timeupdate", timeChecker);
    
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