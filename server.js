const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

app.get("/api/reveal", (req, res) => {
  const num = String(req.query.num || "").trim();
  if (!/^\d{2}$/.test(num)) {
    return res.status(400).json({ error: "Enter a two-digit number between 00 and 99." });
  }

  return res.json({
    number: num,
    video: "/video.mp4",
    message: `You could have thought of any number. You could have chosen 17... or 89... but you chose ${num}. Since our minds are clearly connected, I invite you to my show.`
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Reveal app running at http://localhost:${port}`);
});