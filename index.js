const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/marriage-expenses', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Define Expense Schema
const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['Venue', 'Catering', 'Decoration', 'Attire', 'Photography', 'Music', 'Transportation', 'Other']
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  vendor: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partially Paid'],
    default: 'Pending'
  }
});

const Expense = mongoose.model('Expense', expenseSchema);

// Routes

// Get all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new expense
app.post('/api/expenses', async (req, res) => {
  const expense = new Expense({
    category: req.body.category,
    description: req.body.description,
    amount: req.body.amount,
    vendor: req.body.vendor,
    paymentStatus: req.body.paymentStatus
  });

  try {
    const newExpense = await expense.save();
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    Object.assign(expense, req.body);
    const updatedExpense = await expense.save();
    res.json(updatedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get total expenses
app.get('/api/expenses/total', async (req, res) => {
  try {
    const total = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    res.json({ total: total[0]?.totalAmount || 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get expenses by category
app.get('/api/expenses/category/:category', async (req, res) => {
  try {
    const expenses = await Expense.find({ category: req.params.category });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});