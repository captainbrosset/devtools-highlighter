/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function handleShown() {
  console.log("panel is being shown");
}

function handleHidden() {
  console.log("panel is being hidden");
}

browser.devtools.panels.create(
  "Highlighter",
  "../icons/logo.svg",
  "panel/panel.html"
).then(panel => {
  panel.onShown.addListener(handleShown);
  panel.onHidden.addListener(handleHidden);
});
