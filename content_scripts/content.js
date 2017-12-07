"use strict";

// Open the port to communicate with the background script.
const port = browser.runtime.connect({ name: "cs-port" });

// Handle background script messages.
port.onMessage.addListener(message => {
  if (message.action === "highlight") {
    highlightSelector(message.data);
  }
});

// Helper to send messages back to the background script.
function sendFeedback(message) {
  port.postMessage(message);
}

// Keep track of all highlighted elements so we can un-highlight them.
let currentlyHighlighted = [];

function unhighlightAll() {
  for (let node of currentlyHighlighted) {
    unhighlightNode(node);
  }
  currentlyHighlighted = [];
}

function highlightSelector({ selector }) {
  unhighlightAll();

  let nodes = [];

  try {
    nodes = [...document.querySelectorAll(selector)];
  } catch (e) {
    sendFeedback({
      type: "selectorerror",
      message: "This selector is not valid",
      error: e.message
    });
    return;
  }

  for (let node of nodes) {
    highlightNode(node);
    currentlyHighlighted.push(node);
  }

  sendFeedback({
    type: "selectorok",
    message: `Matched ${nodes.length} elements on the page`
  })
}

const STYLING_ATTRIBUTE = "__devtools_highlighted";

function highlightNode(node) {
  node.setAttribute(STYLING_ATTRIBUTE, true);
}

function unhighlightNode(node) {
  node.removeAttribute(STYLING_ATTRIBUTE);
}
