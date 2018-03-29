/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// How many nodes are returned to the panel, at most, unless the unlimited options is
// passed.
const NODE_LIMIT = 100;

// Special attributes used by the extension. These attributes are added to nodes in the
// page.
const STYLING_ATTRIBUTE = "__devtools_highlighted";
const UNIQUE_ATTRIBUTE = "__devtools_unique";

// Global var to store the outline color
// used for highlighting elements
let outlineColor = "#f06";

// Open the port to communicate with the background script.
const browser = window.browser || chrome;
const port = browser.runtime.connect({ name: "cs-port" });

// Handle background script messages.
port.onMessage.addListener(message => {
  switch (message.action) {
    case "find":
      find(message);
      break;
    case "highlight":
      highlight(message.index);
      break;
    case "unhighlight":
      unhighlightAll();
      break;
    case "scrollIntoView":
      scrollIntoView(message.index);
      break;
    case "clear":
      clear();
      break;
    case "updateOutlineColor":
      updateOutlineColor(message.options.color);
      break;
  }
});

/**
 * Updates the global `outlineColor` variable with the new color
 */
function updateOutlineColor(color) {
  outlineColor = color;
}

// Helper to send messages back to the background script.
function sendResponse(message) {
  port.postMessage(message);
}

// Keep track of all highlighted elements so we can un-highlight them later.
let currentNodes = [];

/**
 * Clear all found nodes.
 */
function clear() {
  unhighlightAll();
  untagAll();
  currentNodes = [];
}

/**
 * Unhighlight all nodes at once, but keep the list so we can highlight them again later.
 */
function unhighlightAll() {
  for (let node of currentNodes) {
    unhighlightNode(node);
  }
}

/**
 * Untag (remove the unique IDs) of all nodes, but keep the list so we can go back to them
 * later.
 */
function untagAll() {
  for (let node of currentNodes) {
    untagNode(node);
  }
}

/**
 * Highlight just one node. So, unhighlight all others, and highlight just this one.
 * @param {Number} index The index of the node in the currentNodes array.
 */
function highlight(index) {
  if (!currentNodes || !currentNodes[index]) {
    return;
  }

  unhighlightAll();
  highlightNode(currentNodes[index]);
}

/**
 * Scroll one of the known nodes into view.
 * @param {Number} index The index of the node in the currentNodes array.
 */
function scrollIntoView(index) {
  if (!currentNodes || !currentNodes[index]) {
    return;
  }

  currentNodes[index].scrollIntoView({ behavior: "smooth" });
}

/**
 * Execute a query (of any supported type) to find nodes.
 * @param {Object} data The properties required here are:
 * - type {String} The type of query to run. Either computed or selector.
 * - query {String} The query itself
 * - options {Object} Options for executing the query, like unlimited {Boolean}
 */
function find({ type, query, options }) {
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
    tagNode(node);
    currentNodes.push(node);
  }

  let responseType = error ? "error" : "ok";

  sendResponse({
    type: responseType,
    nodes: nodes.map(createNodeResponse),
    error: error ? `Query failed ${error}` : null
  })
}

/**
 * Given a computed-style query, parse it to a list of commands.
 * @param {String} query The query to be parsed.
 * @return {Array} The list of commands.
 */
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

/**
 * Create a DOM tree walker that can find nodes based on a parsed computed style query.
 * @param {DOMNode} root The root DOM node where to start walking the DOM.
 * @param {String} name The property name to use in nodes' computed styles.
 * @param {String} op The operator to use to match the style value (!, ~ or empty string).
 * @param {String} value The property value to look for in nodes' computed styles.
 * @return {TreeWalker}
 */
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

/**
 * Given a parsed computed-style query, find all nodes in the page.
 * @param {DOMNode} root The root DOM node where to start walking the DOM.
 * @param {String} name The property name to use in nodes' computed styles.
 * @param {String} op The operator to use to match the style value (!, ~ or empty string).
 * @param {String} value The property value to look for in nodes' computed styles.
 * @return {Array} The list of nodes.
 */
function findNodesMatching(root, name, op, value) {
  const walker = getComputedStyleWalker(root, name, op, value);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
}

/**
 * Given a non-parsed computed-style query, find all nodes in the page.
 * @param {String} query The query to run.
 * @return {Object} A {nodes, error} object:
 * - nodes {Array} The list of matching nodes.
 * - error {String} A potential error when running the query.
 */
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

/**
 * Given a selector query, find all nodes in the page.
 * @param {String} query The query to run.
 * @return {Object} A {nodes, error} object:
 * - nodes {Array} The list of matching nodes.
 * - error {String} A potential error when running the query.
 */
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

// An unique number generator, useful for tagging elements that we want to select in the
// inspector later.
let nextUnique = (function uniqueNumberGenerator() {
  let uniqueNum = 0;
  return () => uniqueNum++ && uniqueNum
})();

/**
 * Highlight one node in the page.
 * @param {DOMNode} node The node to be highlighted.
 */
function highlightNode(node) {
  node.setAttribute(STYLING_ATTRIBUTE, true);
  updateOutline(node);
}

/**
 * Update the outline of the node
 * @param {DOMNode} node  The node whose outline needs to be updated 
 */
function updateOutline(node) {
  node.style.outline = `2px solid ${outlineColor}`
}

/**
 * Tag one node in the page, so we can then select it in the inspector.
 * @param {DOMNode} node The node to be tagged.
 */
function tagNode(node) {
  node.setAttribute(UNIQUE_ATTRIBUTE, nextUnique());
}

/**
 * Unhighlight one node in the page.
 * @param {DOMNode} node The node to be unhighlighted.
 */
function unhighlightNode(node) {
  node.removeAttribute(STYLING_ATTRIBUTE);
  resetOutline(node);
}

/**
 * Removes the outline from the node
 * @param {DOMNode} node  The node whose outline has to be removed 
 */
function resetOutline(node) {
  node.style.outline = "none";
}

/**
 * Untag one node in the page.
 * @param {DOMNode} node The node to be untagged.
 */
function untagNode(node) {
  node.removeAttribute(UNIQUE_ATTRIBUTE);
}

/**
 * Create a serializable response that represents a single node in the page, which can be
 * sent to the devtools panel.
 * @param {DOMNode} node The DOM node to be represented in the response.
 * @return {Object} The response object.
 */
function createNodeResponse(node) {
  // Getting all attributes as simple {name, value} objects.
  let attributes = [...node.attributes].map(({ name, value }) => ({ name, value }));

  // Getting the value of the unique identifier for this node and creating a special
  // attribute selector with it.
  let uniqueIdentifier = attributes.find(e => e.name === UNIQUE_ATTRIBUTE).value;
  let uniqueSelector = `[${UNIQUE_ATTRIBUTE}="${uniqueIdentifier}"]`;

  // Filtering the attributes to remove the special ones the extension is adding.
  attributes = attributes.filter(({ name }) => {
    return name !== UNIQUE_ATTRIBUTE && name !== STYLING_ATTRIBUTE;
  });

  return {
    nodeName: node.nodeName,
    attributes,
    isHidden: !node.getClientRects || !node.getClientRects().length,
    uniqueSelector
  };
}
