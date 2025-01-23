# ERCO-scraping

## Description
Application of ERCO energy suppliers scraping

## SELECTORES.docx

Document with the HTML selectors for each of the scraped pages, which are changed according to changes in the pages.

### server/index.js 

Script that allows start the express server. This allows you to return data through HTML requests.

### server/scrapers.js 

Script that allows scraping the suppliers page using puppeteer.

### server/dbplants.js  

Script that allows start control the MySQL db connection using sequalize.

