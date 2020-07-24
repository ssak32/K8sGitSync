const request = require("request-promise");
const cheerio = require("cheerio");
//const ObjectsToCsv = require('objects-to-csv');
const mongoose = require("mongoose");
const listingModel = require('./DbModel/ListingModel')

// Had connection with latest version of mongo db connection string. Changing to the older version worked fine.
const connectionString = "mongodb://craigslistuser:SuperStrongPassword1@craiglistlistings-shard-00-00.g6sm2.gcp.mongodb.net:27017,craiglistlistings-shard-00-01.g6sm2.gcp.mongodb.net:27017,craiglistlistings-shard-00-02.g6sm2.gcp.mongodb.net:27017/<dbname>?ssl=true&replicaSet=atlas-d9w5pa-shard-0&authSource=admin&retryWrites=true&w=majority";

async function scrapeListings(url){
        const html = await request.get(url);
        const $ = cheerio.load(html);

        results = $('.result-info').map((index, element) => {
            try{
                const titleElement = $(element).find('.result-title.hdrlnk');
                const timeElement = $(element).find('.result-date');
                const neighbourHoodElement = $(element).find('.result-hood');

                const title = $(titleElement).text().trim();
                const url = $(titleElement).attr('href');
                const time = new Date($(timeElement).attr('datetime'));
                const hood = $(neighbourHoodElement).text().trim().replace(/[()]/g,'');

                return {time, title, url, hood};
            }catch(err){
                console.error(err);
            }
        }).get(); //Using 'get()' at the end avoids binding nodejs related objects to the main object.

    return results;
}

async function scrapeJDs(listings){
    return await Promise.all(
        listings.map(async jd => {
            try{
                await sleep(1000);
                const html = await request.get(jd.url);
                const $ = cheerio.load(html);

                jd.compensation = $('.attrgroup > span').first().text().trim();
                jd.jobDescription = $('#postingbody').text().trim();

                return jd;
            }catch(err){
                console.error(err);
            }
        })
    );
}

async function sleep(miliseconds){
    return new Promise(resolve => setTimeout(resolve, miliseconds));
}

async function createCsvFile(data){
    let csv = new ObjectsToCsv(data);

    // Save to file:
    await csv.toDisk('./scrapedData.csv');
}

async function saveToMongoDb(listings){
    try{
        await mongoose.connect(connectionString, { useNewUrlParser: true,
                                                    useUnifiedTopology: true });
        console.log('Connected to MongoDB');

        for(let i=0; i<listings.length; i++)
        {
            let listingmodel = new listingModel(listings[i]);
            await listingmodel.save();
        }
    } catch(err){
        console.log(err);
    } finally {
        await mongoose.connection.close();
    }

}

async function scrape(){
    startUrl = "https://sfbay.craigslist.org/d/technical-support/search/tch";

    listings = await scrapeListings(startUrl);
    await saveToMongoDb(listings);
}

scrape();