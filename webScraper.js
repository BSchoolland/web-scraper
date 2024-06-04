import puppeteer from 'puppeteer';
import cheerio, { root } from 'cheerio';

// helper function to get the base URL from a full URL
function getBaseURL(url) {
    // get the base URL from the full search URL
    const urlParts = url.split('/');
    return `${urlParts[0]}//${urlParts[2]}`;
}
// class for the web scraper
class WebScraper {
    constructor(config, subPageTarget = 99999) {
        this.config = config;
        this.subPageTarget = subPageTarget + 1;
        this.rootPage = null;
        this.allPages = [];
        this.linksFound = 0;
        this.foundAll = false;
    }
    // get the scraper ready with a browser
    async initialize(browser = null) {
        // if a browser is not provided, create a new one
        if (!browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else {
            this.browser = browser;
        }
        // create the root page
        this.rootPage = new WebPage(this.config.startUrl[0], this.browser, '_root', this.config.selectors, this.subPageTarget);
        this.allPages.push(this.rootPage);
        // log that the scraper is ready
        console.log('Scraper initialized');
    }
    async scrapeData() {
        console.log('Scraping data...');
        // scrape the data
        await this.rootPage.scrapeData();
        // recursively scrape the data from the child pages
        await this.recursivePageScrape(this.rootPage, new Set());
        // all data has been scraped!
        console.log('Scraping complete:', this.allPages.length, 'pages scraped!');
    }

    async recursivePageScrape(PageObject, visited = new Set()) {
        // get the links on the page
        const links = await PageObject.getNavLinks();
        this.linksFound = this.linksFound + links.length;
    
        // get the next page link (if it exists)
        const nextPageLink = await PageObject.getNextPageLink();
    
        // Check if the next page has already been visited or not
        if (nextPageLink && !visited.has(nextPageLink)) {
            visited.add(nextPageLink);  // Mark this page as visited
            const NextPage = new WebPage(nextPageLink, this.browser, PageObject.SelectorId, this.config.selectors, this.subPageTarget);
            
            
            if (this.subPageTarget > visited.size){
                if (this.linksFound < this.subPageTarget){
                this.subPageTarget = this.subPageTarget + 1; // don't count the next page as a subpage
                this.allPages.push(NextPage);
                await NextPage.scrapeData();
                await this.recursivePageScrape(NextPage, visited);
                } else {
                    console.log('all links found');
                }
            }
        } else if (!nextPageLink && !this.foundAll) {
            console.log('found ', this.linksFound, ' links, no more pages to scrape');
            this.foundAll = true;
        }
    
        // loop through each link and scrape the data
        for (let i = 0; i < links.length; i++) {
            if (!visited.has(links[i].link)) {
                visited.add(links[i].link);  // Mark this link as visited
                const SubPage = new WebPage(links[i].link, this.browser, links[i].selectorID, this.config.selectors, this.subPageTarget);
                
                
                if (this.subPageTarget > visited.size){
                    PageObject.addChild(SubPage);
                    this.allPages.push(SubPage);
                    await SubPage.scrapeData();
                    await this.recursivePageScrape(SubPage, visited)
                } else {
                }
            }
        }
    }
    
    
    // query the scraped data
    async queryPage(SelectorId) {
        // finds all pages with the given SelectorId and returns data in json format
        let jsonObjects = [];
        this.allPages.forEach((page) => {
            if (page.SelectorId === SelectorId) {
                jsonObjects.push(page.getJsonData());
            }
        });
        return jsonObjects;
    }
    // close the browser
    async close() {
        await this.browser.close();
    }
}

// class for a web page
class WebPage {
    constructor(url, browser, SelectorId, allSelectors, subPageTarget = 99999) {
        this.url = url;
        this.browser = browser;
        // the ID of the selector used to obtain this page
        this.SelectorId = SelectorId; 
        // get the applicable selectors for this page
        this.selectors = this.getApplicableSelectors(SelectorId, allSelectors);
        // set the target number of subpages to scrape (99999 is pretty much all subpages)
        this.subPageTarget = subPageTarget;
        // initialize the page and data to null
        this.page = null;
        this.data = null;
        this.childPages = [];
    }
    // get the selectors that can be used to scrape data from this page
    getApplicableSelectors(parentSelectorId, allSelectors) {
        // get the selectors for this page based on the parent selector ID
        let selectors = []
        allSelectors.forEach((selector) => {
            // if the selector is a child of the parent selector, add it to the list
            if (selector.parentSelectors.includes(parentSelectorId)) {
                selectors.push(selector);
            }
        });
        return selectors;
    }
    // open the page in the browser
    async open() {
        this.page = await this.browser.newPage();
        // console.log('Opening page:', this.url);
        await this.page.goto(this.url, { waitUntil: 'networkidle0' });
    }
    // close the page
    async close() {
        await this.page.close();
        this.page = null;
    }
    // get the raw HTML data from the page
    async getHTMLData() {
        return (await this.page.content());
    }
    // get all objects from the page
    async scrapeData() {
        // start the page
        await this.open();
        // get the raw HTML data
        const rawHtmlData = await this.getHTMLData();
        // close the page
        await this.close();
        // use cheerio to parse the HTML data
        const $ = cheerio.load(rawHtmlData);
        // process the raw HTML data to get the objects
        let objects = {};
        // loop through each selector and get the object data
        for (let i = 0; i < this.selectors.length; i++) {
            const dataObject = this.ScrapeSelector(this.selectors[i], $);
            objects[this.selectors[i].id] = dataObject;
            
        }
        // store the objects in the page data
        this.data = objects;
    }

    // scrape data from a selector
    ScrapeSelector(selectorObject, $) {
        let multiple = false
        // figure out if there are multiple elements to scrape
        if (selectorObject.multiple) {
            multiple = true;
        } 
        // if the object is a link, get the link data
        if (selectorObject.type === 'SelectorLink') {
            return this.getLink(selectorObject.selector, $, selectorObject.id, multiple);
        }
        // if the object is a text, get the text data
        if (selectorObject.type === 'SelectorText') {
            return this.getText(selectorObject, $, multiple);
        }
        // if the selector is HTML, get the raw HTML data
        if (selectorObject.type === 'SelectorHTML') {
            return [ {
                type: "html",
                SelectorId: selectorObject.id,
                html: $.html(selectorObject.selector),
            } ];
        }
        // if the selector is pagination, get the pagination data
        if (selectorObject.type === 'SelectorPagination') {
            return this.getPagination(selectorObject, $);
        }
    }
    // get the link data
    getLink(selector, $, selectorID, multiple) {
        // get the root URL
        const baseURL = getBaseURL(this.url);
        let data = [];
        if (multiple) {
            $(selector).each((i, elem) => {
                let link = $(elem).attr('href');
                if (!link.startsWith('http')) {
                    link = baseURL + link;
                }
                data.push(
                    {
                    type: 'link',
                    selectorID: selectorID,
                    text: $(elem).text().trim(),
                    link: link
                }
            );
            });
        } else {
            let link = $(elem).attr('href');
            if (!link.startsWith('http')) {
                link = baseURL + link;
            }
            data = [
                {
                type: 'link',
                selectorID: selectorID,
                text: $(selector).text().trim(),
                link: link
            }
        ];
        }
        return data;
    }
    // get the text data
    getText(selectorObject, $, multiple) {
        let data = [];
        if (multiple) {
            $(selectorObject.selector).each((i, elem) => {
                data.push(
                    {
                        type: 'text',
                        text: $(elem).text().trim()
                    }
                );
            });
        } else {
            data = [
                {
                    type: 'text',
                    text: $(selectorObject.selector).text().trim()
                }
            ];
        }
        return data;
    }

    getPagination(selectorObject, $) {
        let data = [];
        const baseURL = getBaseURL(this.url);
        $(selectorObject.selector).each((i, elem) => {
            data.push(
                {
                    type: 'pagination',
                    text: $(elem).text().trim(),
                    link: baseURL + $(elem).attr('href')
                }
            );
        });

        return data;
    }

    // get the navigation links on the page (after scraping the data)
    async getNavLinks() {
        // get the links from the data
        let links = [];
        // search through the data object for links
        for (let key in this.data) {
            // get the link data
            let linkData = this.data[key];
            if (linkData === undefined) {
                continue;
            }
            // loop through the link data
            linkData.forEach((link) => {
                try {
                    // if the link is a valid URL, add it to the list
                    if (link.link && link.link.startsWith('http')) {
                        links.push(link);
                    }
                } catch (e) {
                    console.warn('FIXME: Error in getNavLinks')
                }
            });
        }
        // if a subpage target is set, limit the number of links
        if (links.length > this.subPageTarget) {
            links = links.slice(0, this.subPageTarget);
        }
        return links;
    }

    getNextPageLink() {
        // get the next page link from the data
        let nextPage = null;
        // search through the data object for pagination links
        for (let key in this.data) {
            // get the pagination data
            let paginationData = this.data[key];
            if (paginationData === undefined) {
                console.log(key, "is undefined");
                continue;
            }
            // loop through the pagination data
            paginationData.forEach((link) => {
                try {
                    // if it is pagination data, add it to the list
                    if (link.type === 'pagination' && link.link && link.link.startsWith('http')) {
                        nextPage = link;
                    }
                } catch (e) {
                    console.warn('FIXME: Error in getNextPageLink')
                }
            });
        }
        if (!nextPage) {
            return null;
        }

        return nextPage.link;
    }

    // add a child page
    addChild(childPage) {
        this.childPages.push(childPage);
    }
    // get the JSON data from the page
    getJsonData() {
        // get the data in JSON format, but also the link to the page
        let data = this.data;
        data.link = this.url;
        return data;
    }
}

export default WebScraper;