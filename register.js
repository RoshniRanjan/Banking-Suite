const mongoose = require("mongoose");
const transactionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  transaction_type: { type: String, enum: ['withdraw', 'deposit'], required: true },
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  updated_balance: { type: Number, required: true }
  // Assuming you store the transaction date
});
const userSchema = new mongoose.Schema({
  initial_balance: { type: Number, default: 50000 },
  personal: {
    firstName: String,
    middleName: String,
    lastName: String,
    dob: String,
  },
  address: {
    premise: String,
    thoroughfare: String,
    locality: String,
    postalCode: String,
    livedDuration: String,
  },
  login_details: {
    username: String,
    password: String,
  },
  contact: {
    email: String,
    phoneNumber: Number,

  },

  employment_details: {
    status: String,
    industry: String,
    occupation: String,
    income: String,
  },
  nationality: {
    citizenship: {
      name: String,
      flag: String,
      code: String
    },
    tax_residence: {
      name: String,
      flag: String,
      code: String
    }
  },

  aadhaarFile: String,
  panFile: String,
  transactions: [transactionSchema],
  balance: { type: Number, default: 50000 },

});

module.exports = mongoose.model("User", userSchema)