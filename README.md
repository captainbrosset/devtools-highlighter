# What is this?

This is the code for a Firefox DevTools extension.

This extension adds a new panel to the toolbox. The panel allows users to search for nodes in the current page.

# Usage documentation

There are 2 ways to search within the panel:

* By using computed style queries.
* Or by using CSS selectors.

## Computed style queries

This is the main feature of this extension. It is very useful for finding elements on a page that have certain CSS computed styles.

For example, say you want to list all of the CSS grids on a page. You can use this query to do this `display:grid`.

The extension will simply loop through *all* elements on the page and only display the ones that do have their CSS computed `display` value set to `grid`.

You can also use a couple of operators to make searching more useful:

* `display:!block` will find all elements that have a `display` value other than `block`.
* `display:~flex` will find all elements that have a `display` value that includes the substring `flex`. So it will match elements that have it set to `inline-flex` and `flex`.

The extension also supports descendant queries. That means you can find elements that have a given style and that are descendant of elements that have another given style.

For instance `display:flex align-self:start` will find all elements with `align-self` set to `start` and that are descendants of a `display:flex` element.

## CSS selector queries

This is a more traditional way to search for elements in the page but can be useful too.

With this feature, you can simply type any CSS selector that would work with `document.querySelectorAll` and the matching elements will be listed and highlighted.

## Using the results

Once a search has returned results, they are displayed in the panel and they are all highlighted in the page too.

Hovering over a single result will highlight only the corresponding element.

It is also possible to scroll elements into view or select them in the inspector panel by clicking on corresponding links.

# Browser support

The extension has only been tested in Firefox, but uses WebExtension APIs, so in theory it should work in Chrome too.

# Helping!

So you want to help? Awesome!

Here are a few ways you can do that:
* You have an idea for a new feature: please describe it in [a new issue](https://github.com/captainbrosset/devtools-highlighter/issues/new).
* You have found a bug while using the extension: describing it in [a new issue](https://github.com/captainbrosset/devtools-highlighter/issues/new) would help a lot!
* You have found a typo, grammar error, or something that needs rephrasing in this documentation: great, fixing it will make it easier for other people to contribute in the future. See the contribution guide below.
* You know JavaScript, HTML and CSS and you want to improve the code, add a new feature or fix a bug? Even better! See the contribution guide below.

# Contributing code and documentation changes

This extension is written in JavaScript, with little bits of HTML and CSS, so you will need to be comfortable with those languages before starting.

There is absolutely no other pre-requisites or any other software to install. The only thing you will need is [the Firefox web browser](http://firefox.com), and at least version 57.

## Getting the code

* [Fork this repository](https://help.github.com/articles/fork-a-repo/) on your own GitHub user account.
* [Clone](https://help.github.com/articles/fork-a-repo/#step-2-create-a-local-clone-of-your-fork) your fork of the repository on your computer.

That's it! You have the code now.

## Running the extension locally

* Start Firefox.
* In the URL bar, type `about:debugging`.
* Make sure you are on the `Add-ons` tab.
* Press the `Load Temporary Add-on` button.
* A file explorer window should appear, in it, navigate to where you created the clone of the code.
* Select the `src/manifest.json` file and open.

That's it! Now if you open a new tab on any site, and open DevTools, you should see the extension in the toolbox.

## Making changes and reloading those changes

Now that you are set up with the development environment, you can start making changes to the code. To see those changes appear in Firefox, you will need to do the following:

* Close DevTools.
* Go back to `about:debugging`.
* Under where it says `devtools-highlighter` you will see 3 links. Click on the link that says `Reload`.
* Go back to your test tab, reload it (so the content script is reloaded), and open DevTools again.

That's it! You should now see your changes.

## Submitting code changes to this repository

Simply open [a pull request](https://help.github.com/articles/creating-a-pull-request/) and I'll try to review it quickly.

# Building the extension

This isn't necessary for working on the extension locally. This is needed only for deploying the extension to [AMO](http://addons.mozilla.org/).

* Make sure to install the dependencies first `npm install`
* Then run the build script with `npm run build`

# Technical documentation

Very much needed. In particular explaining what each scope is responsible for would be nice.

# Getting in touch

The best place to chat about this extension is on the [DevTools Slack](https://devtools-html-slack.herokuapp.com/), in the #addons channel. Ping @pbro.

# License

[MPL 2](./LICENSE)
