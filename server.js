require("dotenv").config(); // Load environment variables
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors()); // Allows your frontend to communicate with this backend

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Load API key from .env file

// API route to handle requests from the website
app.post("/ask-gpt", async (req, res) => {
    try {
        const userMessage = req.body.message;

        // Send request to OpenAI API
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4-turbo", // Change to your custom GPT model if needed
                messages: [{ role: "user", content: userMessage }],
                temperature: 0.7
            },
            {
                headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
            }
        );

        // Send OpenAI's response back to the website
        res.json({ response: response.data.choices[0].message.content });

    } catch (error) {
        console.error("Error calling OpenAI:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch response from OpenAI" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
 
