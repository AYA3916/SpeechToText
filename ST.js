(() => {
  "use strict";

  const elements = {
    text: document.getElementById("text"),
    status: document.getElementById("status"),
    statusRow: document.getElementById("statusRow"),
    start: document.getElementById("startBtn"),
    stop: document.getElementById("stopBtn"),
    language: document.getElementById("language"),
    copy: document.getElementById("copyBtn"),
    clear: document.getElementById("clearBtn"),
    words: document.getElementById("wordCount"),
    characters: document.getElementById("charCount"),
  };

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let finalTranscript = "";
  let interimTranscript = "";
  let listening = false;
  let lastError = null;

  function setStatus(message, state = "ready") {
    elements.status.textContent = message;
    elements.statusRow.dataset.state = state;
  }

  function renderTranscript() {
    elements.text.replaceChildren();
    elements.text.dir = "auto";
    elements.text.textContent = finalTranscript;
    if (interimTranscript) {
      const interim = document.createElement("span");
      interim.className = "interim";
      interim.textContent = interimTranscript;
      elements.text.append(interim);
    }

    const fullText = `${finalTranscript}${interimTranscript}`.trim();
    const words = fullText ? fullText.split(/\s+/u).length : 0;
    elements.words.textContent = `${words} ${words === 1 ? "word" : "words"}`;
    elements.characters.textContent = `${fullText.length} ${fullText.length === 1 ? "character" : "characters"}`;
    elements.copy.disabled = !fullText;
    elements.clear.disabled = !fullText;
  }

  function setControls(isListening) {
    listening = isListening;
    elements.start.disabled = isListening || !Recognition;
    elements.stop.disabled = !isListening;
    elements.language.disabled = isListening;
  }

  function recognitionErrorMessage(code) {
    const messages = {
      "not-allowed": "Microphone or speech recognition permission was denied. Allow access in your browser’s site settings, then try again.",
      "service-not-allowed": "The browser blocked its speech recognition service. Try Chrome or Edge and check browser or network restrictions.",
      "audio-capture": "No microphone was available. Connect a microphone and check your system input settings.",
      network: "The speech recognition service could not be reached. Check your internet connection and try again.",
      "no-speech": "No speech was detected. Check the microphone and try speaking closer to it.",
      "language-not-supported": "This browser’s recognition service does not support the selected language.",
      aborted: "Recognition was stopped.",
    };
    return messages[code] || `Speech recognition failed (${code || "unknown error"}). Check browser permissions and try again.`;
  }

  function createRecognition() {
    recognition = new Recognition();
    recognition.lang = elements.language.value;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      lastError = null;
      setControls(true);
      setStatus("Listening. Speak naturally…", "listening");
    };

    recognition.onresult = (event) => {
      interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const phrase = result[0]?.transcript || "";
        if (result.isFinal) finalTranscript += `${phrase} `;
        else interimTranscript += phrase;
      }
      renderTranscript();
    };

    recognition.onerror = (event) => {
      lastError = recognitionErrorMessage(event.error);
      setStatus(lastError, "error");
    };

    recognition.onend = () => {
      setControls(false);
      interimTranscript = "";
      renderTranscript();
      if (lastError) setStatus(lastError, "error");
      else setStatus("Listening stopped. Start again whenever you’re ready.", "ready");
    };
  }

  elements.start.addEventListener("click", () => {
    if (listening || !Recognition) return;
    lastError = null;
    try {
      createRecognition();
      recognition.start();
      // Lock controls immediately; onstart will update the listening status.
      setControls(true);
      setStatus("Starting microphone…", "listening");
    } catch (error) {
      setControls(false);
      const message = error.name === "NotAllowedError"
        ? recognitionErrorMessage("not-allowed")
        : `Could not start recognition: ${error.message}`;
      setStatus(message, "error");
    }
  });

  elements.stop.addEventListener("click", () => {
    if (!recognition || !listening) return;
    setStatus("Stopping…", "ready");
    try {
      recognition.stop();
    } catch (error) {
      setControls(false);
      setStatus(`Could not stop recognition: ${error.message}`, "error");
    }
  });

  elements.clear.addEventListener("click", () => {
    finalTranscript = "";
    interimTranscript = "";
    renderTranscript();
    setStatus(listening ? "Transcript cleared. Still listening…" : "Transcript cleared.", listening ? "listening" : "ready");
  });

  elements.copy.addEventListener("click", async () => {
    const transcript = `${finalTranscript}${interimTranscript}`.trim();
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setStatus("Transcript copied to clipboard.", listening ? "listening" : "ready");
    } catch {
      setStatus("Clipboard access was blocked. Select the transcript and copy it manually.", "error");
    }
  });

  if (!Recognition) {
    setControls(false);
    elements.start.disabled = true;
    elements.stop.disabled = true;
    elements.language.disabled = true;
    setStatus("Speech recognition is not available in this browser. Open this page in a supported browser such as Chrome or Edge.", "error");
  }

  renderTranscript();
})();
