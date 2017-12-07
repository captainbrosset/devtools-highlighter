function handleShown() {
  console.log("panel is being shown");
}

function handleHidden() {
  console.log("panel is being hidden");
}

browser.devtools.panels.create(
  "Highlighter",
  "icons/star.png",
  "devtools/panel/panel.html"
).then(panel => {
  panel.onShown.addListener(handleShown);
  panel.onHidden.addListener(handleHidden);
});
