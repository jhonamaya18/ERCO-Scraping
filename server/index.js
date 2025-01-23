const express = require('express')
const app = express()
const port = 3000
const json = require('body-parser').json
const scrape = require('./scrapers.js').scrape
const db = require('./dbPlants')

app.use(json())
app.use(function(req, res, next){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
})
app.get('/plant', (req, res) => {
  db.connection();
  // get from DB
  db.findAllPlants(res)
})

app.get('/plant/:platform/:name', (req, res) => {
  db.connection();
  // get from DB
  console.log(req.params)
  db.findAllPlantsWhere(req,res)
})

app.get('/plant/:id', (req, res) => {
  db.connection();
  // get from DB
  db.findOnePlant(req,res)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function scraping(){
  while (true) {
    let Plants = await new Promise((resolve) => {
      resolve(scrape())
    }).then((res) => {return res});
    console.log('starting save data');
    db.savePlants(Plants);
    console.log('save data successful');
    await new Promise(resolve => setTimeout(resolve, 5000))
  }  
  
}

scraping()

