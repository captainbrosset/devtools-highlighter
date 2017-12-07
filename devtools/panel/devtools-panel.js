"use strict";

const MAX_STR_SIZE = 30;
const MAX_ATTR_NB = 10;

const inputEl = document.querySelector("#query");
const messageEl = document.querySelector("#message");
const unlimitedCheckboxEl = document.querySelector("#unlimited");
const typeSelectEl = document.querySelector("#type");
const outputEl = document.querySelector(".output");
const nodeListEl = document.querySelector("#nodes");
const countEl = document.querySelector(".count");

inputEl.addEventListener("input", findAndHighlight);
unlimitedCheckboxEl.addEventListener("input", findAndHighlight);
typeSelectEl.addEventListener("input", findAndHighlight);
window.addEventListener("click", handleButtonClick);
window.addEventListener("mouseover", handleNodeOver);
window.addEventListener("mouseout", handleNodeOut);

function findAndHighlight() {
  let query = inputEl.value.trim();
  if (!query) {
    displayMessage("");
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

  if (error) {
    outputEl.classList.toggle("has-nodes", false);
    displayMessage(error, "error");
    countEl.innerHTML = "";
  } else if (nodes.length) {
    outputEl.classList.toggle("has-nodes", true);
    displayNodes(nodes);
    countEl.textContent = `${nodes.length} results`;
  } else {
    outputEl.classList.toggle("has-nodes", false);
    displayMessage("Query did not match any node", "ok");
    countEl.innerHTML = "";
  }
});

function displayNodes(nodes) {
  nodeListEl.innerHTML = "";

  nodes.forEach(node => {
    let nodeEl = document.createElement("li");

    appendNodePreview(node, nodeEl);

    let scrollButtonEl = document.createElement("button");
    scrollButtonEl.classList.add("scroll");
    scrollButtonEl.textContent = "scroll to";
    nodeEl.appendChild(scrollButtonEl);

    let selectButtonEl = document.createElement("button");
    selectButtonEl.classList.add("select");
    selectButtonEl.textContent = "select";
    nodeEl.appendChild(selectButtonEl);

    nodeListEl.appendChild(nodeEl);
  });
}

function appendNodePreview({ nodeName, attributes }, parentEl) {
  let previewEl = document.createElement("span");
  previewEl.classList.add("preview");
  previewEl.appendChild(document.createTextNode("<"));

  let nameEl = document.createElement("span");
  nameEl.classList.add("node-name");
  nameEl.textContent = shortenPreviewStr(nodeName.toLowerCase());
  previewEl.appendChild(nameEl);

  if (attributes.length > MAX_ATTR_NB) {
    attributes = attributes.splice(0, MAX_ATTR_NB);
  }

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

  previewEl.appendChild(document.createTextNode(">"));

  parentEl.appendChild(previewEl);
}

function shortenPreviewStr(str) {
  if (str.length > MAX_STR_SIZE) {
    return str.substring(0, MAX_STR_SIZE) + "…";
  }
  return str;
}

function displayMessage(message, type) {
  messageEl.dataset.type = type;
  messageEl.textContent = message;
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
  if (!nodeEl) {
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
