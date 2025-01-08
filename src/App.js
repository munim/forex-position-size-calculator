/**
 * @fileoverview
 * Forex Lot Size Calculator React Application
 *
 * This application calculates appropriate lot sizes for forex and gold trading based on:
 * - Account balance and currency
 * - Risk percentage per trade
 * - Trading instrument (currency pair or gold)
 * - Entry price and stop loss
 *
 * The calculator supports various input formats commonly used in trading signals:
 * - Standard format: "Buy EURUSD 1.05000, SL 1.04800"
 * - Signal format: "EURUSD Buy Now Enter 1.05000"
 * - Limit orders: "Entry (sell limit): 1.05000"
 * - Gold trading: "XAUUSD Buy Enter 2000.50"
 *
 * Features:
 * - Automatic pip value calculation
 * - Support for different account currencies
 * - Saves account balance and risk settings to localStorage
 * - Displays results in standard/mini/micro lots
 * - Handles both forex pairs and gold (XAU)
 */

import React, { useState, useEffect } from "react";

const App = () => {
  // State management for form inputs and calculation results
  const [accountBalanceInput, setAccountBalanceInput] = useState("");
  const [inputText, setInputText] = useState("");
  const [riskPercentage, setRiskPercentage] = useState("");
  const [result, setResult] = useState(null);

  /**
   * Load saved settings from localStorage on component mount
   */
  useEffect(() => {
    const storedBalance = localStorage.getItem("accountBalance");
    const storedRiskPercentage = localStorage.getItem("riskPercentage");
    if (storedBalance) setAccountBalanceInput(storedBalance);
    if (storedRiskPercentage) setRiskPercentage(storedRiskPercentage);
  }, []);

  /**
   * Parse account balance input string to extract amount and currency
   * @param {string} input - Account balance input (e.g., "1000 USD")
   * @returns {Object|null} Object containing balance and currency, or null if invalid
   * @example
   * parseAccountBalance("1000 USD") // returns { balance: 1000, currency: "USD" }
   * parseAccountBalance("1000") // returns { balance: 1000, currency: "USD" }
   */
  const parseAccountBalance = (input) => {
    const regex = /(\d+\.?\d*)\s*([a-zA-Z]{3})?/i;
    const match = input.match(regex);
    if (match) {
      return {
        balance: parseFloat(match[1]),
        currency: match[2] ? match[2].toUpperCase() : "USD", // Default to USD if no currency specified
      };
    }
    return null;
  };

  /**
   * Parse trading signal text to extract trade details
   * Supports various input formats for forex and gold trading signals
   * @param {string} text - Trading signal text
   * @example
   * // Supported formats:
   * "Buy EURUSD 1.05000, SL 1.04800"
   * "EURUSD Buy Now Enter 1.05000"
   * "Entry (sell limit): 1.05000"
   * "Long XAUUSD Entry: 2000.50"
   */
  const parseInputText = (text) => {
    // Extract trading instrument (e.g., EURUSD, XAUUSD)
    const currencyRegex = /([A-Za-z]{3})([A-Za-z]{3})|([A-Za-z]{6})/i;
    const currencyMatch = text.match(currencyRegex);
    if (!currencyMatch) {
      alert(
        "Invalid instrument format. Please provide a valid currency pair (e.g., NZDCAD, XAUUSD).",
      );
      return;
    }
    const baseCurrency = (
      currencyMatch[1] || currencyMatch[3].substring(0, 3)
    ).toUpperCase();
    const quoteCurrency = (
      currencyMatch[2] || currencyMatch[3].substring(3)
    ).toUpperCase();

    // Extract entry price using comprehensive regex pattern
    const openingAmountRegex =
      /(?:Enter(?:ed)?(?:\s+(?:at|now))?|Entry(?:\s*\((?:sell|buy)\s*limit\))?|Buy|Sell|Long|Short)[\s:]*(\d+\.?\d*)|(?:Buy|Sell|Long|Short)\s+[A-Za-z]{6}\s+(\d+\.?\d*)/i;
    const openingAmountMatch = text.match(openingAmountRegex);
    if (!openingAmountMatch) {
      alert(
        "Invalid opening amount format. Please provide a valid opening amount.",
      );
      return;
    }
    const openingAmount = parseFloat(
      openingAmountMatch[1] || openingAmountMatch[2],
    );

    // Extract stop loss level
    const slRegex = /(?:SL|Stop Loss)[\s:]*(\d+\.?\d*)/i;
    const slMatch = text.match(slRegex);
    if (!slMatch) {
      alert("Invalid stop loss format. Please provide a valid stop loss.");
      return;
    }
    const stopLoss = parseFloat(slMatch[1]);

    // Extract pip value from signal if provided (e.g., "SL: 1.04800 (20 pips)")
    const pipsRegex =
      /(?:SL|Stop Loss)[\s:]*\d+\.?\d*\s*\((\d+)\s*(?:pips?)?\)/i;
    const pipsMatch = text.match(pipsRegex);
    const pips = pipsMatch ? parseFloat(pipsMatch[1]) : null;

    // Calculate pips if not explicitly provided
    const calculatedPips =
      pips ||
      calculatePips(baseCurrency, quoteCurrency, openingAmount, stopLoss);

    // Proceed with lot size calculation
    calculateLotSize(baseCurrency, quoteCurrency, calculatedPips);
  };

  /**
   * Calculate the number of pips between entry and stop loss
   * @param {string} baseCurrency - Base currency of the pair
   * @param {string} quoteCurrency - Quote currency of the pair
   * @param {number} openingAmount - Entry price
   * @param {number} stopLoss - Stop loss price
   * @returns {number} Number of pips between entry and stop loss
   */
  const calculatePips = (
    baseCurrency,
    quoteCurrency,
    openingAmount,
    stopLoss,
  ) => {
    if (baseCurrency === "XAU" || quoteCurrency === "XAU") {
      return Math.abs(openingAmount - stopLoss) / 0.01;
    } else if (quoteCurrency === "JPY") {
      return Math.abs(openingAmount - stopLoss) / 0.01; // JPY pairs use 2 decimal places
    } else if (baseCurrency === "JPY") {
      return Math.abs(openingAmount - stopLoss) / 0.000001; // When JPY is base currency
    } else {
      return Math.abs(openingAmount - stopLoss) / 0.0001;
    }
  };

  /**
   * Calculate appropriate lot size based on risk parameters
   * @param {string} baseCurrency - Base currency of the pair
   * @param {string} quoteCurrency - Quote currency of the pair
   * @param {number} pips - Number of pips at risk
   */
  const calculateLotSize = async (baseCurrency, quoteCurrency, pips) => {
    try {
      // Validate account balance input
      const accountBalanceData = parseAccountBalance(accountBalanceInput);
      if (!accountBalanceData) {
        alert(
          "Invalid account balance format. Please use the format '1000 USD'.",
        );
        return;
      }
      const { balance: accountBalance, currency: accountCurrency } =
        accountBalanceData;

      // Calculate risk amount based on percentage
      const riskAmount = (accountBalance * parseFloat(riskPercentage)) / 100;

      // Determine pip value in quote currency
      let pipValueQuote;
      if (baseCurrency === "XAU" || quoteCurrency === "XAU") {
        pipValueQuote = 0.01;
      } else if (quoteCurrency === "JPY") {
        pipValueQuote = 0.01;
      } else if (baseCurrency === "JPY") {
        pipValueQuote = 0.000001;
      } else {
        pipValueQuote = 0.0001;
      }

      // Convert pip value to account currency if different
      let quoteToAccountRate = 1;
      if (quoteCurrency !== accountCurrency) {
        const quoteResponse = await fetch(
          `https://api.coinbase.com/v2/exchange-rates?currency=${quoteCurrency.toUpperCase()}`,
        );
        const quoteData = await quoteResponse.json();
        quoteToAccountRate =
          quoteData.data.rates[accountCurrency.toUpperCase()] || 1;
      }

      // Calculate pip value in account currency
      const pipValueAccount = pipValueQuote * quoteToAccountRate;

      // Calculate lot size based on instrument type
      let lotSize;
      if (baseCurrency === "XAU" || quoteCurrency === "XAU") {
        lotSize = riskAmount / (pips * pipValueAccount * 100); // Gold: 1 lot = 100 oz
      } else {
        lotSize = riskAmount / (pips * pipValueAccount * 100000); // Forex: 1 lot = 100,000 units
      }

      // Calculate position size in units
      let positionSizeUnits;
      if (baseCurrency === "XAU" || quoteCurrency === "XAU") {
        positionSizeUnits = lotSize * 100; // Convert to ounces for gold
      } else {
        positionSizeUnits = lotSize * 100000; // Convert to currency units for forex
      }

      // Calculate standard, mini, and micro lots
      const standardLots = lotSize.toFixed(4);
      const miniLots = (lotSize * 10).toFixed(4);
      const microLots = (lotSize * 100).toFixed(4);

      // Update result state with formatted values
      setResult({
        lotSize: parseFloat(lotSize).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        amountAtRisk: `${riskAmount.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })} ${accountCurrency}`,
        positionSizeUnits: positionSizeUnits.toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        standardLots: parseFloat(standardLots).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        miniLots: parseFloat(miniLots).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
        microLots: parseFloat(microLots).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        }),
      });
    } catch (error) {
      console.error("Error fetching currency data:", error);
    }
  };

  /**
   * Reset all form inputs and clear results
   */
  const handleReset = () => {
    setAccountBalanceInput("");
    setInputText("");
    setRiskPercentage("");
    setResult(null);
    localStorage.removeItem("accountBalance");
    localStorage.removeItem("riskPercentage");
  };

  // UI Component render structure
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Forex Lot Size Calculator</h1>

      <div className="lg:flex lg:gap-6">
        {/* Input Section */}
        <div className="lg:w-1/2">
          <div className="mb-6">
            <label className="block mb-2 text-sm text-gray-600">
              Account Balance (e.g., "1000 USD"):
            </label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="Enter account balance"
              value={accountBalanceInput}
              onChange={(e) => setAccountBalanceInput(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm text-gray-600">
              Risk Percentage (e.g., "1" for 1%):
            </label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              placeholder="Enter risk percentage"
              value={riskPercentage}
              onChange={(e) => {
                setRiskPercentage(e.target.value);
                localStorage.setItem("riskPercentage", e.target.value);
              }}
            />
          </div>

          <div className="mb-6">
            <label className="block mb-2 text-sm text-gray-600">
              Input Text (e.g., "Buy NZDCAD 0.81250, SL 0.81050"):
            </label>
            <textarea
              className="w-full p-2 border rounded"
              rows="4"
              placeholder="Enter input text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => parseInputText(inputText)}
            >
              Calculate Lot Size
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="lg:w-1/2 mt-6 lg:mt-0">
            <h2 className="text-xl font-bold mb-4">Result</h2>
            <div className="bg-white p-4 rounded shadow">
              <div className="mb-4">
                <label className="block text-sm text-gray-600">Lot Size</label>
                <p className="text-2xl font-bold">{result.lotSize}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Amount at Risk
                </label>
                <p className="text-2xl font-bold">{result.amountAtRisk}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Position Size in Units
                </label>
                <p className="text-2xl font-bold">{result.positionSizeUnits}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Standard Lots
                </label>
                <p className="text-2xl font-bold">{result.standardLots}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">Mini Lots</label>
                <p className="text-2xl font-bold">{result.miniLots}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600">
                  Micro Lots
                </label>
                <p className="text-2xl font-bold">{result.microLots}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
