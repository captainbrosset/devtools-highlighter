/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let browser = window.browser || chrome;

// Waiting for a connection from the content script and storing the port.
let contentScriptPort;
browser.runtime.onConnect.addListener(port => {
  contentScriptPort = port;
  contentScriptPort.onMessage.addListener(message => {
    message.tabId = contentScriptPort.sender.tab.id;
    sendToDevToolsPanel(message);
  });
});

// Also handle messages from the devtools panel.
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.url != browser.runtime.getURL("/devtools/panel/panel.html")) {
    return;
  }

  sendToContentScript(request);
});

function sendToContentScript(message) {
  if (!contentScriptPort) {
    console.error("Can't send message to content script, port not open");
    return;
  }
  contentScriptPort.postMessage(message);
}

function sendToDevToolsPanel(message) {
  browser.runtime.sendMessage(message);
}
