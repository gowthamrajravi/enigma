const express = require('express');
const path = require('path');
const axios = require('axios'); // Run `npm install axios` in your terminal

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- YOUR JSONBIN DETAILS ---
const BIN_ID = '69f78eb236566621a81eaf29';
const API_KEY = '$2a$10$RqjHlhv/GMzMe.Z2JUIgYubMiLIw3LMXoRMiQTPi3kR/hnKijnKLm';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Read the current state from JSONBin
app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get(JSONBIN_URL, {
            headers: { 'X-Master-Key': API_KEY }
        });
        res.json(response.data.record);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read data from JSONBin' });
    }
});

// Update the state to JSONBin (Admin only)
app.post('/api/data', async (req, res) => {
    try {
        const updatedData = req.body;
        updatedData.lastRefreshed = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

        await axios.put(JSONBIN_URL, updatedData, {
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            }
        });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save data to JSONBin' });
    }
});

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
});