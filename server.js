const axios = require("axios");
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = "asst_qfiI7AN6r8vlmPPtdd9ybbxe"; // Replace with your actual Assistant ID

app.use(express.json());
app.use(cors({ origin: "*" }));

app.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    // Step 1: Create a new thread
    const threadResponse = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2" // Required header
        }
      }
    );

    const threadId = threadResponse.data.id;

    // Step 2: Send user message to thread
    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        role: "user",
        content: question
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2" // Required header
        }
      }
    );

    // Step 3: Run the assistant on the thread
    const runResponse = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2" // Required header
        }
      }
    );

    const runId = runResponse.data.id;

    // Step 4: Wait for completion (polling method)
    let runStatus = "in_progress";
    while (runStatus === "in_progress") {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before checking again

      const checkRun = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2" // Required header
          }
        }
      );

      runStatus = checkRun.data.status;
    }

    // Step 5: Retrieve messages from the Assistant
    const messagesResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2" // Required header
        }
      }
    );

    // Extract the latest assistant message
    const assistantMessage = messagesResponse.data.data.find(msg => msg.role === "assistant");

    if (assistantMessage) {
      // Handle content properly if it's an array of objects
      let responseText = "";

      if (Array.isArray(assistantMessage.content)) {
        responseText = assistantMessage.content.map(item => item.text || "").join("\n"); // Extract text from objects
      } else {
        responseText = assistantMessage.content;
      }

      res.json({ response: responseText });
    } else {
      res.json({ response: "Sorry, I couldn't process your request." });
    }

  } catch (error) {
    console.error("OpenAI Assistants API Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Error communicating with OpenAI API" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
