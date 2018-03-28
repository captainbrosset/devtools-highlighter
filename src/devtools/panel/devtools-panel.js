/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let browser = window.browser || chrome;

// Used to shorten strings in the panel (attributes).
const MAX_STR_SIZE = 30;
// Used when long strings are shortened.
const ELLIPSIS = "…";
// Used to limit the number of attributes displayed in the panel.
const MAX_ATTR_NB = 5;

// Used to store the unique selectors of currently found nodes.
let currentUniqueSelectors = [];

// The various useful DOM elements in the panel.
const inputEl = document.querySelector("#query");
const messageEl = document.querySelector("#message");
const unlimitedCheckboxEl = document.querySelector("#unlimited");
const typeSelectEl = document.querySelector("#type");
const outputEl = document.querySelector(".output");
const nodeListEl = document.querySelector("#nodes");
const countEl = document.querySelector(".count");
const clearButtonEl = document.querySelector(".clear");
const outlineColorSelectorEl = document.querySelector("#color-selector")

// Start listening for events in the panel, to handle user inputs.
inputEl.addEventListener("input", find);
unlimitedCheckboxEl.addEventListener("input", find);
typeSelectEl.addEventListener("input", find);
clearButtonEl.addEventListener("click", clear);
window.addEventListener("click", handleButtonClick);
window.addEventListener("mouseover", handleNodeOver);
window.addEventListener("mouseout", handleNodeOut);
outlineColorSelectorEl.addEventListener("input", updateOutlineColor);

/**
 * Notifies the content script to update the color
 * when the user selects a new color
 */
function updateOutlineColor() {
  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "updateOutlineColor",
    options: {
      color: outlineColorSelectorEl.value
    },
  });
}

/**
 * Execute the current query by sending a message to the content script, which will find
 * all matching nodes (or may send an error message back).
 */
function find() {
  let query = inputEl.value.trim();
  if (!query) {
    clear();
    return;
  }

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "find",
    type: typeSelectEl.value,
    options: {
      unlimited: unlimitedCheckboxEl.checked
    },
    query
  });
}

// Handle messages from the background script.
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.tabId !== browser.devtools.inspectedWindow.tabId) {
    return;
  }

  let { error, nodes, type } = request;

  // Remember the unique selectors, they'll be useful later when selecting nodes in the
  // inspector.
  currentUniqueSelectors = nodes.map(({uniqueSelector}) => uniqueSelector);

  displayMessage(error, nodes);
  displayNodes(nodes);
});

/**
 * Handle a successful response from the content script: nodes were found and highlighted.
 * @param {Array} nodes The list of nodes which were found and highlighted.
 */
function displayNodes(nodes) {
  // Clear the output.
  nodeListEl.innerHTML = "";
  countEl.innerHTML = "";

  outputEl.classList.toggle("has-nodes", !!nodes.length);

  // Display all nodes.
  nodes.forEach(node => {
    let nodeEl = document.createElement("li");

    appendNodePreview(node, nodeEl);

    if (!node.isHidden) {
      let scrollButtonEl = document.createElement("button");
      scrollButtonEl.classList.add("scroll");
      scrollButtonEl.textContent = "scroll to";
      nodeEl.appendChild(scrollButtonEl);
    }

    let selectButtonEl = document.createElement("button");
    selectButtonEl.classList.add("select");
    selectButtonEl.textContent = "select";
    nodeEl.appendChild(selectButtonEl);

    nodeListEl.appendChild(nodeEl);
  });

  // Display the number of results.
  if (nodes.length) {
    countEl.textContent = `${nodes.length} results`;
  }
}

/**
 * Append one node in the output.
 * @param {Object} nodeData Some data about the node:
 * - nodeName {String} The name of the node.
 * - attributes {Array} All attributes as {name, value} objects.
 * - isHidden {Boolean} Is the node rendered or not?
 * @param {DOMNode} parentEl Where in the DOM to attach the node preview.
 */
function appendNodePreview({ nodeName, attributes, isHidden }, parentEl) {
  let previewEl = document.createElement("span");
  previewEl.classList.add("preview");
  if (isHidden) {
    previewEl.classList.add("hidden");
  }
  previewEl.appendChild(document.createTextNode("<"));

  let nameEl = document.createElement("span");
  nameEl.classList.add("node-name");
  nameEl.textContent = shortenPreviewStr(nodeName.toLowerCase());
  previewEl.appendChild(nameEl);

  // Always display the id and class attributes first if they are present, and then the
  // rest until MAX_ATTR_NB is reached.
  let initialAttributesLength = attributes.length;
  attributes = attributes.sort((a, b) => {
    if (a.name === "id") return -1;
    if (b.name === "id") return 1;
    if (a.name === "class") return -1;
    return 1;
  }).splice(0, MAX_ATTR_NB);

  for (let { name, value } of  attributes) {
    let attrEl = document.createElement("span");
    attrEl.classList.add("attribute");

    let nameEl = document.createElement("span");
    nameEl.classList.add("name");
    nameEl.textContent = shortenPreviewStr(name);
    attrEl.appendChild(nameEl);

    attrEl.appendChild(document.createTextNode("=\""));

    let valueEl = document.createElement("span");
    valueEl.classList.add("value");
    valueEl.textContent = shortenPreviewStr(value);
    attrEl.appendChild(valueEl);

    attrEl.appendChild(document.createTextNode("\""));

    previewEl.appendChild(attrEl);
  }

  // If there were more attributes, let the user know.
  if (initialAttributesLength > MAX_ATTR_NB) {
    previewEl.appendChild(document.createTextNode(" " + ELLIPSIS));
  }

  previewEl.appendChild(document.createTextNode(">"));

  parentEl.appendChild(previewEl);
}

/**
 * Make a string shorter if needed.
 * @param {String} str The string.
 * @return {String} The shorter string, or the same string if it wasn't long.
 */
function shortenPreviewStr(str) {
  if (str.length > MAX_STR_SIZE) {
    return str.substring(0, MAX_STR_SIZE) + ELLIPSIS;
  }
  return str;
}

/**
 * Handle a response from the content script by displaying an error message if needed.
 * @param {String} error The error message if any.
 * @param {Array} nodes The list of nodes.
 */
function displayMessage(error, nodes) {
  messageEl.innerHTML = "";

  if (error) {
    messageEl.dataset.type = "error";
    messageEl.textContent = error;
  } else if (!nodes.length) {
    messageEl.dataset.type = "ok";
    messageEl.textContent = "Query did not match any node";
  } else {
    messageEl.dataset.type = "ok";
  }
}

/**
 * Based on the current list of nodes displayed in the output, find the index of one of
 * them.
 * @param {DOMNode} nodeEl One of the nodes displayed in the panel.
 * @return {Number} The iundex of this node.
 */
function getNodeIndex(nodeEl) {
  return [...nodeEl.parentNode.children].indexOf(nodeEl);
}

/**
 * Handle a click in the panel. Only allow clicks on the select and scroll buttons.
 * @param {DOMEvent} event The event object.
 */
function handleButtonClick({ target }) {
  let isSelectButton = target.tagName.toLowerCase() == "button" &&
                       target.classList.contains("select");
  let isSrollButton = target.tagName.toLowerCase() == "button" &&
                      target.classList.contains("scroll");

  if (!isSrollButton && !isSelectButton) {
    return;
  }

  let nodeEl = target.closest("li");
  let index = getNodeIndex(nodeEl);

  if (isSrollButton) {
    handleScrollButtonClick(index);
  } else if (isSelectButton) {
    handleSelectButtonClick(index);
  }
}

/**
 * Handle a click on the scroll button of one given node preview in the ouptut.
 * @param {Number} nodeIndex The index of the node which scroll button has been clicked.
 */
function handleScrollButtonClick(nodeIndex) {
  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "scrollIntoView",
    index: nodeIndex
  });
}

/**
 * Handle a click on the select button of one given node preview in the ouptut.
 * @param {Number} nodeIndex The index of the node which select button has been clicked.
 */
function handleSelectButtonClick(nodeIndex) {
  let selector = currentUniqueSelectors[nodeIndex];
  browser.devtools.inspectedWindow.eval(`inspect(document.querySelector('${selector}'));`);
}

// Remember if the mouse was over a node in the output.
var wasOver = false;

/**
 * Handle a mouseover in the panel. Only process events on node previews in the output,
 * and use this event to highlight the node in the page.
 * @param {DOMEvent} event.
 */
function handleNodeOver({ target }) {
  let nodeEl = target.closest("#nodes li");
  if (!nodeEl || nodeEl.querySelector(".preview.hidden")) {
    return;
  }

  wasOver = true;
  let index = getNodeIndex(nodeEl);

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "highlight",
    index
  });
}

/**
 * Handle a mouseout in the panel. Only process events on node previews in the output,
 * and use this event to un-highlight the node in the page.
 * @param {DOMEvent} event.
 */
function handleNodeOut({ target }) {
  if (!wasOver) {
    return;
  }
  wasOver = false;

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "unhighlight"
  });
}

/**
 * Clear the output.
 */
function clear() {
  displayNodes([]);
  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "clear"
  });
  inputEl.value = "";
}
