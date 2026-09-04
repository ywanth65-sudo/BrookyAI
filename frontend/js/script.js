const input = document.getElementById("prompt");
const button = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const newChatButton = document.getElementById("new-chat-btn");
let sessionId = crypto.randomUUID();

async function sendMessage() {

    const prompt = input.value;

    if (prompt.trim() === "") return;

    chatBox.innerHTML += `<p class="user"><b>You:</b> ${prompt}</p>`;

    const thinkingMessage = document.createElement("div");
    thinkingMessage.className = "ai";
    thinkingMessage.innerHTML = `
    <b>Brook AI:</b>
    Thinking<span class="dots"></span>
    (<span class="timer">0.0</span> s)
</div>
`;
    chatBox.appendChild(thinkingMessage);
    const dots = thinkingMessage.querySelector(".dots");

    const timer = thinkingMessage.querySelector(".timer");

    const startTime = Date.now();

    const timerAnimation = setInterval(() => {

        const seconds = ((Date.now() - startTime) / 1000).toFixed(1);

        timer.textContent = seconds;

    }, 100);

    let count = 0;

    const thinkingAnimation = setInterval(() => {
        count = (count + 1) % 4;
        dots.textContent = ".".repeat(count);
    }, 500);

    chatBox.scrollTop = chatBox.scrollHeight;

    input.value = "";

    try {
        const response = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ session_id: sessionId, prompt })
        });

        if (!response.ok) {
            let errorMessage = "The assistant could not respond.";
            try {
                const data = await response.json();
                errorMessage = data.detail || errorMessage;
            } catch (error) {
                // Keep the default message when the error body is not JSON.
            }
            throw new Error(errorMessage);
        }

        if (!response.body) {
            throw new Error("The browser does not support response streaming.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let responseText = "";
        let responseContent;
        let responseStarted = false;

        const startResponse = () => {
            if (responseStarted) return;

            responseStarted = true;
            clearInterval(thinkingAnimation);
            thinkingMessage.innerHTML = "<b>Brook AI:</b> ";
            responseContent = document.createElement("span");
            thinkingMessage.appendChild(responseContent);
            thinkingMessage.appendChild(document.createTextNode(" ("));
            thinkingMessage.appendChild(timer);
            thinkingMessage.appendChild(document.createTextNode(" s)"));
        };

        const processLine = (line) => {
            if (!line.trim()) return;

            const data = JSON.parse(line);
            if (data.error) {
                throw new Error(data.error);
            }

            if (data.text) {
                startResponse();
                responseText += data.text;
                responseContent.innerHTML = renderMarkdown(responseText);
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        };

        while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

            const lines = buffer.split("\n");
            buffer = lines.pop();
            lines.forEach(processLine);

            if (done) break;
        }

        if (buffer.trim()) {
            processLine(buffer);
        }
    } catch (error) {
        thinkingMessage.innerHTML = `
<b>Brook AI:</b>
Unable to get a response: ${error.message}
`;
    } finally {
        clearInterval(thinkingAnimation);
        clearInterval(timerAnimation);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
}
button.addEventListener("click", sendMessage);
input.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        sendMessage();
    }

});

newChatButton.addEventListener("click", function () {
    sessionId = crypto.randomUUID();
    chatBox.innerHTML = "";
    input.value = "";
    input.focus();
});