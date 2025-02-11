const axios = require("axios");
require("dotenv").config();
const express = require("express");
const cors = require("cors");

// ✅ Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = "asst_qfiI7AN6r8vlmPPtdd9ybbxe"; // Ensure correct ID

// ✅ Middleware setup
app.use(express.json());
app.use(cors({ origin: "*" }));

// ✅ Main route
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

    // Step 3: Run the assistant
    const runResponse = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      { assistant_id: ASSISTANT_ID },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const runId = runResponse.data.id;
    console.log("Run ID:", runId);

    // Step 4: Polling until the assistant completes response
    let runStatus = "in_progress";
    while (runStatus === "in_progress" || runStatus === "queued") {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const checkRun = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2"
          }
        }
      );

      runStatus = checkRun.data.status;
      console.log(`Run Status: ${runStatus}`);
    }

    // Step 5: Retrieve messages from the Assistant
    const messagesResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    console.log("Full Messages API Response:", JSON.stringify(messagesResponse.data, null, 2));

    // ✅ Fix: Ensure correct response extraction
    let responseText = "No response from the assistant.";

    if (messagesResponse.data && messagesResponse.data.data) {
      const assistantMessage = messagesResponse.data.data.find(msg => msg.role === "assistant");

      if (assistantMessage?.content?.length > 0) {
        responseText = assistantMessage.content
          .map(item => (item.type === "text" && item.text?.value ? item.text.value : ""))
          .filter(text => text) // Remove empty values
          .join("\n");
      }
    }

    console.log("Final Response Text:", responseText);
    res.json({ response: responseText });

  } catch (error) {
    console.error("OpenAI API Error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    res.status(500).json({ error: "Error communicating with OpenAI API" });
  }
});

// ✅ Fix for Render: Bind to 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
