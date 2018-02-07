/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const NODE_LIMIT = 100;
const STYLING_ATTRIBUTE = "__devtools_highlighted";

// Open the port to communicate with the background script.
let browser = window.browser || chrome;
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
    case "clear":
      clear();
      break;
  }
});

// Helper to send messages back to the background script.
function sendResponse(message) {
  port.postMessage(message);
}

// Keep track of all highlighted elements so we can un-highlight them.
let currentlyHighlighted = [];

function clear() {
  unhighlightAll();
  currentlyHighlighted = [];
}

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
  clear();

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
  let re = /([^: ]+):([~!]{0,1})([^:~! ]+)/g;
  let commands = [];

  while (true) {
    var result = re.exec(query);
    if (!result) break;
    commands.push({
      name: result[1],
      op: result[2],
      value: result[3]
    });
  }

  if (commands.length !== query.split(/[ ]+/g).filter(s => s).length) {
    return [];
  }

  return commands;
}

function getComputedStyleWalker(root, name, op, value) {
  const filter = {
    acceptNode: node => {
      let style = window.getComputedStyle(node);
      if (op == "!" && style[name] != value) {
        return NodeFilter.FILTER_ACCEPT;
      } else if (op == "~" && style[name].includes(value)) {
        return NodeFilter.FILTER_ACCEPT;
      } else if (op == "" && style[name] == value) {
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    }
  };

  return document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter);
}

function findNodesMatching(root, name, op, value) {
  const walker = getComputedStyleWalker(root, name, op, value);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
}

function findNodesFromComputedStyle(query) {
  let commands = parseComputedStyleQuery(query);
  if (!commands.length) {
    return { nodes: [], error: "Invalid query" };
  }

  let roots = [document.documentElement];
  let nodes = [];

  for (let i = 0; i < commands.length; i ++) {
    const { name, op, value } = commands[i];

    nodes = [];
    for (let root of roots) {
      nodes = nodes.concat(findNodesMatching(root, name, op, value));
    }

    roots = nodes;
  }

  return { nodes: roots };
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
