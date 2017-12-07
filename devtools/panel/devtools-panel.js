"use strict";

const inputEl = document.querySelector("#selector");
const messageEl = document.querySelector("#message");
const unlimitedCheckboxEl = document.querySelector("#unlimited");
const typeSelectEl = document.querySelector("#type");

inputEl.addEventListener("input", sendRequest);
unlimitedCheckboxEl.addEventListener("input", sendRequest);
typeSelectEl.addEventListener("input", sendRequest);

function sendRequest () {
  let query = inputEl.value.trim();
  if (!query) {
    displayMessage("");
    return;
  }

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "highlight",
    type: typeSelectEl.value,
    options: {
      unlimited: unlimitedCheckboxEl.checked
    },
    query,
  });
}

// Handle messages from the background script.
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.tabId !== browser.devtools.inspectedWindow.tabId) {
    return;
  }

  if (request.type === "ok") {
    displayMessage(request.message);
  } else if (request.type === "error") {
    displayErrorMessage(request.message, request.error);
  }
});

function displayMessage(message) {
  messageEl.dataset.type = "log";
  messageEl.textContent = message;
}

function displayErrorMessage(message, error) {
  displayMessage(`message (${error})`);
  messageEl.dataset.type = "error";
}
