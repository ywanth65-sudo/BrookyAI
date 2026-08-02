const input = document.getElementById("prompt");
const button = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");

async function sendMessage() {

    const prompt = input.value;

    if (prompt.trim() === "") return;

    chatBox.innerHTML += `<p class="user"><b>You:</b> ${prompt}</p>`;

    chatBox.innerHTML += `
<div class="ai" id="thinking">
    <b>Brook AI:</b>
Thinking<span id="dots"></span>
(<span id="timer">0.0</span> s)
</div>
`;
    const dots = document.getElementById("dots");

    const timer = document.getElementById("timer");

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

    const response = await fetch(
        `http://127.0.0.1:8000/chat?prompt=${encodeURIComponent(prompt)}`
    );

    const data = await response.json();
    
    clearInterval(thinkingAnimation);
    clearInterval(timerAnimation);

    document.getElementById("thinking").innerHTML = `
<b>Brook AI:</b>
${data.reply}
`;

    chatBox.scrollTop = chatBox.scrollHeight;
}
button.addEventListener("click", sendMessage);
input.addEventListener("keydown", function (event) {

    if (event.key === "Enter") {
        sendMessage();
    }

});