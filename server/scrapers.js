// NODE MODULES

require('dotenv').config(); 
const puppeteer = require("puppeteer-extra") // Scraping library
const fs = require ('fs') // Manage files from system
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(StealthPlugin({
  enabledEvasions: new Set(["chrome.app", "chrome.csi", "defaultArgs", "navigator.plugins"])
}))
const Rembrandt = require('rembrandt') // library to compare images
const Jimp = require('jimp') // image processing
const pixelmatch = require('pixelmatch') // pixel level comparisson
const { cv } = require('opencv-wasm');
const { PassThrough } = require('stream');
const { Console } = require('console');
const TIMEOUT = parseInt(process.env.TIMEOUT);




//  sleepES5 function receives:
// - ms: miliseconds that the program need to sleep

var sleepES5 = function(ms){
    var esperarHasta = new Date().getTime() + ms;
    while(new Date().getTime() < esperarHasta) continue;
};


const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    service: "hotmail",
    host: 'smtp-mail.outlook.com',
    //host: 'smtp.gmail.com',
    port: 587,//465,
    secure: false,
    auth: {
        user: 'pruebawebscraping@hotmail.com',
        pass: 'scrapeando123',
    },
  });

const mailOptions = {
from: 'pruebawebscraping@hotmail.com',
to: 'jhonamaya18@hotmail.com',
subject: 'Error in web scraping code',
text: 'That was easy!'
};



let state = [1,1,1,1,1]

// slideCaptcha function receives:
// - page with slide captcha
// - the selector of the slider that move (selectorHandle),
// - the selector of the element in which slider can move (selectorElement), 
// - the selector of the button (button)

async function slideCaptcha(page,selectorHandle,selectorElement,button,verification){
    await page.bringToFront();
    let sliderElement = await page.waitForSelector(selectorElement);
    let slider = await sliderElement.boundingBox();
    let sliderHandle = await page.waitForSelector(selectorHandle);
    let handle = await sliderHandle.boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + slider.width, handle. y + handle.height / 2, { steps: 10 });
    await page.mouse.up();

    await page.waitForSelector(button, { waitUntil:10000 })
    await page.waitForNetworkIdle()

    await page.evaluate((verification) => {
        while (true){
        let textlicer = document.querySelector(verification);
        if(textlicer.innerText.includes("Verificación superada")) {
            break;
        }
        }
    },verification);
}

// getCaptchaImages receives:
// - puppeteer page (page)
// - canvas selector of the image (canvass)
// to get a png file and store as captcha.png in img folder

async function getCaptchaImages(page,canvass) {
    let images = await page.$$eval(canvass, canvases => {
        return canvases.map(canvas => canvas.toDataURL().replace(/^data:image\/png;base64/, ''))
        })
    await fs.writeFile(`./img/captcha.png`, images[0], 'base64',(err) => {
        if (err)
          console.log(err);
        else 
          console.log("File written successfully\n")
        })
  }

  //  centerFigure function receives:
  // - diffImage: image processed by pixelmatch and cv where is shown only the desired figure to center in red color
  //  function that calculate the center of a desired red figure inside a empty image.

  async function centerFigure(diffImage){
    const { width, height} = diffImage.bitmap;
    let i = 0;
    let j = 0;
    let count = 0;
    let init, end;
    
    while (true){
        let k = Jimp.intToRGBA(diffImage.getPixelColor(i, j))
        if (k.g === 0 && k.b === 0){
            count++;
            if (count == 5){
                init = i;
                break
            }
        }
        if (j == 154){
            j = 0;
            i++;
        }
        else{
            j++;
        }
        if(i==351){
            break
        }
        
    }
    count = 0;
    i = 351;
    j = 154;
    while (true){
        let k = Jimp.intToRGBA(diffImage.getPixelColor(i, j))
        if (k.g === 0 && k.b === 0){
            count++;
            if (count == 5){
                end = i;
                break
            }
        } 
        if (j == 0){
            j = 154;
            i--;
        }
        else{
            j--;
        }
    }
    return Math.round((init+end)/2 - 20) 
}

// geetest_slider receives:
// - puppeteer page (page), 
// - the selector of the element in which slider can move (element), 
// - the selector of the slider that move (slideHandle),
// - the selector of the canvas that contains the puzzle image, it is the same in getCaptchaImages function (container),
// - the selector of the div that contains all the geetest slider puzzle (div)
// the function compare the image stored in img/original (in this case are two possibles) with img/captcha obtained in getCaptchaImages
// selecting the best option. Then, the function substract the puzzle piece and calculate the center with the centerfigure function. 
// Finally, the function move the slider to the position of the center of the puzzle piece.

async function geetestSliderCenter(page,element,slideHandle){
    const originalImage1 = './img/original1.png'
    const originalImage2 = './img/original2.png'
    const sliderImage = './img/captcha.png'
    let originalImage;
    // First comparison
    const rembrandt = new Rembrandt({
        imageA: originalImage1,
        imageB: sliderImage,
        thresholdType: Rembrandt.THRESHOLD_PERCENT
    })

    let result = await rembrandt.compare()
    let difference = result.percentageDifference * 100

    // Second comparison
    const rembrandt1 = new Rembrandt({
        imageA: originalImage2,
        imageB: sliderImage,
        thresholdType: Rembrandt.THRESHOLD_PERCENT
    })

    let result1 = await rembrandt1.compare()
    let difference1 = result1.percentageDifference * 100
    if (difference < difference1) {  // Selecting the best option
        originalImage = await new Jimp.read(originalImage1)
    } else {
        originalImage = await new Jimp.read(originalImage2)
    }
    
    let captchaImage = await new Jimp.read(sliderImage);
    const { width, height} = originalImage.bitmap;
    const diffImage = new Jimp(width, height);
    const diffoptions = { includeAA: true, threshold: 0.2}
    // Substracting the puzzle piece
    pixelmatch(originalImage.bitmap.data, captchaImage.bitmap.data, diffImage.bitmap.data, width, height, diffoptions) 
    diffImage.write('./img/diff.png')
    
    // Refining the image
    let src = cv.matFromImageData(diffImage.bitmap)
    let dst = new cv.Mat()
    let kernel = cv.Mat.ones(5, 5, cv.CV_8UC1)
    let anchor = new cv.Point(-1,-1)
    cv.threshold(src, dst, 127, 255, cv.THRESH_BINARY)
    cv.erode(dst, dst, kernel, anchor, 1)
    cv.dilate(dst, dst, kernel, anchor, 1)
    new Jimp({ width: dst.cols, height: dst.rows, data: Buffer.from(dst.data) }).write('./img/diff1.png')
    
    // calculate the center of the puzzle piece
    let center = await centerFigure(new Jimp({ width: dst.cols, height: dst.rows, data: Buffer.from(dst.data) }));

    // calculate the position of slider and handle slider elements
    const sliderElement = await page.$(element)
    const slider = await sliderElement.boundingBox()
    const sliderHandle = await page.$(slideHandle)
    const handle = await sliderHandle.boundingBox()

    // click the handle
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
    await page.mouse.down()
    
    // moving the slider to the center of puzzle piece and unclick the handle
    await page.mouse.move(handle.x+center*slider.width/width, handle.y + handle.height / 2, { steps: 30 });
    await new Promise(r => setTimeout(r, 100));
    sleepES5(2000)
    await page.mouse.up();
    // trying to simulate more clicks and movements to look human
    await new Promise(r => setTimeout(r, 100));
    await page.mouse.down()
    await new Promise(r => setTimeout(r, 100));
    await page.mouse.up();
    await new Promise(r => setTimeout(r, 4000));
}

// geetestSlider receives:
// - puppeteer page (page), 
// - the selector of the element in which slider can move (element), 
// - the selector of the slider that move (slideHandle),
// - the selector of the canvas that contains the puzzle image, it is the same in getCaptchaImages function (container),
// - the selector of the div that contains all the geetest slider puzzle (div)
// the function compare the image stored in img/original (in this case are two possibles) with img/captcha obtained in getCaptchaImages
// and starts to move the slider from start to finish. it compares the value of difference in each step and finally it move the slider to
// the best position that adjust to the original image.

async function geetestSlider (page,element,slideHandle,container,div) {
    
    await page.waitForSelector(element)
    let originalImage = ''

    // Generates the boxes of the slider and its container
    const sliderElement = await page.$(element)
    const slider = await sliderElement.boundingBox()
    const sliderHandle = await page.$(slideHandle)
    const handle = await sliderHandle.boundingBox()

            
    // Comparison to select between the two options
    
    const originalImage1 = './img/original1.png'
    const originalImage2 = './img/original2.png'
    const sliderImage = './img/captcha.png'
    
    // First comparison
    const rembrandt = new Rembrandt({
        imageA: originalImage1,
        imageB: sliderImage,
        thresholdType: Rembrandt.THRESHOLD_PERCENT
    })

    let result = await rembrandt.compare()
    let difference = result.percentageDifference * 100

    // Second comparison
    const rembrandt1 = new Rembrandt({
        imageA: originalImage2,
        imageB: sliderImage,
        thresholdType: Rembrandt.THRESHOLD_PERCENT
    })

    let result1 = await rembrandt1.compare()
    let difference1 = result1.percentageDifference * 100

    // Selection
    if (difference < difference1) {
        originalImage = originalImage1
    } else {
        originalImage = originalImage2
    }

    // variables for loop

    let currentPosition = 1 // cycle counter
    let bestSlider = {
        position: 0,
        difference: 100 // 100 is the worst case, small values are better
    }
    // start clicking the slice
    
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
    await page.mouse.down()
    let parts = 50;
    // Start loop
    // it takes 50 steps for better precision

    while (currentPosition < parts+1){
        
        // move the slicer to new position

        await page.mouse.move(
            handle.x + handle.width / 2 + currentPosition*slider.width/parts,
            handle.y + handle.height / 2//, { steps: 10 }
        )
        
        // take a screenshot of the puzzle

        let sliderContainer = await page.$(container)
        let sliderImage = await sliderContainer.screenshot()

        // Start comparison

        const rembrandt = new Rembrandt({
            imageA: originalImage,
            imageB: sliderImage,
            thresholdType: Rembrandt.THRESHOLD_PERCENT
        })

        let result = await rembrandt.compare()
        let difference = result.percentageDifference * 100
        
        // If difference is less than previos, update with new value

        if (difference < bestSlider.difference) {
            bestSlider.difference = difference
            bestSlider.position = currentPosition
        }

        currentPosition++
    }

    // Move to the best position obtained

    await page.mouse.move(handle.x + handle.width / 2 + bestSlider.position*slider.width/parts, handle.y + handle.height / 2, { steps: 5 });
    sleepES5(1000);
    await page.mouse.up();
    //await page.waitForNetworkIdle();
}

//////////////////////////////////////////////////////////////////////////////
/////////////////// Init and logging funtions ////////////////////////////////

//  initPage function receives:
// - browser
// - selectors for logging, password and button inputs (list)
// - url of the page (string)
// - number of page (l), used to know if the page has regional selection

async function initPage (browser,selectors,url,l) {
    let page = await browser.newPage();
    await page.goto(url,{timeout: 0});
    await selectorVerification(page,selectors[2],TIMEOUT,async function (){return},l)
    if (state[l] === 0) return page;
    if (l==2 || l==3) { // Conditional for pages with region selection (growatt and solarman)
        await selectorVerification(page,selectors[3],TIMEOUT,async function (){return},l);
        if (state[l] === 0) return page;
        await selectorVerification(page,selectors[4],TIMEOUT,async function (){return},l);
        if (state[l] === 0) return page;
        await page.evaluate((a=selectors[3],b=selectors[4]) => {
            let radio = document.querySelector(a);
            radio.click();
            let button = document.querySelector(b);
            button.click();
        },selectors[3],selectors[4]);
        if (l==2) { // conditional for pages with cookies agrement  (only growatt)
            await selectorVerification(page,'#agree',TIMEOUT,async function (){return},l);
            if (state[l] === 0) return page;
            await page.evaluate(() => {
                let agree = document.querySelector('#agree');
                agree.click();
            });
        }
    }
    return page
}

//  logging function receives:
// - page to logging
// - selectors for logging, password and button inputs (list)
// - url of the page (string)
// - name of the page (str)

async function logging(page,selector,url,str,l) {
    await page.bringToFront();
    await selectorVerification(page,selector[0],TIMEOUT,async function (){await page.click(selector[0])},l);
    if (state[l] === 0) return;
    await page.keyboard.type(url[1]);
    await selectorVerification(page,selector[1],TIMEOUT,async function (){await page.click(selector[1])},l);
    if (state[l] === 0) return;
    await page.keyboard.type(url[2]);
    await selectorVerification(page,selector[2],TIMEOUT,async function (){await page.click(selector[2])},l);
    if (state[l] === 0) return;
    //await page.waitForNetworkIdle();
    if (str !== 'DESSMONITOR') console.log('logged in '+str)
}   

async function initHOYMILES(browser,selectors,urls) {
    page = await initPage(browser,selectors[0],urls.HOYMILES[0],0);
    return page
}

async function loggingHOYMILES(page,selectors,urls) {
    await logging(page,selectors[0],urls.HOYMILES,'HOYMILES',0)
    await page.waitForNetworkIdle();
}

async function initAPSYSTEMS(browser,selectors,urls) {
    page = await initPage(browser,selectors[1],urls.APSYSTEMS[0],1);
    return page
}

async function loggingAPSYSTEMS(page,selectors,urls) {
    await logging(page,selectors[1],urls.APSYSTEMS,'APSYSTEMS',1)
}

async function initGROWATT(browser,selectors,urls) {
    page = await initPage(browser,selectors,urls.GROWATT[0],2);
    return page
}

async function loggingGROWATT(page,selectors,urls) {
    await logging(page,selectors,urls.GROWATT,'GROWATT',2)
}

async function initSOLARMAN(browser,selectors,urls) {
    page = await initPage(browser,selectors[3],urls.SOLARMAN[0],3);
    await page.waitForNetworkIdle()
    return page
}

async function loggingSOLARMAN(page,selectors,urls) {
    await selectorVerification(page,selectors[5],TIMEOUT,async function (){return},3);
    await selectorVerification(page,selectors[6],TIMEOUT,async function (){return},3);
    await selectorVerification(page,selectors[2],TIMEOUT,async function (){return},3);
    if (state[3] === 0) return;
    await slideCaptcha(page,selectors[5],selectors[6],selectors[2],selectors[7])
    await logging(page,selectors,urls.SOLARMAN,'SOLARMAN',3)
    await selectorVerification(page,selectors[8],TIMEOUT,async function (){return},3);
    if (state[3] === 0) return;
    await page.click(selectors[8]);
}

async function initDESSMONITOR(browser,selectors,urls) {
    let page = await initPage(browser,selectors[4],urls.DESSMONITOR[0],4);
    return page
}

async function loggingDESSMONITOR(page,selectors,urls) {
    await logging(page,selectors,urls.DESSMONITOR,'DESSMONITOR',4);
    if (state[4] === 0) return;
    let h = 0;
    while (h === 0) {
        await selectorVerification(page,selectors[3],TIMEOUT,async function (){return},4);
        await selectorVerification(page,selectors[4],TIMEOUT,async function (){return},4);
        await selectorVerification(page,selectors[5],TIMEOUT,async function (){return},4);
        if (state[4] === 0) {return}
        await getCaptchaImages(page,selectors[5]);
        await geetestSliderCenter(page,selectors[4],selectors[3]);
        sleepES5(3000);
        let textlicer = await page.$(selectors[6]);
        if(textlicer === null) {
            console.log('logged in DESSMONITOR')
            h = 1;
        } else
            console.log('fail to log in DESSMONITOR, trying again')
      
        
    }  
}   

/////////////////////////////////////////////////////////////////////////////////
////////////////////////// Scraping functinos ///////////////////////////////////


async function scrapHOYMILES(page,selectors) {
    await page.bringToFront();
    await page.goto(selectors[0]);
    sleepES5(5000);
    //await page.waitForNetworkIdle({timeout: TIMEOUT});
    await selectorVerification(page,selectors[2],TIMEOUT,async function (){return},0);
    if (state[0] === 0) return [];
    console.log('Scrapping HOYMILES...')
    const tableLenght = await page.evaluate((selectors) => {
        return document.getElementsByClassName(selectors[1]).length
    },selectors)
    let data = [];
    for (let i = 1; i < tableLenght+1; i++) {
        //let id = await page.$eval(`body > section > section > main > div > div > div > div > div.page-content.head.fixed > div > div > div > div.sx-tabs-content > div > div:nth-child(2) > div > div > div > div > div > div > div > div > table > tbody > tr:nth-child(${i}) > td:nth-child(1)`, element => element.innerHTML);
        let name = await selectorSave(page,selectors[3]+i.toString()+selectors[4],TIMEOUT,async function ([i,selectors]){return await page.$eval(selectors[3]+i.toString()+selectors[4], element => element.innerHTML)},[i,selectors])
        //let name = await page.$eval(selectors[2]+i.toString()+selectors[3], element => element.innerHTML);
        
        await page.click(selectors[3]+i.toString()+selectors[4]);
        await selectorVerification(page,selectors[5],TIMEOUT,async function (){return},0);
        if (state[0] === 0) return [];
        let powerCurrency = await selectorSave(page,selectors[6],TIMEOUT,async function ([i,selectors]){return await page.$eval(selectors[6], element => element.innerHTML)},[i,selectors])
        let energyToday = await selectorSave(page,selectors[7],TIMEOUT,async function ([i,selectors]){return await page.$eval(selectors[7], element => element.innerHTML)},[i,selectors])
        //let powerCurrency = await page.$eval(selectors[5], element => element.innerHTML);
        //let energyToday = await page.$eval(selectors[6], element => element.innerHTML+' Wh');
        await selectorVerification(page,selectors[8],TIMEOUT,async function (){return},0);
        if (state[0] === 0) return [];
        await page.click(selectors[8])
        await selectorVerification(page,selectors[9],TIMEOUT,async function (){return},0);
        if (state[0] === 0) return [];
        let layoutValues = "";
        try {
            await page.waitForSelector(selectors[10], { timeout: TIMEOUT })
            let layoutLength = await page.$eval(selectors[10], element => element.getElementsByClassName(selectors[12]).length);
            
            await page.waitForSelector(selectors[10]);
            await page.waitForNetworkIdle();
            for (let j = 0; j < layoutLength; j++){
                let value = await page.$eval(selectors[10], (element,j) => element.getElementsByClassName(selectors[12])[j].getElementsByClassName(selectors[11])[0].innerHTML,j);
                layoutValues += value + "W,"
            }
          } catch (error) {
            console.log(`No layout in plant ${i}`)
        }

        data.push({
            name: name.slice(1,-8),
            powerCurrency: powerCurrency,
            energyToday: energyToday,
            battery: null,
            grid: null,
            layout: layoutValues,
            date: new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' }),
            platform: 'Hoymiles'
        })
        await page.click(selectors[13])
        await page.waitForNetworkIdle();
    }
    console.log("HOYMILES scraped")
    console.log(data)
    return data    
}

// async function scrapAPSYSTEMS(page,selectors) {
//     await page.bringToFront();
//     await selectorVerification(page,selectors[0],TIMEOUT,async function (){return},1);
//     if (state[1] === 0) return [];
//     console.log('Scrapping APSYSTEMS...')
//     const tableLenght = await page.evaluate((selectors) => {
//         return document.querySelector(selectors[0]).rows.length
//     },selectors)
//     let data = [];
//     let i;
//     for (let i = 1; i < tableLenght + 1; i++) {
        
//         // if (n<10) i = n;
//         // else i = n.toString()[0] + ' ' + n.toString()[1]
        
//         await page.waitForNetworkIdle();
//         let name = await selectorSave(page,selectors[1]+i.toString()+selectors[2],TIMEOUT,async function ([i,selectors]){return await page.$eval(selectors[1]+i.toString()+selectors[2], element => element.innerHTML)},[i,selectors])
        
//         console.log(name)
//         let powerCurrency, energyToday;
//         let layoutValues = "";
//         await selectorVerification(page,selectors[1]+i.toString()+selectors[2],TIMEOUT,async function (){await page.click(selectors[1]+i.toString()+selectors[2])},1);
//         if (state[1] === 0) return [];
//         await page.waitForNetworkIdle();
//         if (await page.evaluate(() => document.querySelector('body').children[48].children[0].children[0].contentDocument.children[0].children[1].children[0].children[3].children[1].children[3].children[0].children[0].children[0].children[3].innerHTML) === 'Last Report Date'){
//             powerCurrency = '0 W'
//         }
//         else {
//             powerCurrency = await selectorSave(page,'body',TIMEOUT,async function ([i,selectors]){return await page.evaluate(() => document.querySelector('body').children[48].children[0].children[0].contentDocument.children[0].children[1].children[0].children[3].children[1].children[3].children[0].children[1].children[0].children[3].innerHTML + ' W')},[selectors])
            
//         }
//         energyToday = await selectorSave(page,'body',TIMEOUT,async function ([i,selectors]){return await page.evaluate(() => document.querySelector('body').children[48].children[0].children[0].contentDocument.children[0].children[1].children[0].children[3].children[1].children[3].children[0].children[1].children[0].children[2].innerHTML + 'kWh')},[selectors])
        
//         await selectorVerification(page,selectors[3],TIMEOUT,async function (){await page.click(selectors[3])},1);
//         if (state[1] === 0) return [];
        
//         await page.waitForNetworkIdle();
        
//         let len = await page.evaluate(() => document.querySelector('body').children[48].children[0].children[0].contentDocument.children[0].children[1].children[0].children[9].childElementCount-3)
//         let len1 = await page.evaluate((len) => document.querySelector('body').children[48].children[0].children[0].contentDocument.children[0].children[1].children[0].children[9].children[len-1].innerHTML.length,len)
//         let layoutLength;
//         if (len1 < 10 ){
//             layoutLength = len/2
//         } else {
//             layoutLength = len
//         }
        
//         await page.waitForNetworkIdle();
        
//         for (let j = 3; j < layoutLength + 3; j++){
//             let value = await selectorSave(page,'body',TIMEOUT,async function ([selectors]){return await page.evaluate((j) => document.querySelector('body').children[48].children[0].children[0].contentDocument.children[0].children[1].children[0].children[9].children[j].children[2].innerHTML + 'W',j)},[selectors])
//             //let value = await page.evaluate((j) => document.querySelector('body').children[37].children[0].children[0].contentDocument.children[0].children[1].children[0].children[9].children[j].children[2].innerHTML + 'W',j)
            
//             layoutValues += value + ","
//         }
            
        
//         data.push({
//             name: name,
//             powerCurrency: powerCurrency,
//             energyToday: energyToday,
//             battery: null,
//             grid: null,
//             layout: layoutValues,
//             date: new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' }),
//             platform: 'APsystems'
//         })
//         await page.click(selectors[4])
//         await page.waitForNetworkIdle();
//     }
//     console.log("APsystems scraped")
//     console.log(data)
//     return data
// }

async function scrapAPSYSTEMS(page,selectors) {
    await page.bringToFront();
    await selectorVerification(page,selectors[0],TIMEOUT,async function (){return},1);
    if (state[1] === 0) return [];
    console.log('Scrapping APSYSTEMS...')
    const tableLenght = await page.evaluate((selectors) => {
        return document.querySelector(selectors[0]).rows.length
    },selectors)
    let data = [];
    let i;
    for (let i = 1; i < tableLenght + 1; i++) {
        
        await page.waitForNetworkIdle();
        let name = await selectorSave(page,selectors[1]+i.toString()+selectors[2],TIMEOUT,async function ([i,selectors]){return await page.$eval(selectors[1]+i.toString()+selectors[2], element => element.innerHTML)},[i,selectors])
        
        await selectorVerification(page,selectors[1]+i.toString()+selectors[2],TIMEOUT,async function (){await page.click(selectors[1]+i.toString()+selectors[2])},1);
        if (state[1] === 0) return [];
        await page.waitForNetworkIdle();

        // READ THE FRAME INSIDE PAGE
        
        const elementHandle = await page.waitForSelector(selectors[3]);
        const frame = await elementHandle.contentFrame();
        
        let powerCurrency, energyToday;
        let layoutValues = "";

        if (await frame.$eval(selectors[4], element => element.innerHTML + ' W') === 'Last Report Date'){
            powerCurrency = '0 W'
        }
        else {
            powerCurrency = await selectorSave(frame,selectors[5],TIMEOUT,async function ([i,selectors]){return await frame.$eval(selectors[5], element => element.innerHTML + ' W')},[i,selectors])
            
        }
        energyToday = await selectorSave(frame,selectors[6],TIMEOUT,async function ([i,selectors]){return await frame.$eval(selectors[6], element => element.innerHTML + 'kWh')},[i,selectors])

        // CLICK TO OPEN DETAILS PAGE

        await selectorVerification(page,selectors[7],TIMEOUT,async function (){await page.click(selectors[7])},1);
        if (state[1] === 0) return [];
        
        await page.waitForNetworkIdle();
        
        const elementHandle1 = await page.waitForSelector(selectors[3]);
        const frame1 = await elementHandle.contentFrame();

        let layoutLength = await selectorSave(frame1,selectors[8],TIMEOUT,async function ([i,selectors]){return await frame1.$eval(selectors[8], element => (element.children.length-3)/2)},[i,selectors])
        
        await page.waitForNetworkIdle();
        for (let j = 0; j < layoutLength; j++){
            let value = await selectorSave(frame1,`::-p-xpath(//*[@id="module${j}"]/span)`,TIMEOUT,async function ([j,selectors]){return await frame1.$eval(`::-p-xpath(//*[@id="module${j}"]/span)`, element => element.innerHTML + ' W')},[j,selectors])
            layoutValues += value + ","
        }
            
        
        data.push({
            name: name,
            powerCurrency: powerCurrency,
            energyToday: energyToday,
            battery: null,
            grid: null,
            layout: layoutValues,
            date: new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' }),
            platform: 'APsystems'
        })
        await page.click(selectors[9])
        await page.waitForNetworkIdle();
    }
    console.log("APsystems scraped")
    return data
}

async function scrapGROWATT(page,selectors) {
    await page.bringToFront();
    await page.waitForNetworkIdle();
    await selectorVerification(page,selectors[0],TIMEOUT,async function (){return},2);
    if (state[2] === 0) return [];
    console.log('Scrapping GROWATT...')
    const tableLenght = await page.evaluate((selectors) => {
        return document.querySelector(selectors[0]).rows.length
    },selectors)
    let data = [];
    for (let n = 0; n < tableLenght; n++) {
        let str = await page.evaluate((n,selectors) => document.getElementById(selectors[0].slice(1)).rows[n].getAttribute('id'),n,selectors);
        //let id = await page.evaluate((str) => document.querySelector('#'+str+'> td:nth-child(2)').innerHTML,str)
        if (state[2] === 0) return [];
        let name = await selectorSave(page,'#'+str+selectors[1],TIMEOUT,async function ([str,selectors]){return await page.evaluate((str,selectors) => document.querySelector('#'+str+selectors[1]).innerHTML,str,selectors)},[str,selectors])
        let powerCurrency = await selectorSave(page,'#'+str+selectors[2],TIMEOUT,async function ([str,selectors]){return await page.evaluate((str,selectors) => document.querySelector('#'+str+selectors[2]).innerHTML,str,selectors)},[str,selectors])
        let energyToday = await selectorSave(page,'#'+str+selectors[3],TIMEOUT,async function ([str,selectors]){return await page.evaluate((str,selectors) => document.querySelector('#'+str+selectors[3]).innerHTML,str,selectors)},[str,selectors]) 
        
        
        data.push({
            name: name,
            powerCurrency: powerCurrency,
            energyToday: energyToday,
            battery: null,
            grid: null,
            layout: "",
            date: new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' }),
            platform: 'Growatt'
        })
    }
    console.log("GROWATT scraped")
    return data
    
}

async function scrapSOLARMAN(browser,page,selectors) {
    await page.bringToFront();
    await page.waitForNetworkIdle();
    await selectorVerification(page,selectors[0],TIMEOUT,async function (){return},3);
    if (state[3] === 0) return [];
    console.log('Scrapping SOLARMAN...')
    const tableLenght = await page.evaluate((selectors) => {
        return document.querySelector(selectors[0]).rows.length
    },selectors)
    
    let data = [];
    for (let n = 0; n < tableLenght; n++) {
        let name = await selectorSave(page,selectors[0],TIMEOUT,async function ([n,selectors]){return await page.evaluate((n,selectors) => document.querySelector(selectors[0]).rows[n].children[1].children[0].children[0].children[1].innerHTML,n,selectors)},[n,selectors])
        let number = n+1;
        const [target] = await Promise.all([
        new Promise(resolve => browser.once('targetcreated', resolve)),        
        await page.click(selectors[1]+number.toString()+selectors[2])
        ]);
        const newPage = await target.page();
        await newPage.bringToFront();
        await newPage.waitForNetworkIdle();

        if (n===0){
            await selectorVerification(newPage,selectors[3],TIMEOUT,async function (){await newPage.click(selectors[3])},3);
            if (state[3] === 0) return [];
            
            await newPage.waitForNetworkIdle();
          }
        let powerCurrency, grid, battery;
        await newPage.waitForNetworkIdle();
        await selectorVerification(newPage,selectors[4],TIMEOUT,async function (){return},3);
        if (state[3] === 0) return [];
        if (await newPage.$(selectors[5]) === null){
            await selectorVerification(newPage,selectors[6],TIMEOUT,async function (){return},3);
            if (state[3] === 0) return [];
            powerCurrency = await selectorSave(newPage,selectors[6],TIMEOUT,async function ([selectors,newPage]){return await newPage.evaluate((selectors) => {document.querySelector(selectors[6]).innerHTML},selectors)},[selectors,newPage])
            //powerCurrency = await newPage.evaluate((selectors) => {document.querySelector(selectors[6]).innerHTML},selectors);
            grid = await selectorSave(newPage,selectors[8],TIMEOUT,async function ([selectors,newPage]){return await newPage.evaluate((selectors) => {document.querySelector(selectors[8]).innerHTML},selectors)},[selectors,newPage])
            //grid = await newPage.evaluate((selectors) => document.querySelector(selectors[8]).innerHTML,selectors)
            battery = null
        } else {
            await selectorVerification(newPage,selectors[7],TIMEOUT,async function (){return},3);
            if (state[3] === 0) return [];
            powerCurrency = await selectorSave(newPage,selectors[7],TIMEOUT,async function ([selectors,newPage]){return await newPage.evaluate((selectors) => {document.querySelector(selectors[7]).innerHTML},selectors)},[selectors,newPage])
            //powerCurrency = await newPage.evaluate((selectors) => document.querySelector(selectors[7]).innerHTML+' W',selectors);
            grid = await selectorSave(newPage,selectors[9],TIMEOUT,async function ([selectors,newPage]){return await newPage.evaluate((selectors) =>document.querySelector(selectors[9]).innerHTML+' '+document.querySelector(selectors[10]).innerHTML,selectors)},[selectors,newPage])
            //grid = await newPage.evaluate((selectors) =>document.querySelector(selectors[9]).innerHTML+' '+document.querySelector(selectors[10]).innerHTML,selectors);
            battery = await selectorSave(newPage,selectors[11],TIMEOUT,async function ([selectors,newPage]){return await newPage.evaluate((selectors) => {document.querySelector(selectors[11]).innerHTML},selectors)},[selectors,newPage])
            //battery = await newPage.evaluate((selectors) => document.querySelector(selectors[11]).innerHTML + ' W',selectors)
        }

        let energyToday = await selectorSave(newPage,selectors[12],TIMEOUT,async function ([selectors,newPage]){return await newPage.evaluate((selectors) => document.querySelector(selectors[12]).innerHTML + ' kWh',selectors)},[selectors,newPage])
        //let energyToday = await newPage.evaluate((selectors) => document.querySelector(selectors[12]).innerHTML + ' kWh',selectors)
        
                                                                                
        data.push({
            name: name,
            powerCurrency: powerCurrency,
            energyToday: energyToday,
            battery: battery,
            grid: grid,
            layout: "",
            date: new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' }),
            platform: 'Solarman'
        })
        
        await newPage.close();
    }
    console.log(data)
    console.log("SOLARMAN scraped")
    return data
    
}

async function scrapDESSMONITOR(page,selectors) {
    await page.bringToFront();
    await selectorVerification(page,selectors[0],TIMEOUT,async function (){return},4);
    if (state[4] === 0) return [];
    console.log('Scrapping DESSMONITOR...')
    await page.waitForSelector(selectors[2], {timeout: TIMEOUT});
    let name = await selectorSave(page,selectors[1],TIMEOUT,async function (selectors){return await page.evaluate((selectors) => document.querySelector(selectors[1]).innerHTML,selectors)},selectors)
    let powerCurrency = await selectorSave(page,selectors[2],TIMEOUT,async function (selectors){return await page.evaluate((selectors) => document.querySelector(selectors[2]).innerHTML,selectors)},selectors)
    let energyToday = await selectorSave(page,selectors[3],TIMEOUT,async function (selectors){return await page.evaluate((selectors) => document.querySelector(selectors[3]).innerHTML,selectors)},selectors)
    let battery = await selectorSave(page,selectors[4],TIMEOUT,async function (selectors){return await page.evaluate((selectors) => document.querySelector(selectors[4]).innerHTML,selectors)},selectors)
    let data = [];
    data.push({
        name: name,
        powerCurrency: powerCurrency,
        energyToday: energyToday,
        battery: battery,
        grid: null,
        layout: "",
        date: new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' }),
        platform: 'Dessmonitor'
    })
    console.log("DESSMONITOR scraped");
    console.log(data)
    return data
}

async function selectorVerification(page,selector,TIMEOUT,task,l) {
    try {
        await page.waitForSelector(selector, {timeout: TIMEOUT});
        await task();
      } catch (error) {
        console.log('No existe selector\n'+selector);
        state[l] = 0;
        mailOptions['text']='No existe selector\n'+selector
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log('Error:'+error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
      }
}

async function selectorSave(page,selector,TIMEOUT,task,arguments) {
    try {
        await page.waitForSelector(selector, {timeout: TIMEOUT});
        return task(arguments);
      } catch (e) {
        console.log('No existe selector\n'+selector)
        mailOptions['text']='No existe selector\n'+selector
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log('Error:'+error);
            } else {
              console.log('Email sent: ' + info.response);
            }
        });
        return 'ERROR'
      }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////     MAIN FUNCTION     ///////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

async function scrape() {
    
    let browser
    try {
        browser = await puppeteer.connect()
    } catch (error) {
        browser = await puppeteer.launch({
            //executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            headless: false,
            //devtools: true,
            defaultViewport: { width: 1366, height: 768 },
            ignoreDefaultArgs: [ // neccesary to avoid automation mode of browser
                "--disable-extensions",
                "--enable-automation"
            ],
            args: [ // neccesary to avoid automation mode of browser
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--allow-running-insecure-content',
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--mute-audio',
                '--no-zygote',
                '--no-xshm',
                '--window-size=1920,1080',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--enable-webgl',
                '--ignore-certificate-errors',
                '--lang=en-US,en;q=0.9',
                '--password-store=basic',
                '--disable-gpu-sandbox',
                '--disable-software-rasterizer',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-infobars',
                '--disable-breakpad',
                '--disable-canvas-aa',
                '--disable-2d-canvas-clip-aa',
                '--disable-gl-drawing-for-tests',
                '--enable-low-end-device-mode',
                '--disable-extensions-except=./plugin',
                '--load-extension=./plugin',
                '--enable-popup-blocking',
                '--disable-site-isolation-trials'
            ]
        })
    }

   
    
    const PAGES = ['HOYMILES', 'APSYSTEMS', 'DESSMONITOR', 'SOLARMAN', 'GROWATT'];
    const pages = {}; // Storage each page
    const urls = {
        HOYMILES: [process.env.URL_HOYMILES,process.env.USERNAME_HOYMILES,process.env.PASSWORD_HOYMILES],
        APSYSTEMS: [process.env.URL_APSYSTEMS,process.env.USERNAME_APSYSTEMS,process.env.PASSWORD_APSYSTEMS],
        GROWATT: [process.env.URL_GROWATT,process.env.USERNAME_GROWATT,process.env.PASSWORD_GROWATT],
        SOLARMAN: [process.env.URL_SOLARMAN,process.env.USERNAME_SOLARMAN,process.env.PASSWORD_SOLARMAN],
        DESSMONITOR: [process.env.URL_DESSMONITOR,process.env.USERNAME_DESSMONITOR,process.env.PASSWORD_DESSMONITOR]
    };
    // selectors has the selectors of username/email, password and login button, there is 3 cases that have more because of region selection and captcha
    
    const selectors = [[
                            process.env.SEL_USERNAME_HOYMILES,process.env.SEL_PASSWORD_HOYMILES,process.env.SEL_LOGIN_BUTTON_HOYMILES
                        ],
                        [
                            process.env.SEL_USERNAME_APSYSTEMS,process.env.SEL_PASSWORD_APSYSTEMS,process.env.SEL_LOGIN_BUTTON_APSYSTEMS
                        ],
                        [
                            process.env.SEL_USERNAME_GROWATT,process.env.SEL_PASSWORD_GROWATT,process.env.SEL_LOGIN_BUTTON_GROWATT,
                            process.env.SEL_REGION_BOX_GROWATT,process.env.SEL_REGION_BUTTON_GROWATT
                        ],
                        [
                            process.env.SEL_USERNAME_SOLARMAN,process.env.SEL_PASSWORD_SOLARMAN,process.env.SEL_LOGIN_BUTTON_SOLARMAN,
                            process.env.SEL_REGION_BOX_SOLARMAN,process.env.SEL_REGION_BUTTON_SOLARMAN,process.env.SEL_CAPTCHA_HANDLE_SOLARMAN,
                            process.env.SEL_CAPTCHA_SLIDER_SOLARMAN,process.env.SEL_CAPTCHA_VERIFICATION_SOLARMAN,process.env.SEL_HELP_SOLARMAN
                        ],
                        [
                            process.env.SEL_USERNAME_DESSMONITOR,process.env.SEL_PASSWORD_DESSMONITOR,process.env.SEL_LOGIN_BUTTON_DESSMONITOR,
                            process.env.SEL_CAPTCHA_HANDLE_DESSMONITOR,process.env.SEL_CAPTCHA_SLIDER_DESSMONITOR,
                            process.env.SEL_CAPTCHA_CANVAS_DESSMONITOR,process.env.SEL_CAPTCHA_DIV_DESSMONITOR,
                            process.env.SEL_CAPTCHA_VERIFICATION_DESSMONITOR
                        ]]
    
    const selectors_page = [[
                                process.env.URL_PLANTS_HOYMILES,process.env.SEL_TABLE_BODY_HOYMILES,process.env.SEL_TABLE_BODY_VERIFICATION_HOYMILES,process.env.SEL_PLANT_NAME_1_HOYMILES,
                                process.env.SEL_PLANT_NAME_2_HOYMILES,process.env.SEL_PLANT_VERIFICATION_HOYMILES,process.env.SEL_PLANT_POWER_HOYMILES,
                                process.env.SEL_PLANT_ENERGY_HOYMILES,process.env.SEL_PLANT_LAYOUT_DETAILS_HOYMILES,
                                process.env.SEL_PLANT_LAYOUT_VERIFICATION_HOYMILES,process.env.SEL_PLANT_LAYOUT_COMPONENT_HOYMILES,
                                process.env.SEL_PLANT_LAYOUT_COMPONENT_VERIFICATION_HOYMILES,process.env.SEL_PLANT_LAYOUT_COMPONENT_TABLE_HOYMILES,
                                process.env.SEL_PLANT_RETURN_BUTTON_HOYMILES
                            ],
                            [
                                process.env.SEL_TABLE_BODY_APSYSTEMS,process.env.SEL_PLANT_NAME_1_APSYSTEMS,
                                process.env.SEL_PLANT_NAME_2_APSYSTEMS,process.env.SEL_PLANT_FRAME_APSYSTEMS,
                                process.env.SEL_PLANT_POWER_VERIFICATION_APSYSTEMS,process.env.SEL_PLANT_POWER_APSYSTEMS,
                                process.env.SEL_PLANT_ENERGY_APSYSTEMS,process.env.SEL_PLANT_LAYOUT_DETAILS_APSYSTEMS,
                                process.env.SEL_PLANT_LAYOUT_APSYSTEMS,process.env.SEL_PLANT_PLANT_LIST_APSYSTEMS
                            ],
                            [
                                process.env.SEL_TABLE_BODY_GROWATT,process.env.SEL_PLANT_NAME_GROWATT,
                                process.env.SEL_PLANT_POWER_GROWATT,process.env.SEL_PLANT_ENERGY_GROWATT
                            ],
                            [
                                process.env.SEL_TABLE_BODY_SOLARMAN,process.env.SEL_TABLE_OPEN_PLANT_1_SOLARMAN,
                                process.env.SEL_TABLE_OPEN_PLANT_2_SOLARMAN,process.env.SEL_PLANT_BUTTON_SOLARMAN,
                                process.env.SEL_PLANT_VERIFICATION_1_SOLARMAN,process.env.SEL_PLANT_VERIFICATION_SOLARMAN,
                                process.env.SEL_PLANT_POWER_1_SOLARMAN,process.env.SEL_PLANT_POWER_2_SOLARMAN,
                                process.env.SEL_PLANT_GRID_1_SOLARMAN,process.env.SEL_PLANT_GRID_2_SOLARMAN,
                                process.env.SEL_PLANT_GRID_2_UNITS_SOLARMAN,process.env.SEL_PLANT_BATTERY_2_SOLARMAN,
                                process.env.SEL_PLANT_ENERGY_SOLARMAN
                            ],
                            [
                                process.env.SEL_VERIFICATION_DESSMONITOR,process.env.SEL_PLANT_NAME_DESSMONITOR,process.env.SEL_PLANT_POWER_DESSMONITOR,
                                process.env.SEL_PLANT_ENERGY_DESSMONITOR,process.env.SEL_PLANT_BATTERY_DESSMONITOR]]
    
    
    ///////////// START PAGES /////////////////
    console.log('beggining scraping');

    pages.DESSMONITOR = await initDESSMONITOR(browser,selectors,urls)
    await loggingDESSMONITOR(pages.DESSMONITOR,selectors[4],urls);
    let dataDESSMONITOR = await scrapDESSMONITOR(pages.DESSMONITOR,selectors_page[4]);
    

    pages.HOYMILES = await initHOYMILES(browser,selectors,urls)
    await loggingHOYMILES(pages.HOYMILES,selectors,urls,0);
    
    pages.GROWATT = await initGROWATT(browser,selectors[2],urls)
    await loggingGROWATT(pages.GROWATT,selectors[2],urls);
    let dataGROWATT = await scrapGROWATT(pages.GROWATT,selectors_page[2]);
    await pages.GROWATT.close()
    

    pages.SOLARMAN = await initSOLARMAN(browser,selectors,urls);
    pages.SOLARMAN.waitForNetworkIdle();
    await loggingSOLARMAN(pages.SOLARMAN,selectors[3],urls);
    let dataSOLARMAN = await scrapSOLARMAN(browser,pages.SOLARMAN,selectors_page[3]);
    await pages.SOLARMAN.close()

    let dataHOYMILES = await scrapHOYMILES(pages.HOYMILES,selectors_page[0]);
    await pages.HOYMILES.close()

    pages.APSYSTEMS = await initAPSYSTEMS(browser,selectors,urls)
    await loggingAPSYSTEMS(pages.APSYSTEMS,selectors,urls);
    let dataAPSYSTEMS = await scrapAPSYSTEMS(pages.APSYSTEMS,selectors_page[1])
    await pages.APSYSTEMS.close()
    
    console.log('finishing scraping');
    await browser.close();
    return [].concat(dataAPSYSTEMS,dataGROWATT,dataHOYMILES,dataSOLARMAN,dataSOLARMAN)
    
}
module.exports = {
    scrape
}
