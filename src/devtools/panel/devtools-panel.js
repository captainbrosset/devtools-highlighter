/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let browser = window.browser || chrome;

const MAX_STR_SIZE = 30;
const MAX_ATTR_NB = 5;
const ELLIPSIS = "…";

const inputEl = document.querySelector("#query");
const messageEl = document.querySelector("#message");
const unlimitedCheckboxEl = document.querySelector("#unlimited");
const typeSelectEl = document.querySelector("#type");
const outputEl = document.querySelector(".output");
const nodeListEl = document.querySelector("#nodes");
const countEl = document.querySelector(".count");
const clearButtonEl = document.querySelector(".clear");

inputEl.addEventListener("input", findAndHighlight);
unlimitedCheckboxEl.addEventListener("input", findAndHighlight);
typeSelectEl.addEventListener("input", findAndHighlight);
clearButtonEl.addEventListener("click", clear);
window.addEventListener("click", handleButtonClick);
window.addEventListener("mouseover", handleNodeOver);
window.addEventListener("mouseout", handleNodeOut);

function findAndHighlight() {
  let query = inputEl.value.trim();
  if (!query) {
    clear();
    return;
  }

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "findAndHighlight",
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

  displayMessage(error, nodes);
  displayNodes(nodes);
});

function displayNodes(nodes) {
  nodeListEl.innerHTML = "";
  countEl.innerHTML = "";

  outputEl.classList.toggle("has-nodes", !!nodes.length);

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

  if (nodes.length) {
    countEl.textContent = `${nodes.length} results`;
  }
}

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

function shortenPreviewStr(str) {
  if (str.length > MAX_STR_SIZE) {
    return str.substring(0, MAX_STR_SIZE) + ELLIPSIS;
  }
  return str;
}

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

function getNodeIndex(nodeEl) {
  return [...nodeEl.parentNode.children].indexOf(nodeEl);
}

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
    browser.runtime.sendMessage({
      tabId: browser.devtools.inspectedWindow.tabId,
      action: "scrollIntoView",
      index
    });
  } else if (isSelectButton) {
    // Does not work because useContentScriptContext doesn't seem to be supported on FF
    // browser.devtools.inspectedWindow.eval(`
    //   inspect(currentlyHighlighted[${index}]);
    // `, { useContentScriptContext: true });

    // Does not work because the content script doesn't seem to have access to inspect
    // browser.runtime.sendMessage({
    //   tabId: browser.devtools.inspectedWindow.tabId,
    //   action: "inspectOne",
    //   index
    // });
  }
}

var wasOver = false;
function handleNodeOver({ target }) {
  let nodeEl = target.closest("#nodes li");
  if (!nodeEl || nodeEl.querySelector(".preview.hidden")) {
    return;
  }

  wasOver = true;
  let index = getNodeIndex(nodeEl);

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "highlightOne",
    index
  });
}

function handleNodeOut({ target }) {
  if (!wasOver) {
    return;
  }
  wasOver = false;

  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "highlightAll"
  });
}

function clear() {
  displayNodes([]);
  browser.runtime.sendMessage({
    tabId: browser.devtools.inspectedWindow.tabId,
    action: "clear"
  });
  inputEl.value = "";
}
