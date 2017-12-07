"use strict";

const inputEl = document.querySelector("input");
const messageEl = document.querySelector("#message");

inputEl.addEventListener("input", () => {
  let selector = inputEl.value.trim();
  if (!selector) {
    displayMessage("");
    return;
  }

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "highlight",
    data: { selector }
  });
});

// Handle messages from the background script.
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.tabId !== browser.devtools.inspectedWindow.tabId) {
    return;
  }

  if (request.type === "selectorok") {
    displayMessage(request.message);
  } else if (request.type === "selectorerror") {
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
