// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: bolt;
// Tibber-widget
// v1.0.0 - first version - Sven-Ove Bjerkan
// v1.0.1 - Added "HOME_NR" as setting
// v1.5.0 - Created medium and large size widgets (currently as 3 separate scripts)
// v1.5.1 - Uploaded to GitHub by Daniel Eneström (https://github.com/danielenestrom)

// Find your token by logging in with your Tibber account here:
// https://developer.tibber.com/settings/accesstoken
// NOTE! Your token is private, don't share it with anyone!
const TIBBERTOKEN = "476c477d8a039529478ebd690d35ddd80e3308ffc49b59c65b142321aee963a4";
// In most cases, the HOME_NR should be 0, but if you have several subscriptions (house + cabin eg)
// then you may need to change it to 1 (or 2).
// Try 0 first and if there is an error message, try with 1 (and then 2).
const HOME_NR = 0;

// HTML code for background color (#000000 is black)
const BACKGROUND_COLOR = "#000000";

// HTML code for text color (#FFFFFF is white)
const TEXT_COLOR = "#FFFFFF";

// When the hourly rate is higher than the day's average rate this color is used (red)
const TEXT_COLOR_HIGH = "#de4035";

// When the price this hour is lower than the average price today, this text color is used (green)
const TEXT_COLOR_LOW = "#35de3b";

const MONEY_SIGN = "kr"; // Change to "€" or "$" if you don't use Norwegian kroner
const CENT_SIGN = "øre"; // Change to "cents" or "pennies" if you don't use Norwegian kroner



// YOU DON'T HAVE TO CHANGE ANYTHING BELOW!
// -----------------------------------------

// GraphQL query
let body = {
  "query": "{ \
    viewer { \
      homes { \
        currentSubscription { \
          priceInfo { \
            current { \
              total \
            } \
            today { \
              total \
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

// Array with all of today's hourly prices
let allToday = json["data"]["viewer"]["homes"][HOME_NR]["currentSubscription"]["priceInfo"]["today"]

// Loop through all of today's hourly prices to find min/max/average
let minPrice = 100000
let maxPrice = 0
let avgPrice = 0
for (var i = 0; i < allToday.length; i++) {
  if (allToday[i].total * 100 < minPrice)
    minPrice = Math.round(allToday[i].total * 100)
  if (allToday[i].total * 100 > maxPrice)
    maxPrice = Math.round(allToday[i].total * 100)
  avgPrice += allToday[i].total
}
avgPrice = avgPrice / (allToday.length-1) * 100

// Fetch total usage/cost so far today
let totCostD = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalCost"])
let totConsumptionD = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["dayConsumption"]["pageInfo"]["totalConsumption"])

// Fetch total usage/cost so far this month
let totCostM = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["monthConsumption"]["pageInfo"]["totalCost"]) + totCostD
let totConsumptionM = Math.round(json["data"]["viewer"]["homes"][HOME_NR]["monthConsumption"]["pageInfo"]["totalConsumption"]) + totConsumptionD

// Fetch price in kroner for the current hour
let price = (json["data"]["viewer"]["homes"][HOME_NR]["currentSubscription"]["priceInfo"]["current"]["total"]);

// Recalculate to øre/kWh
let priceOre = Math.round(price * 100)

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
  stack.setPadding(0, 0, 15, 0)

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
  // Price higher or lower than the average defines the color
  if (priceOre < avgPrice)
    price.textColor = new Color(TEXT_COLOR_LOW)
  if (priceOre > avgPrice)
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
  let usage = stackM.addText(totCostD + " " + MONEY_SIGN);
  usage.rightAlignText();
  usage.font = Font.lightSystemFont(16);
  usage.textColor = new Color(TEXT_COLOR);

  let usage2 = stackM.addText(totConsumptionD + " kWh");
  usage2.rightAlignText();
  usage2.font = Font.lightSystemFont(14);
  usage2.textColor = new Color(TEXT_COLOR);

  let usageTxt = stackM.addText("Today so far");
  usageTxt.rightAlignText();
  usageTxt.font = Font.lightSystemFont(10);
  usageTxt.textColor = new Color(TEXT_COLOR);

  // Distance between the columns
  stack2.addSpacer(40)

  // Right column
  let stackH = stack2.addStack();
  stackH.layoutVertically()

  // Add usage so far this month in right column
  usage = stackH.addText(totCostM + " " + MONEY_SIGN);
  usage.rightAlignText();
  usage.font = Font.lightSystemFont(16);
  usage.textColor = new Color(TEXT_COLOR);

  usage2 = stackH.addText(totConsumptionM + " kWh");
  usage2.rightAlignText();
  usage2.font = Font.lightSystemFont(14);
  usage2.textColor = new Color(TEXT_COLOR);

  usageTxt = stackH.addText("So far this month");
  usageTxt.rightAlignText();
  usageTxt.font = Font.lightSystemFont(10);
  usageTxt.textColor = new Color(TEXT_COLOR);


  // Distance to bottom text
  lw.addSpacer(30)

  // Add info about when the widget was last refreshed
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
  widget.presentMedium();
}
Script.complete();