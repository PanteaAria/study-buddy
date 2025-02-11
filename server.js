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
          "OpenAI-Beta": "assistants=v2"
        }
      }
    );

    const threadId = threadResponse.data.id;

    // Step 2: Send user message to thread
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

    // Step 4: Wait for completion (polling method)
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

    // Extract the latest assistant message
    const assistantMessage = messagesResponse.data.data.find(msg => msg.role === "assistant");

    let responseText = "";

    if (assistantMessage) {
      console.log("Assistant Message Found:", assistantMessage);

      if (Array.isArray(assistantMessage.content)) {
        responseText = assistantMessage.content
          .map(item => (item.type === "text" && item.text?.value ? item.text.value : ""))
          .join("\n");
      } else {
        responseText = "Sorry, I couldn't process the response.";
      }
    } else {
      console.error("No assistant message found.");
      responseText = "No response from the assistant.";
    }

    console.log("Final Response Text:", responseText);
    res.json({ response: responseText });

  } catch (error) {
    console.error("OpenAI Assistants API Error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    res.status(500).json({ error: "Error communicating with OpenAI API" });
  }
});
