# What is this?

This is the code for a Firefox DevTools extension.

This extension adds a new panel to the toolbox. The panel allows users to search for nodes in the current page.

There are 2 ways to search:
* either by CSS selectors,
* or by computed style queries (e.g. `display:grid` will search for all element with a computed `display` value of `grid`. It is also possible to search for e.g. `display:!block` to find all non-blocks).

Once a search has returned results, they are displayed in the panel and all highlighted in the page. Hovering over a single result highlights only the corresponding element, and it is also possible to scroll the element into view.

The panel has only been tested in Firefox although, in theory, it should also work in Chrome since the same APIs should be supported there too.

# TODO

* Implement `inspect()` to select nodes in the inspector.
* Add options for the highlighter: change color, draw guides, etc.
* Implement a new highlight as a separate layer, like the DevTools one.
* Verify the tabId filtering thing (multiple devtools instances, multiple pages ...)
* Use a document walker for the css query engine instead of getElementsByTagName
* Add a clear icon to clear the current search and remove the highlighter.
* Auto-remove all highlighters on close/reload.
* Write some usage and contribution docs.
* Support the dark theme.

# License

[MPL 2](./LICENSE)
