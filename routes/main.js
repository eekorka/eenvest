const express = require('express')
const router = express.Router()

const OpenAPI = require('@tinkoff/invest-openapi-js-sdk')

const auth = require('../middleware/auth')
const token = require('../middleware/token')

router.get('/', auth, token, (req, res) => {
  const apiURL = 'https://api-invest.tinkoff.ru/openapi'
  const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws'
  const secretToken = res.locals.token
  const api = new OpenAPI({ apiURL, secretToken, socketURL })

  function getRound(val) {
    return +(val.toFixed(2))
  }

  async function getAllInfo() {
    let account = await getAccount()
    let portfolio = await getPortfolio()
    let allOperations = await getOperations({id: account})
    allOperations = allOperations.filter((operation) => operation.status === 'Done')
    for (pos of portfolio) {
      pos.orderBook = await getOrderBook(pos.figi)
      pos.operations = allOperations.filter((operations) => operations.figi === pos.figi)
    }

    let dollarInfo = portfolio.filter(pos => pos.name === 'Доллар США')[0]
    let etfsInfo = portfolio.filter(pos => pos.instrumentType === 'Etf')
    let etfsRUBInfo = etfsInfo.filter(pos => pos.averagePositionPrice.currency === 'RUB')
    let etfsUSDInfo = etfsInfo.filter(pos => pos.averagePositionPrice.currency === 'USD')

    let otherOperations = allOperations.filter(operation => !operation.figi)

    return {dollarInfo, etfsRUBInfo, etfsUSDInfo, otherOperations}
  }

  function getAccount() {
    return api.accounts().then(result => 
      { 
        if (result.accounts.length === 1) {
          return result.accounts[0].brokerAccountId
        }
      }, 
      error => console.log(error)
      )
  }

  function getPortfolio() {
    return api.portfolio().then(result => 
      { 
        return result.positions
      }, 
      error => console.log(error)
      )
  }

  function getOrderBook(figi) {
    return api.orderbookGet({figi: figi, depth: 1}).then(result => 
      { 
        return result
      }, 
      error => console.log(error)
      )
  }

  function getOperations(obj) {
    let d1 = new Date('02 February 2021 00:00 UTC')
    let d2 = new Date(Date.now())
    let operations
    if (obj.id) {
      operations = api.operations({brokerAccountId: obj.id, from: d1.toISOString(), to: d2.toISOString()})
    } else if (obj.figi) {
      operations = api.operations({figi: obj.figi, from: d1.toISOString(), to: d2.toISOString()})
    }
    return operations.then(result => 
      { 
        return result.operations
      }, 
      error => console.log(error)
      )
  }

  function getOperationsAveragePrice(operations, operationType) {
    let sum = 0
    let i = 0
    for (op of operations) {
      if (op.operationType === operationType) {
        sum += op.price
        i++
      }
    }

    return sum / i
  }

  function getOperationsSum(operations, operationType) { //еще подумать
    let sum = 0
    for (op of operations) {
      if (op.operationType === operationType) {
        sum += op.payment
      }
    }

    return -sum
  }

  function getDollar(dollarInfo) {
    return {
      priceNow: dollarInfo.orderBook.lastPrice,
      averageBuyingPrice: getRound(getOperationsAveragePrice(dollarInfo.operations, 'Buy')),
      averageSellingPrice: getRound(getOperationsAveragePrice(dollarInfo.operations, 'Sell')),
      brokerCommission: getRound(getOperationsSum(dollarInfo.operations, 'BrokerCommission'))
    }
  }

  function getEtfs(etfsInfo, dollar) {
    let etfs = []
    for (etfInfo of etfsInfo) {
      let etf = {}
      etf.name = etfInfo.name
      etf.figi = etfInfo.figi
      etf.ticker = etfInfo.ticker
      etf.tradeStatus = etfInfo.orderBook.tradeStatus
      etf.currency = etfInfo.averagePositionPrice.currency
      etf.number = etfInfo.balance
      etf.invested = getOperationsSum(etfInfo.operations, 'Buy')
      etf.investedRUB = 0
      etf.totalCostNow = etf.number * etfInfo.orderBook.lastPrice
      etf.profit = etf.totalCostNow - etf.invested
      etf.profitRUB = 0
      etf.realProfit = 0

      if (etf.currency === 'USD') {
        etf.investedRUB = etf.invested * dollar.averageBuyingPrice
        etf.profitRUB = etf.profit * dollar.priceNow
        etf.realProfit = etf.totalCostNow * dollar.priceNow - etf.investedRUB
        etf.brokerCommission = getOperationsSum(etfInfo.operations, 'BrokerCommission') * 
      ((dollar.averageBuyingPrice + dollar.averageSellingPrice)/2)
      } else if (etf.currency === 'RUB') {
        etf.investedRUB = etf.invested
        etf.profitRUB = etf.profit
        etf.realProfit = etf.profit
        etf.brokerCommission = getOperationsSum(etfInfo.operations, 'BrokerCommission')
      }

      etf.invested = getRound(etf.invested)
      etf.totalCostNow = getRound(etf.totalCostNow)
      etf.profit = getRound(etf.profit)
      etf.profitRUB = getRound(etf.profitRUB)
      etf.realProfit = getRound(etf.realProfit)
      etf.brokerCommission = getRound(etf.brokerCommission)

      etfs.push(etf)
    }

    return etfs
  }

  function getStats(etfs, dollar, otherOperations) {
    let statsInfo = []
    for (arr of etfs) {
      for(etf of arr) {
        statsInfo.push(etf)
      }
    }

    let stats = {
      totalInvested: 0,
      totalProfit: 0,
      totalRealProfit: 0,
      totalPayOut: 0,
      totalCommission: dollar.brokerCommission,
      totalTax: 0
    }

    for (etf of statsInfo) {
      stats.totalInvested += etf.investedRUB
      stats.totalProfit += etf.profitRUB
      stats.totalRealProfit += etf.realProfit
      stats.totalCommission += etf.brokerCommission
    }

    for (operation of otherOperations) {
      if (operation.operationType === 'PayOut') {
        stats.totalPayOut += operation.payment
      }

      if (operation.operationType === 'Tax' ||
      operation.operationType === 'TaxBack') {
        stats.totalTax += operation.payment
      }
    }

    stats = {
      totalInvested: getRound(stats.totalInvested),
      totalProfit: getRound(stats.totalProfit),
      totalRealProfit: getRound(stats.totalRealProfit),
      totalPayOut: getRound(-stats.totalPayOut),
      totalTax: getRound(-stats.totalTax),
      totalCommission: getRound(stats.totalCommission)
    }

    return stats
  }

  function getTimestamp() {
    return {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    }
  }

  async function app() {
    let {dollarInfo, etfsRUBInfo, etfsUSDInfo, otherOperations} = await getAllInfo()

    let dollar = getDollar(dollarInfo)
    let etfsUSD = getEtfs(etfsUSDInfo, dollar)
    let etfsRUB = getEtfs(etfsRUBInfo)
    let stats = getStats([etfsUSD, etfsRUB], dollar, otherOperations)
    let timestamp = getTimestamp()

    res.render('main', {dollar, etfsUSD, etfsRUB, stats, timestamp})
  }

  app()
})

module.exports = router