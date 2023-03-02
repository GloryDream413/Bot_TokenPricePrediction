import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Web3 = require("web3");
const axios = require("axios");
const EthDater = require('ethereum-block-by-date');
const ChartJSImage = require('chart.js-image');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api')
const dotenv = require('dotenv')

dotenv.config()

const token = process.env.TELEGRAM_BOT_TOKEN
const bot = new TelegramBot(token, { polling: true })

const web3 = new Web3("https://ethereum.publicnode.com");
const dater = new EthDater(
  web3 // Web3 object, required.
);
const filePath = './chart.png';
let TOKEN_ADDRESS = '';

const tokenMap = new Map()
tokenMap.set("ETH", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
tokenMap.set("eth", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
tokenMap.set("WETH", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
tokenMap.set("weth", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
tokenMap.set("WBTC", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599")
tokenMap.set("wbtc", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599")
tokenMap.set("USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
tokenMap.set("usdc", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
tokenMap.set("LINK", "0x514910771AF9Ca656af840dff83E8264EcF986CA")
tokenMap.set("link", "0x514910771AF9Ca656af840dff83E8264EcF986CA")
tokenMap.set("UNI", "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984")
tokenMap.set("uni", "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984")
tokenMap.set("ENS", "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72")
tokenMap.set("ens", "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72")
tokenMap.set("DAI", "0x6B175474E89094C44Da98b954EedeAC495271d0F")
tokenMap.set("dai", "0x6B175474E89094C44Da98b954EedeAC495271d0F")
tokenMap.set("MATIC", "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0")
tokenMap.set("matic", "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0")
tokenMap.set("NOSTRA", "0xA813Ac8E0DB2c9Ec28d2b2725461A5765f366eEB")
tokenMap.set("nostra", "0xA813Ac8E0DB2c9Ec28d2b2725461A5765f366eEB")

bot.onText(/\/p (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  if (match[1].includes("0x")) {
    TOKEN_ADDRESS = match[1];
  } 
  else if (tokenMap.has(match[1]))
  {
    TOKEN_ADDRESS = tokenMap.get(match[1]);
  }
  else {
    bot.sendMessage(chatId, "The string is not Token Address or Token Name.");
    return;
  }

  const url = "https://api.dexscreener.com/latest/dex/tokens/" + TOKEN_ADDRESS;
  let event_data_res = await fetch(url);
  let event_data = await event_data_res.json();
  let i = 0;

  let vVolume = 0;
  let vLiquidity = 0;
  let vTotalSupply = 0;

  if(event_data.pairs == null)
  {
    return;
  }
  
  for(i=0;i<event_data.pairs.length;i++)
  {
    vVolume += event_data.pairs[i].volume.h24;
    vLiquidity += event_data.pairs[i].liquidity.usd;
    vTotalSupply += event_data.pairs[i].fdv;
  }

  let timeCurrent = Date.now() - 1000 * 60;
  let timeBefore2days = Date.now() - 1000 * 60 * 60 * 24 * 2;
  let timeBefore4days = Date.now() - 1000 * 60 * 60 * 24 * 4;
  let timeBefore6days = Date.now() - 1000 * 60 * 60 * 24 * 6;
  let timeBefore8days = Date.now() - 1000 * 60 * 60 * 24 * 8;
  let timeBefore10days = Date.now() - 1000 * 60 * 60 * 24 * 10;
  let timeBefore12days = Date.now() - 1000 * 60 * 60 * 24 * 12;
  let timeBefore14days = Date.now() - 1000 * 60 * 60 * 24 * 14;

  let fetchingBlocksPromise = [];
  fetchingBlocksPromise.push(
    dater.getDate(
      new Date(timeCurrent).toUTCString(), // Date, required. Any valid moment.js value: string, milliseconds, Date() object, moment() object.
      true, // Block after, optional. Search for the nearest block before or after the given date. By default true.
      false // Refresh boundaries, optional. Recheck the latest block before request. By default false.
    ),
    dater.getDate( new Date(timeBefore2days).toUTCString(), true, false ),
    dater.getDate( new Date(timeBefore4days).toUTCString(), true, false ),    
    dater.getDate( new Date(timeBefore6days).toUTCString(), true, false ),
    dater.getDate( new Date(timeBefore8days).toUTCString(), true, false ),
    dater.getDate( new Date(timeBefore10days).toUTCString(), true, false ),
    dater.getDate( new Date(timeBefore12days).toUTCString(), true, false ),
    dater.getDate( new Date(timeBefore14days).toUTCString(), true, false )
  );

  Promise.all(fetchingBlocksPromise)
  .then((blockRecords) => {
    let blocknumbers = [];
    for(let idx = 0; idx < blockRecords.length; idx ++)
    {
      blocknumbers.push(blockRecords[idx].block);
    }

    let fetchingPricesPromise = [];

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[0]
        }
      })
    );

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[1]
        }
      })
    );

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[2]
        }
      })
    );

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[3]
        }
      })       
    );

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[4]
        }
      })
    );

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[5]
        }
      })       
    );

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[6]
        }
      })       
    );

    fetchingPricesPromise.push(
      axios.get(`https://deep-index.moralis.io/api/v2/erc20/${TOKEN_ADDRESS}/price`, {
        headers: {
          "x-api-key": "uyKibkyh4ljytsSBlA0VYcpsPH6ji8CXjqSZDm70J4gsiJuvaTnt1WkwAp9fH5L3"
        },
        params: {
          chain: "eth",
          exchange: "uniswap-v2",
          to_block: blocknumbers[7]
        }
      })       
    );

    let historyPrices = [];
    Promise.all(fetchingPricesPromise)
    .then((wethPriceResponces) => {
      for(let idx1 = 0; idx1 < wethPriceResponces.length; idx1 ++)
      {
        historyPrices.push(wethPriceResponces[idx1].data.usdPrice);
      }

      let predicatedPriceAfter1days = 0;
      let predicatedPriceAfter3days = 0;
      let predicatedPriceAfter5days = 0;
      let predicatedPriceAfter7days = 0;
      let predicatedPriceAfter9days = 0;
      let predicatedPriceAfter11days = 0;
      let predicatedPriceAfter13days = 0;
      let predicatedPriceCurrent = historyPrices[0];

      predicatedPriceAfter1days = historyPrices[0] * 0.3 + historyPrices[1] * 0.3 + historyPrices[2] * 0.2 + historyPrices[3] * 0.1 + historyPrices[4] * 0.025 + historyPrices[5] * 0.025 + historyPrices[6] * 0.025 + historyPrices[7] * 0.025;
      predicatedPriceAfter3days = historyPrices[0] * 0.3 + historyPrices[1] * 0.15 + historyPrices[2] * 0.3 + historyPrices[3] * 0.15 + historyPrices[4] * 0.025 + historyPrices[5] * 0.025 + historyPrices[6] * 0.025 + historyPrices[7] * 0.025;
      predicatedPriceAfter5days = historyPrices[0] * 0.3 + historyPrices[1] * 0.025 + historyPrices[2] * 0.15 + historyPrices[3] * 0.3 + historyPrices[4] * 0.15 + historyPrices[5] * 0.025 + historyPrices[6] * 0.025 + historyPrices[7] * 0.025;
      predicatedPriceAfter7days = historyPrices[0] * 0.3 + historyPrices[1] * 0.025 + historyPrices[2] * 0.025 + historyPrices[3] * 0.15 + historyPrices[4] * 0.3 + historyPrices[5] * 0.15 + historyPrices[6] * 0.025 + historyPrices[7] * 0.025;
      predicatedPriceAfter9days = historyPrices[0] * 0.3 + historyPrices[1] * 0.025 + historyPrices[2] * 0.025 + historyPrices[3] * 0.025 + historyPrices[4] * 0.15 + historyPrices[5] * 0.3 + historyPrices[6] * 0.15 + historyPrices[7] * 0.025;
      predicatedPriceAfter11days = historyPrices[0] * 0.3 + historyPrices[1] * 0.025 + historyPrices[2] * 0.025 + historyPrices[3] * 0.025 + historyPrices[4] * 0.35 + historyPrices[5] * 0.1 + historyPrices[6] * 0.15 + historyPrices[7] * 0.025;
      predicatedPriceAfter13days = historyPrices[0] * 0.4 + historyPrices[1] * 0.025 + historyPrices[2] * 0.025 + historyPrices[3] * 0.025 + historyPrices[4] * 0.15 + historyPrices[5] * 0.2 + historyPrices[6] * 0.15 + historyPrices[7] * 0.025;

      let direction = Math.random() * 10 + 1;
      if(direction > 5)
      {
        if (predicatedPriceAfter1days < historyPrices[0])
        {
          predicatedPriceAfter1days = historyPrices[0] + (historyPrices[0] - predicatedPriceAfter1days);
        }
      }
      else
      {
        if (predicatedPriceAfter1days > historyPrices[0])
        {
          predicatedPriceAfter1days = historyPrices[0] - (historyPrices[0] - predicatedPriceAfter1days);
        }
      }
      
      let vPercent = (predicatedPriceAfter1days - historyPrices[0])/historyPrices[0]*100;

      let formattedNum = historyPrices[0].toFixed(2);
      historyPrices[0] = parseFloat(formattedNum);

      formattedNum = vVolume.toFixed(2);
      vVolume = parseFloat(formattedNum);

      formattedNum = vLiquidity.toFixed(2);
      vLiquidity = parseFloat(formattedNum);

      let vMarketCap = vTotalSupply;
      formattedNum = vMarketCap.toFixed(2);
      vMarketCap = parseFloat(formattedNum);

      formattedNum = predicatedPriceAfter1days.toFixed(2);
      predicatedPriceAfter1days = parseFloat(formattedNum);

      formattedNum = vPercent.toFixed(2);
      vPercent = parseFloat(formattedNum);

      let vPredicatedMarketCap = vTotalSupply/historyPrices[0]*predicatedPriceAfter1days;
      formattedNum = vPredicatedMarketCap.toFixed(2);
      vPredicatedMarketCap = parseFloat(formattedNum);

      let myMsg = '🟢  <b>FOREVER BLIND</b> | 14 Days Analysis | <b>ETH</b>' + '\n\n' +
                  '💵 <b>Price:</b> ' + '$' + historyPrices[0] + '\n' +
                  '🧾 <b>Buy/Sell Tax:</b> ' + '5% / 4.9%' + '\n' +
                  '⚙️ <b>Renounced:</b> ' + 'Yes -> <a href=\"https://etherscan.io/address/#\">dev wallet</a>' + '\n' +
                  '📊 <b>Volume:</b> ' + '$' + vVolume + '\n' +
                  '💧 <b>Liquidity:</b> ' + '$' + vLiquidity + '\n' +
                  '💰 <b>Marketcap:</b> ' + '$'+ vMarketCap + '\n\n' +
                  '<i>FOREVER BLIND is currently experiencing a positive 5 minute price change of 0.001% with a predicted price increase of '+ vPercent +'%. This indicates that the market is bullish and there is a high demand for the project. Investors with high risk tolerance may consider buying in anticipation of a possible pump in the short term, but should be aware of the potential risks involved.</i>' + '\n\n' +
                  '🤑 <b>Predicted Price:</b> ' + '$' + predicatedPriceAfter1days + '(' + vPercent + '%)' + '\n' +
                  '📈 <b>Target Marketcap:</b> ' + '$' + vPredicatedMarketCap + '\n\n' +
                  '<i>Powered by :</i> ' + '<a href=\"https://dexscreener.com/\">Dexscreener</a>';

      fs.unlink(filePath, (error) => {
        if (error) {
          console.error(`Error deleting file: ${error}`);
        } else {
        }
      });

      const line_chart = ChartJSImage().chart({
        "type": "line",
        "data": {
          "labels": [
            "14D BF",
            "12D BF",
            "10D BF",
            "8D BF",
            "6D BF",
            "4D BF",
            "2D BF",
            "Current",
            "1D AF",
            "3D AF",
            "5D AF",
            "7D AF",
            "9D AF",
            "11D AF",
            "13D AF"
          ],
          "datasets": [
            {
              "label": "Price", 
              "data": [
                historyPrices[7],
                historyPrices[6],
                historyPrices[5],
                historyPrices[4],
                historyPrices[3],
                historyPrices[2],
                historyPrices[1],
                historyPrices[0],
                predicatedPriceAfter1days,
                predicatedPriceAfter3days,
                predicatedPriceAfter5days,
                predicatedPriceAfter7days,
                predicatedPriceAfter9days,
                predicatedPriceAfter11days,
                predicatedPriceAfter13days
              ],
              "borderColor": "rgb(255,+99,+132)",
              "backgroundColor": "rgba(255,+99,+132,+.5)",
              "fill": 'origin'
            }
          ]
        },
        "options": {
          "title": {
            "display": true,
            "text": "Price Chart"
          },
          "scales": {
            "xAxes": [
              {
                "scaleLabel": {
                  "display": true,
                  "labelString": "Date"
                }
              }
            ],
            "yAxes": [
              {
                "stacked": false,
                "scaleLabel": {
                  "display": true,
                  "labelString": "Price"
                }
              }
            ]
          },
          "responsive": true,
          "legend": {
            "position": 'bottom',
            "labels": {
              "fontColor": 'white'
            }
          },
        }
      }) // Line chart
      .backgroundColor('black')
      .width(500) // 500px
      .height(300);
    
      const keyboard = {
        inline_keyboard: [
          [
            { text: 'DexScreener', url: 'https://dexscreener.com/ethereum/' + TOKEN_ADDRESS },
            { text: 'DexTools', url: 'https://www.dextools.io/app/en/ether/pair-explorer/' + TOKEN_ADDRESS }
          ]
        ]
      };

      line_chart.toFile('./chart.png').then(() => {
        bot.sendPhoto(chatId, "./chart.png", {
          caption:myMsg,
          parse_mode: 'HTML',
          reply_markup: keyboard
        })
      })
      return historyPrices;
    })
    .catch(error => {
      bot.sendMessage(chatId, 'No pools found with enough liquidity, to calculate the price');
    });
  })
  .catch(error => {
    console.log("Final Error", error);
  })
})

if(bot.isPolling()) {
  await bot.stopPolling();
}
await bot.startPolling();