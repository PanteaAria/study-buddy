const axios = require("axios");
const fs = require("fs");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");

// ✅ Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = "asst_qfiI7AN6r8vlmPPtdd9ybbxe"; // Ensure correct ID

// ✅ Configure file uploads
const upload = multer({ dest: "uploads/" });

// ✅ Middleware setup
app.use(express.json());
app.use(cors({ origin: "*" }));

// ✅ Upload a file and attach it to the assistant
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  try {
    // ✅ Upload the file to OpenAI
    const fileResponse = await axios.post(
      "https://api.openai.com/v1/files",
      {
        file: fs.createReadStream(req.file.path),
        purpose: "assistants"
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "multipart/form-data",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const fileId = fileResponse.data.id;
    console.log("Uploaded File ID:", fileId);

    // ✅ Attach file to assistant
    await axios.post(
      `https://api.openai.com/v1/assistants/${ASSISTANT_ID}`,
      {
        tool_resources: {
          "code_interpreter": {
            "file_ids": [fileId]
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    res.json({ message: "File uploaded successfully.", fileId });

  } catch (error) {
    console.error("❌ File Upload Error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    res.status(500).json({ error: "File upload failed." });
  }
});

// ✅ Handle user questions
app.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    console.log("Received question:", question);

    // ✅ Step 1: Create a new thread
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

    // ✅ Step 2: Send user message to the thread
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

    // ✅ Step 3: Run the assistant
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

    // ✅ Step 4: Polling until the assistant completes response
    let runStatus = "in_progress";
    let retries = 0;
    const maxRetries = 15; // Max wait = 15 * 2s = 30 seconds

    while ((runStatus === "in_progress" || runStatus === "queued") && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries++;

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

    // ✅ Handle failed runs
    if (runStatus === "failed") {
      console.error("❌ Assistant failed to process the request.");
      return res.status(500).json({ error: "Assistant failed to process the request. Try again later." });
    }

    // ✅ Step 5: Retrieve messages from the Assistant
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

    // ✅ Extract the assistant's response
    let responseText = "No response from the assistant.";

    if (messagesResponse.data?.data?.length > 0) {
      const assistantMessage = messagesResponse.data.data.find(msg => msg.role === "assistant");

      if (assistantMessage) {
        responseText = assistantMessage.content
          .map(item => (item.type === "text" && item.text?.value ? item.text.value : ""))
          .filter(text => text) // Remove empty values
          .join("\n");

        // ✅ Remove citations like 
        responseText = responseText.replace(/\【.*?\】/g, "").trim();
      }
    }

    console.log("Final Response Text:", responseText);
    res.json({ response: responseText });

  } catch (error) {
    console.error("❌ OpenAI API Error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    res.status(500).json({ error: "Error communicating with OpenAI API" });
  }
});

// ✅ Fix for Render: Bind to 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
