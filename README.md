
# web-scraper

## Overview

This is my first attempt at creating a web scraper using puppeteer and cheerio. The scraper is designed to extract data from web pages by following links and extracting specific elements based on CSS selectors. The scraper is implemented as a class that can be configured with the help of the "web scraper" chrome extension. 

## Running this Repository

### Installation

To run this repository, you will need to have Node.js installed on your machine. You can download it [here](https://nodejs.org/en/download/).

After installing Node.js, you can clone this repository and install the dependencies by running the following commands:

```bash
git clone https://github.com/BSchoolland/web-scraper.git
cd web-scraper
npm install
```

### Running the Scraper

To run the example scraper, you can use the following command:

```bash
node app.mjs
```

This will launch the scraper and extract data from example.com. The extracted data will be logged to the console.

### Configuration
 Optionally, you can use the [web scraper chrome extension](https://chromewebstore.google.com/detail/web-scraper-free-web-scra/jnhgnonknehpejjnehehllkliplmbmhn?hl=en) to automatically generate the configuration object for a given website.  The extension allows you to create a JSON sitemap object that works with this scraper as the config.

`WebScraper` requires a configuration object to define the start URL and the selectors used for scraping:

- `startUrl`: An array containing a single URL string that serves as the entry point for the scraper.
- `selectors`: An array of selector objects that define how to extract specific data from the pages.

`WebScraper` also allows you to pass in an interger value that will limit the number of pages the scraper will visit.  This is useful for testing purposes.

### Selector Configuration

Each selector object may contain the following properties. 

- `id`: A unique identifier for the selector.
- `type`: The type of data to scrape (e.g., 'SelectorLink', 'SelectorText').
- `selector`: The CSS selector used to locate the element.
- `multiple`: A boolean indicating whether to collect multiple elements matching the selector.
- `parentSelectors`: An array of parent selector IDs that define the context for this selector.

### Methods

- `initialize()`: Prepares the scraper by launching a browser and opening the root page. 
- `scrapeData()`: Initiates the scraping process from the root page and recursively from all navigable child pages.
- `queryPage(SelectorId)`: Retrieves data for a specific type of page.
- `close()`: Closes the browser to free resources.

## Contributing

This project is far from complete and I would appreciate any contributions or feedback.  Please feel free to open an issue or submit a pull request!  

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.