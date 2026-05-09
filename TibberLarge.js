// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: bolt;
// Tibber-widget
// v1.0.0 - first version - Sven-Ove Bjerkan
// v1.0.1 - Added "HOME_NR" as setting
// v1.5.0 - Created medium and large size widgets (currently as 3 separate scripts)
// v2.0.0 - Shows 3 hours back and up to 21 hours forward (configurable)
// v2.0.1 - Possibility to add network lease
// v2.0.2 - Small fixes on font colors, etc.
// v2.0.3 - Uploaded to GitHub by Daniel Eneström (https://github.com/danielenestrom)
// v2.0.4 - Rounds price to whole øre. Step graph.
// v2.0.5 - Add choice of HOME_NR as parameter and display of "dwelling name" - thanks to Marium0505!

// Find your token by logging in with your Tibber account here:
// https://developer.tibber.com/settings/accesstoken
// NOTE! Your token is private, don't share it with anyone!

const TIBBERTOKEN = "5K4MVS-OjfWhK_4yrjOlFe1F6kJXPVf7eQYggo8ebAE";

// In most cases, the HOME_NR should be 0, but if you have several subscriptions (house + cabin eg)
// then you may need to change it to 1 (or 2).
// Try 0 first and if there is an error message, try with 1 (and then 2).
if (args.widgetParameter) {
	HOME_NUMBER = args.widgetParameter;
} else {
	HOME_NUMBER = 0; // Default - brukes om ikke man har lagt til paramter for widgeten og/eller når man ser på widgeten direkte i appen.
}

const MONEY_SIGN = "kr"; // Change to "€" or "$" if you don't use Norwegian kroner
const CENT_SIGN = "øre"; // Change to "cents" or "pennies" if you don't use Norwegian kroner

const HOME_NR = HOME_NUMBER;

// HTML code for background color (#000000 is black)
const BACKGROUND_COLOR = "#000000";

// HTML code for text color (#FFFFFF is white)
const TEXT_COLOR = "#FFFFFF";

// When the price this hour is higher than the average price today, this text color is used (red)
const TEXT_COLOR_HIGH = "#de4035";

// When the price this hour is lower than the average price today, this text color is used (green)
const TEXT_COLOR_LOW = "#35de3b";

// Specify how many hours back and forward from the current hour it should use
const HOURS_BACK = 3;
const HOURS_FORWARD = 21;

// Should network lease be added to the amounts?
const NETWORK_LEASE = false; // (true or false)
const NET_FIXED = 198; // In kroner per month
const NET_KWH = 35.51; // In øre per kWh, with period as decimal separator


// Specify the size of the graph
const GRAPH_WIDTH = 2400;
const GRAPH_HEIGHT = 1200;





// YOU DON'T HAVE TO CHANGE ANYTHING BELOW!
// ----------------------------------------

// GraphQL query
let body = {
  "query": "{ \
    viewer { \
      homes { \
        appNickname \
	  	  address { \
	  	    address1 \
		} \
        currentSubscription { \
          priceRating { \
            hourly { \
              entries { \
                total \
                time \
              } \
            } \
          } \
        } \
        dayConsumption: consumption (resolution: HOURLY, last: " + new Date().getHours() + ") { \
          pageInfo { \
            totalConsumption \
            totalCost \
          } \
        } \
        monthConsumption: consumption (resolution: DAILY, last: " + (new Date().getDate()-1) + ") { \
	      pageInfo { \
		    totalConsumption \
		    totalCost \
	      } \
        } \
      } \
    } \
  }"
}

let req = new Request("https://api.tibber.com/v1-beta/gql")
req.headers = {
  "Authorization": "Bearer " + TIBBERTOKEN,
  "Content-Type": "application/json"
}
req.body = JSON.stringify(body)
req.method = "POST";
let json = await req.loadJSON()

// Array with all hourly prices
let allPrices = json["data"]["viewer"]["homes"][HOME_NR]["currentSubscription"]["priceRating"]["hourly"]["entries"]

// Date object for exactly this hour
let d = new Date();
d.setMinutes(0)
d.setSeconds(0)
d.setMilliseconds(0)//

// Loop to find array key for the current hour
let iNow, iStart, iEnd, dLoop
for (let i = 0; i < allPrices.length; i++) {
 dLoop = new Date(allPrices[i].time)
 if (d.getTime() == dLoop.getTime()) {
   iNow = i
   iStart = (iNow-HOURS_BACK)
   iEnd = (iNow + HOURS_FORWARD)
   if (iEnd > allPrices.length) {
	   iEnd = (allPrices.length-1)
   }
   break;
  }
}

// Loop to find average price
let avgPrice = 0
let minPrice = 100000
let maxPrice = 0
let prices = [];
let colors = [];
let pointsize = [];

// Find next midnight
d.setHours(0);
d.setDate(d.getDate()+1)

for (let i = iStart; i <= iEnd; i++) {
  if (NETWORK_LEASE) {
    allPrices[i].total = allPrices[i].total+(NET_KWH/100);
  }
  avgPrice += allPrices[i].total
  prices.push(Math.round(allPrices[i].total * 100));

  if (allPrices[i].total * 100 < minPrice)
    minPrice = Math.round(allPrices[i].total * 100)
   if (allPrices[i].total * 100 > maxPrice)
     maxPrice = Math.round(allPrices[i].total * 100)

  if (i == iNow) {
  	colors.push("'yellow'");
    pointsize.push(20);
  }
  else if (d.getTime() == new Date(allPrices[i].time).getTime()) {
    colors.push("'cyan'");
    pointsize.push(20);
  }
  else {
    colors.push("'cyan'");
    pointsize.push(7);
  }
}
avgPrice = Math.round(avgPrice / (prices.length) * 100)

// Loop to create line for the average price
let dTemp
let avgPrices = []
let labels = []
for (let i = iStart; i <= iEnd; i++) {
  avgPrices.push(avgPrice);
  dTemp = new Date(allPrices[i].time)
  let hours = dTemp.getHours();
  if (hours < 10)
    hours = "0"+hours;
  labels.push("'" + hours + "'");
}

let url = "https://quickchart.io/chart?w="+ GRAPH_WIDTH + "&h=" + GRAPH_HEIGHT + "&devicePixelRatio=1.0&c="
url += encodeURI("{ \
   type:'line', \
   data:{ \
      labels:[ \
         " + labels + " \
      ], \
      datasets:[ \
         { \
            label:'" + CENT_SIGN + " per kWh', \
            steppedLine:true, \
            data:[ \
               " + prices + " \
            ], \
            fill:false, \
            borderColor:'cyan', \
            borderWidth: 7, \
            pointBackgroundColor:[ \
               " + colors + " \
            ], \
            pointRadius:[ \
               " + pointsize + " \
            ] \
         }, \
         { \
            label:'Average (" + avgPrice + " " + CENT_SIGN + ")', \
            data:[ \
               " + avgPrices + " \
            ], \
            fill:false, \
            borderColor:'red', \
            borderWidth: 7, \
            pointRadius: 0 \
         } \
      ] \
   }, \
   options:{ \
      legend:{ \
         labels:{ \
            fontSize:90, \
            fontColor:'white' \
         } \
      }, \
      scales:{ \
         yAxes:[ \
            { \
               ticks:{ \
                  beginAtZero:false, \
                  fontSize:100, \
                  fontColor:'white' \
               } \
            } \
         ], \
         xAxes:[ \
            { \
               ticks:{ \
                  fontSize:60, \
                  fontColor:'white' \
               } \
            } \
         ] \
      } \
   } \
}")

const GRAPH = await new Request(url).loadImage()


// Fetch total usage/cost so far today
let totCostD = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalCost"])
let totConsumptionD = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalConsumption"])
// Fetch total usage/cost so far this month
let totCostM = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["monthConsumption"]["pageInfo"]["totalCost"]) + totCostD
let totConsumptionM = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["monthConsumption"]["pageInfo"]["totalConsumption"]) + totConsumptionD

// Add network lease to the daily sum?
if (NETWORK_LEASE) {
	totCostD += NET_FIXED/new Date(d.getYear(), d.getMonth()+1, 0).getDate();
	totCostD += totConsumptionD*(NET_KWH/100);
	totCostD = Math.round(totCostD);
}

// Add network lease to the monthly sum?
if (NETWORK_LEASE) {
	totCostM += NET_FIXED;
	totCostM += totConsumptionM*(NET_KWH/100);
	totCostM = Math.round(totCostM);
}

// Fetch price in øre for the current hour
let priceOre = Math.round(allPrices[iNow].total * 100)

// Fetch the Tibber logo
const TIBBER_LOGO = await new Request("https://tibber.imgix.net/zq85bj8o2ot3/6FJ8FvW8CrwUdUu2Uqt2Ns/3cc8696405a42cb33b633d2399969f53/tibber_logo_blue_w1000.png").loadImage()


// Create widget
async function createWidget() {
  // Create new empty ListWidget instance
  let lw = new ListWidget();

  // Set new background color
  lw.backgroundColor = new Color(BACKGROUND_COLOR);

  // We can't control when the widget fetches a new price,
  // but we try to request the widget to refresh one minute after the next hour
  var d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(1);
  lw.refreshAfterDate = d;

  // Add the Tibber logo in its own stack
  let stack = lw.addStack()
  stack.addSpacer(100)
  let imgstack = stack.addImage(TIBBER_LOGO)
  imgstack.imageSize = new Size(100, 30)
  imgstack.centerAlignImage()
  stack.setPadding(0, 0, 5, 0)

  if (NETWORK_LEASE) {
    let txtStack = lw.addStack();
    txtStack.addSpacer(100);
    let txtNett = txtStack.addText("All amounts incl. network lease");
    txtNett.centerAlignText();
    txtNett.font = Font.lightSystemFont(10);
  }

  lw.addSpacer(10);

  let stack2 = lw.addStack()

  // Left column
  let stackV = stack2.addStack();
  stackV.layoutVertically()
  stackV.centerAlignContent()
  stackV.setPadding(0, 30, 0, 0)

  // Add current price in left column
  let price = stackV.addText(priceOre + "");
  price.centerAlignText();
  price.font = Font.lightSystemFont(20);
  // Price higher or lower than average defines color
  if (priceOre < avgPrice)
    price.textColor = new Color(TEXT_COLOR_LOW)
  else if (priceOre > avgPrice)
    price.textColor = new Color(TEXT_COLOR_HIGH)

  const priceTxt = stackV.addText(CENT_SIGN + "/kWh");
  priceTxt.centerAlignText();
  priceTxt.font = Font.lightSystemFont(10);
  priceTxt.textColor = new Color(TEXT_COLOR);

  // Add today's "max | min" hourly price
  let maxmin = stackV.addText(minPrice + " | " + maxPrice)
  maxmin.centerAlignText()
  maxmin.font = Font.lightSystemFont(10);
  maxmin.textColor = new Color(TEXT_COLOR);

  // Distance between the columns
  stack2.addSpacer(40)

  // Middle column
  let stackM = stack2.addStack();
  stackM.layoutVertically()

  // Add usage so far today in middle column
  let consumption = stackM.addText(totCostD + " " + MONEY_SIGN);
  consumption.rightAlignText();
  consumption.font = Font.lightSystemFont(16);
  consumption.textColor = new Color(TEXT_COLOR);

  let consumption2 = stackM.addText(totConsumptionD + " kWh");
  consumption2.rightAlignText();
  consumption2.font = Font.lightSystemFont(14);
  consumption2.textColor = new Color(TEXT_COLOR);

  let consumptionTxt = stackM.addText("Today so far");
  consumptionTxt.rightAlignText();
  consumptionTxt.font = Font.lightSystemFont(10);
  consumptionTxt.textColor = new Color(TEXT_COLOR);

  // Distance between the columns
  stack2.addSpacer(40)

  // Right column
  let stackH = stack2.addStack();
  stackH.layoutVertically()

  // Add usage so far this month in right column
  consumption = stackH.addText(totCostM + " " + MONEY_SIGN);
  consumption.rightAlignText();
  consumption.font = Font.lightSystemFont(16);
  consumption.textColor = new Color(TEXT_COLOR);

  consumption2 = stackH.addText(totConsumptionM + " kWh");
  consumption2.rightAlignText();
  consumption2.font = Font.lightSystemFont(14);
  consumption2.textColor = new Color(TEXT_COLOR);

  consumptionTxt = stackH.addText("So far this month");
  consumptionTxt.rightAlignText();
  consumptionTxt.font = Font.lightSystemFont(10);
  consumptionTxt.textColor = new Color(TEXT_COLOR);


  // Distance to the graph
  lw.addSpacer(25);


  let HomeNickname = json["data"]["viewer"]["homes"][HOME_NR]["appNickname"];
  if (HomeNickname != null)
    graphTxt = lw.addText("Hourly prices" + " (" + HomeNickname + ")" );
  else
    graphTxt = lw.addText("Hourly prices");
  graphTxt.centerAlignText();
  graphTxt.font = Font.lightSystemFont(16);
  graphTxt.textColor = new Color(TEXT_COLOR);

  lw.addSpacer(10)

  let stackGraph = lw.addStack()
  let imgstack2 = stackGraph.addImage(GRAPH)
  imgstack2.imageSize = new Size(300, 150)
  imgstack2.centerAlignImage()
  stackGraph.setPadding(0, 0, 0, 0)


  // Distance to bottom text
  lw.addSpacer(20)


  // Add info about when the widget last fetched the price
  d = new Date()
  let hour = d.getHours();

  // Convert to the format HH:mm
  if (hour < 10) hour = "0" + hour;
  let min = d.getMinutes();
  if (min < 10) min = "0" + min;

  let time = lw.addText("Updated: " + hour + ":" + min);
  time.centerAlignText();
  time.font = Font.lightSystemFont(8);
  time.textColor = new Color(TEXT_COLOR);

  // Return the created widget
  return lw;
}

let widget = await createWidget();

// Check where the script is running
if (config.runsInWidget) {
  // Runs inside a widget so add it to the homescreen widget
  Script.setWidget(widget);
} else {
  // Show the medium widget inside the app
  widget.presentLarge();
}
Script.complete();
