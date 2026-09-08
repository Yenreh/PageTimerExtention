# Store listing

Copy-paste text for the Chrome Web Store and addons.mozilla.org submissions.

## Short description (132 characters max)

Measures page load time and breaks it down into request, response, DOM, scripts and load phases. Only on the sites you enable.

## Description

Page Timer measures how long a web page takes to load and shows the individual
phases of the load, so you can see where the time actually goes:

- Request, Response, DOM, Parse, Execute Scripts, Content loaded, Sub Resources and Load event
- Duration bars to compare phases at a glance, plus the total in the badge
- Per-site switch: the extension only measures the origins you explicitly enable
- Download the metrics as JSON
- English and Spanish interface, light and dark mode

The extension does not collect, store or transmit any personal data. Everything
stays in your browser.

## Single purpose

Page Timer measures how long a web page takes to load and breaks the time down
into its phases (request, response, DOM, scripts, sub-resources, load event), so
a developer can see where the loading time goes. It only measures the sites the
user explicitly enables.

## Permission justifications

**tabs**
Read the URL of the active tab so the extension knows which origin the metrics
belong to, and reload that tab when the user presses Refresh.

**activeTab**
Read the URL and identity of the tab the user is looking at when the popup is
opened.

**scripting**
Inject the content script that reads the page's Navigation Timing API. It is
injected only into origins the user has enabled with the toggle in the popup.

**Host permission (<all_urls>)**
The user decides which sites to measure, so the hosts cannot be known in
advance. Despite the broad declaration, the content script runs only on the
origins the user enabled with the toggle; no other site is accessed.

**storage**
Store locally which origins the user enabled and the last metrics of each tab.
No data leaves the browser.

**Remote code**
No, I am not using remote code. All HTML, CSS and JavaScript is included in the
package.

## Data usage

No user data is collected, stored or transmitted. The extension makes no network
requests.
