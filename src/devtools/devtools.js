/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Firefox expects path relative it this file
// Chrome expects path relative to the extension directory
let paneTemplate = window.browser ? 'panel/panel.html' : 'devtools/panel/panel.html';

// All DevTools APIs are name-spaced in "chrome" in Chrome
// Firefox has them on window.browser
let browser = window.browser || chrome;

function handleShown() {
  console.log("panel is being shown");
}

function handleHidden() {
  console.log("panel is being hidden");
}

// In chrome this function
// doesn't return a promise
browser.devtools.panels.create(
  "Highlighter",
  "../icons/logo.svg",
  paneTemplate,
  panel => {
    panel.onShown.addListener(handleShown);
    panel.onHidden.addListener(handleHidden);
  }
);
