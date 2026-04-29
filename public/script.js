const form = document.getElementById("chooser");
const input = document.getElementById("numberInput");
const status = document.getElementById("status");
const revealSection = document.getElementById("revealSection");
const revealText = document.getElementById("revealText");
const cardNumber = document.getElementById("cardNumber");
const video = document.getElementById("revealVideo");
const restartButton = document.getElementById("restartButton");

// NEW: Pen mode - change to 'gel' for gel pen effect
const PEN_MODE = 'gel'; // Options: 'marker' or 'gel'

// NEW: Text position coordinates (center of video by default)
// X: -50 to +50 (left to right, 0 = center)
// Y: -50 to +50 (top to bottom, 0 = center)
const TEXT_POSITION = {
  x: 0,  // Horizontal offset from center (-50 = far left, +50 = far right)
  y: 0   // Vertical offset from center (-50 = far up, +50 = far down)
};

// NEW: Text customization variables
const TEXT_CONFIG = {
  opacity: 1,
  rotation: -1.5,
  scale: 1.02,
  fontSize: '3rem',
  letterSpacing: '0.15em'
};

// NEW: Get the magic overlay container
const overlay = document.getElementById("magicOverlay");

// NEW: Set the exact second your dad flips the blank card around (e.g., 12.5 seconds)
const REVEAL_TIMESTAMP = 0.5; 

// NEW: Convert coordinates to CSS position
function getTextPosition() {
  const centerX = 50; // 50% = center horizontally
  const centerY = 62; // 62% = center vertically (adjusted for video)
  
  const xPercent = centerX + TEXT_POSITION.x;
  const yPercent = centerY + TEXT_POSITION.y;
  
  return {
    left: `${xPercent}%`,
    top: `${yPercent}%`
  };
}

// NEW: Apply pen mode and text config
function applyTextStyle() {
  // Remove any existing mode classes
  document.body.classList.remove('marker-mode', 'gel-mode');
  
  const modeClass = PEN_MODE === 'gel' ? 'gel-mode' : 'marker-mode';
  document.body.classList.add(modeClass);
  
  console.log('Applied mode:', modeClass);
  
  // Apply position
  const pos = getTextPosition();
  cardNumber.style.left = pos.left;
  cardNumber.style.top = pos.top;
  
  // Apply other custom styles
  cardNumber.style.opacity = TEXT_CONFIG.opacity;
  cardNumber.style.transform = `rotate(${TEXT_CONFIG.rotation}deg) scale(${TEXT_CONFIG.scale})`;
  cardNumber.style.fontSize = TEXT_CONFIG.fontSize;
  cardNumber.style.letterSpacing = TEXT_CONFIG.letterSpacing;
  
  // Debug coordinates in console
  console.log('Text Position:', TEXT_POSITION);
  console.log('CSS Position:', pos);
}

// Call it on load
applyTextStyle();

// Add coordinate guides to console
console.log('=== TEXT POSITION GUIDES ===');
console.log('X coordinate: -50 (far left) to +50 (far right)');
console.log('Y coordinate: -50 (far up) to +50 (far down)');
console.log('Current position:', TEXT_POSITION);
console.log('Change TEXT_POSITION.x and TEXT_POSITION.y to adjust');
console.log('Current mode:', PEN_MODE);
console.log('===========================');

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
  status.text_content = "";
});

// Prevent zoom on input focus on iOS
document.addEventListener("touchstart", (e) => {
  if (e.target === input) {
    e.target.style.fontSize = "16px";
  }
}, false);
