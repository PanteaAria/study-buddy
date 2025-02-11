const axios = require("axios");
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json());
app.use(cors());

app.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are DPST1091/CPTG1391 Study Buddy, a student-friendly assistant for Introduction to Programming. Answer only based on the course materials provided and do not make up information." 
          },
          { role: "user", content: question }
        ]
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" }
      }
    );

    res.json({ response: response.data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "Error communicating with OpenAI API" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
