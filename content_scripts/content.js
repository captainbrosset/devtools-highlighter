"use strict";

const NODE_LIMIT = 100;
const STYLING_ATTRIBUTE = "__devtools_highlighted";

// Open the port to communicate with the background script.
const port = browser.runtime.connect({ name: "cs-port" });

// Handle background script messages.
port.onMessage.addListener(message => {
  if (message.action === "highlight") {
    highlight(message);
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

function highlight({ type, query, options }) {
  unhighlightAll();

  let nodes = [];
  let error = null;

  switch (type) {
    case "computed":
      ({ nodes, error } = matchNodesFromComputedStyle(query));
      break;
    case "selector":
    default:
      ({ nodes, error } = matchNodesFromSelector(query));
      break;
  }

  if (!options.unlimited) {
    nodes = nodes.splice(0, NODE_LIMIT);
  }

  for (let node of nodes) {
    highlightNode(node);
    currentlyHighlighted.push(node);
  }

  let responseType = error ? "error" : "ok";
  let responseMessage = error
                        ? `Query failed ${error}`
                        : `Matched ${nodes.length} elements on the page`;

  sendFeedback({
    type: responseType,
    message: responseMessage,
  })
}

function matchNodesFromComputedStyle(query) {
  let [name, value] = query.split(":");
  let nodes = [];

  for (let node of [...document.getElementsByTagName("*")]) {
    let style = window.getComputedStyle(node);
    if (style[name] == value) {
      nodes.push(node);
    }
  }

  return { nodes };
}

function matchNodesFromSelector(query) {
  let nodes = [];
  let error;

  try {
    nodes = [...document.querySelectorAll(query)];
  } catch (e) {
    error = e.message;
  }

  return { nodes, error };
}

function highlightNode(node) {
  node.setAttribute(STYLING_ATTRIBUTE, true);
}

function unhighlightNode(node) {
  node.removeAttribute(STYLING_ATTRIBUTE);
}
