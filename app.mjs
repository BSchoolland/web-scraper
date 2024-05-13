import WebScraper from "./webScraper.mjs";
// Configuration for the web scraper specifying the start URL and the selectors to be used.
const config = {
  _id: "example_com_sitemap",
  startUrl: ["https://example.com/"],
  selectors: [
    {
      id: "title",
      type: "SelectorText",
      selector: "h1",
      multiple: false,
      parentSelectors: ["_root"],
    },
    {
      id: "description",
      type: "SelectorText",
      selector: "p:nth-of-type(1)",
      multiple: false,
      parentSelectors: ["_root"],
    },
  ],
};

// example usage
async function main() {
  try {
    // Initialize the web scraper with the given configuration.
    const scraper = new WebScraper(config, 3);
    await scraper.initialize();

    // Start the data scraping process.
    await scraper.scrapeData();

    // Query the scraper for data collected from pages with '_root' selectors.
    const data = await scraper.queryPage("_root");

    // Display the scraped data.
    console.log("Title: ", data[0].title[0].text);
    console.log("Description: ", data[0].description[0].text);

    // Close the scraper to free up resources.
    await scraper.close();
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();