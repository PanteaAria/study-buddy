const axios = require("axios");
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// ✅ Initialize Express app before defining routes
const app = express();
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = "asst_qfiI7AN6r8vlmPPtdd9ybbxe"; // Ensure correct ID

// ✅ Middleware setup
app.use(express.json());
app.use(cors({ origin: "*" }));

// ✅ Main route to handle user queries
app.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    console.log("Received question:", question);

    // Step 1: Create a new thread
    const threadResponse = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const threadId = threadResponse.data.id;
    console.log("Created Thread ID:", threadId);

    // Step 2: Send user message to the thread
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { role: "user", content: question },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    // Step 3: Run the assistant on the thread
    const runResponse = await axios.pos
