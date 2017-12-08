/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const NODE_LIMIT = 100;
const STYLING_ATTRIBUTE = "__devtools_highlighted";

// Open the port to communicate with the background script.
const port = browser.runtime.connect({ name: "cs-port" });

// Handle background script messages.
port.onMessage.addListener(message => {
  switch (message.action) {
    case "findAndHighlight":
      findAndHighlight(message);
      break;
    case "highlightOne":
      highlightOne(message.index);
      break;
    case "highlightAll":
      reHighlightAll();
      break;
    case "inspectOne":
      inspectOne(message.index);
      break;
    case "scrollIntoView":
      scrollIntoView(message.index);
      break;
  }
});

// Helper to send messages back to the background script.
function sendResponse(message) {
  port.postMessage(message);
}

// Keep track of all highlighted elements so we can un-highlight them.
let currentlyHighlighted = [];

function unhighlightAll() {
  for (let node of currentlyHighlighted) {
    unhighlightNode(node);
  }
}

function highlightOne(index) {
  if (!currentlyHighlighted || !currentlyHighlighted[index]) {
    return;
  }

  unhighlightAll();
  highlightNode(currentlyHighlighted[index]);
}

function reHighlightAll() {
  for (let node of currentlyHighlighted) {
    highlightNode(node);
  }
}

function inspectOne(index) {
  if (!currentlyHighlighted || !currentlyHighlighted[index]) {
    return;
  }

  // TODO: find a way to make this work.
}

function scrollIntoView(index) {
  if (!currentlyHighlighted || !currentlyHighlighted[index]) {
    return;
  }

  currentlyHighlighted[index].scrollIntoView({ behavior: "smooth" });
}

function findAndHighlight({ type, query, options }) {
  unhighlightAll();
  currentlyHighlighted = [];

  let nodes = [];
  let error = null;

  switch (type) {
    case "computed":
      ({ nodes, error } = findNodesFromComputedStyle(query));
      break;
    case "selector":
    default:
      ({ nodes, error } = findNodesFromSelector(query));
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

  sendResponse({
    type: responseType,
    nodes: nodes.map(createNodeResponse),
    error: error ? `Query failed ${error}` : null
  })
}

function parseComputedStyleQuery(query) {
  let match = query.match(/[^:]+:[^:]+/);
  if (!match || match[0] !== query) {
    return null;
  }

  let [name, value] = query.split(":");
  name = name.trim();
  value = value.trim();

  if (value == "!") {
    return null;
  }

  return { name, value };
}

function findNodesFromComputedStyle(query) {
  let parsed = parseComputedStyleQuery(query);
  if (!parsed) {
    return { nodes: [], error: "Invalid query" };
  }

  let { name, value } = parsed;
  let nodes = [];

  const filter = {
    acceptNode: node => {
      let style = window.getComputedStyle(node);
      if (value.startsWith("!") && style[name] != value.substring(1)) {
        return NodeFilter.FILTER_ACCEPT;
      } else if (style[name] == value) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    }
  };

  const walker = document.createTreeWalker(document.documentElement,
                                           NodeFilter.SHOW_ELEMENT,
                                           filter);

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  return { nodes };
}

function findNodesFromSelector(query) {
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

function createNodeResponse(node) {
  return {
    nodeName: node.nodeName,
    attributes: [...node.attributes]
                .filter(({ name }) => name !== STYLING_ATTRIBUTE)
                .map(({ name, value }) => ({ name, value })),
    isHidden: !node.getBoxQuads || !node.getBoxQuads().length
  }
}
