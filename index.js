const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require('colors');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());

// API
app.get("/", (req, res) => {
    res.send("Deshi Vibes Server Is Running...")
})


// Listen
app.listen(port, () => console.log("Deshi Vibes Server Is Running..."))