const COMPANY_SELECTORS = {
  HP: "#pump-logo-hp",
  "Indian Oil": "#pump-logo-indian-oil",
  "Bharat Petroleum": "#pump-logo-bharat-petroleum",
};

const FILE_NAME_SUFFIX = {
  HP: "HP",
  "Indian Oil": "IndianOil",
  "Bharat Petroleum": "BharatPetroleum",
};

const MONTH_INDEX = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

const PAYMENT_TYPES = ["Cash", "Online", "Debit Card"];
const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric"];
const COMPANIES = Object.keys(COMPANY_SELECTORS);

module.exports = {
  COMPANY_SELECTORS,
  FILE_NAME_SUFFIX,
  MONTH_INDEX,
  PAYMENT_TYPES,
  FUEL_TYPES,
  COMPANIES,
};
