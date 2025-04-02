import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast, Toaster } from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiDollarSign, FiClock, FiCheck, FiAlertCircle, FiLoader } from 'react-icons/fi';
import axios from 'axios';

function App() {
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending');
  const [summary, setSummary] = useState({});
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    category: 'Venue',
    description: '',
    amount: '',
    vendor: '',
    paymentStatus: 'Pending'
  });
  const [paymentData, setPaymentData] = useState({
    amount: '',
    notes: ''
  });

  const categories = ['Venue', 'Catering', 'Decoration', 'Attire', 'Photography', 'Music', 'Transportation', 'Other'];
  const paymentStatuses = ['Paid', 'Pending', 'Partially Paid'];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchExpensesByStatus(activeTab),
          fetchTotalExpenses(),
          fetchSummary()
        ]);
      } catch (error) {
        toast.error('Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const fetchExpensesByStatus = async (status) => {
    try {
      const response = await axios.get(`https://marriage-backend.onrender.com/api/expenses/status/${status}`);
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    }
  };

  const fetchTotalExpenses = async () => {
    try {
      const response = await axios.get('https://marriage-backend.onrender.com/api/expenses/total');
      setTotalExpenses(response.data.total);
    } catch (error) {
      toast.error('Failed to fetch total expenses');
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get('https://marriage-backend.onrender.com/api/expenses/summary');
      const summaryData = response.data.reduce((acc, item) => {
        acc[item._id] = item;
        return acc;
      }, {});
      setSummary(summaryData);
    } catch (error) {
      toast.error('Failed to fetch summary');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      
      // Convert amount to number
      submitData.amount = Number(submitData.amount);

      // Handle payment status logic
      if (submitData.paymentStatus === 'Paid') {
        submitData.remainingAmount = 0;
        submitData.totalPaid = submitData.amount;
      } else if (submitData.paymentStatus === 'Pending') {
        submitData.remainingAmount = submitData.amount;
        submitData.totalPaid = 0;
      } else if (submitData.paymentStatus === 'Partially Paid') {
        if (!submitData.remainingAmount && submitData.remainingAmount !== 0) {
          toast.error('Please enter the remaining amount');
          return;
        }
        submitData.remainingAmount = Number(submitData.remainingAmount);
        if (submitData.remainingAmount >= submitData.amount) {
          toast.error('Remaining amount must be less than total amount');
          return;
        }
        submitData.totalPaid = submitData.amount - submitData.remainingAmount;
      }

      if (currentExpense) {
        await axios.put(`https://marriage-backend.onrender.com/api/expenses/${currentExpense._id}`, submitData);
        toast.success('Expense updated successfully');
      } else {
        await axios.post('https://marriage-backend.onrender.com/api/expenses', submitData);
        toast.success('Expense added successfully');
      }
      setIsModalOpen(false);
      setCurrentExpense(null);
      setFormData({
        category: 'Venue',
        description: '',
        amount: '',
        vendor: '',
        paymentStatus: 'Pending',
        remainingAmount: ''
      });
      fetchExpensesByStatus(activeTab);
      fetchTotalExpenses();
      fetchSummary();
    } catch (error) {
      toast.error(currentExpense ? 'Failed to update expense' : 'Failed to add expense');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`https://marriage-backend.onrender.com/api/expenses/${id}`);
        toast.success('Expense deleted successfully');
        fetchExpensesByStatus(activeTab);
        fetchTotalExpenses();
      } catch (error) {
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleEdit = (expense) => {
    setCurrentExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      vendor: expense.vendor,
      paymentStatus: expense.paymentStatus,
      remainingAmount: expense.remainingAmount
    });
    setIsModalOpen(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      if (!currentExpense) return;

      const amount = Number(paymentData.amount);
      const remainingBalance = currentExpense.amount - currentExpense.totalPaid;

      // Validate payment amount
      if (amount <= 0) {
        toast.error('Payment amount must be greater than 0');
        return;
      }

      if (amount > remainingBalance) {
        toast.error(`Payment amount cannot exceed remaining balance (₹${remainingBalance.toLocaleString()})`);
        return;
      }

      const response = await axios.post(`https://marriage-backend.onrender.com/api/expenses/${currentExpense._id}/payments`, {
        amount,
        notes: paymentData.notes
      });
      
      toast.success('Payment recorded successfully');
      setIsPaymentModalOpen(false);
      setPaymentData({ amount: '', notes: '' });
      fetchExpensesByStatus(activeTab);
      fetchTotalExpenses();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const fetchPaymentHistory = async (expenseId) => {
    try {
      const response = await axios.get(`https://marriage-backend.onrender.com/api/expenses/${expenseId}/payments`);
      setPaymentHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch payment history');
    }
  };

  const openPaymentModal = (expense) => {
    setCurrentExpense(expense);
    fetchPaymentHistory(expense._id);
    setIsPaymentModalOpen(true);
  };

  // Update the payment status change handler
  const handlePaymentStatusChange = (newStatus) => {
    setFormData(prev => {
      const amount = Number(prev.amount) || 0;
      let remainingAmount = prev.remainingAmount;

      if (newStatus === 'Paid') {
        remainingAmount = 0;
      } else if (newStatus === 'Pending') {
        remainingAmount = amount;
      }

      return {
        ...prev,
        paymentStatus: newStatus,
        remainingAmount
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      
      {isLoading ? (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Loading your expenses...</p>
            <p className="text-gray-400 text-sm mt-2">Please wait while we fetch the data</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-white shadow-lg">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Marriage Expense Tracker</h1>
                  <p className="mt-1 text-gray-500">Track and manage your wedding expenses</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transform transition hover:scale-105 shadow-md"
                >
                  <FiPlus className="h-5 w-5" /> Add Expense
                </button>
              </div>
            </div>
          </header>

          {/* Summary Cards */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-md p-6 transform transition hover:scale-105 border border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-700">Total Amount Paid</h2>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-primary-600 mt-4">₹{totalExpenses.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-2">Total payments across all expenses</p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 transform transition hover:scale-105 border border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-700">Partially Paid Items</h2>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FiClock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-yellow-600 mt-4">{summary['Partially Paid']?.count || 0}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Paid: ₹{(summary['Partially Paid']?.totalPaid || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 transform transition hover:scale-105 border border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-700">Payment Progress</h2>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiAlertCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-blue-600 mt-4">
                  {Math.round((totalExpenses / 
                    (Object.values(summary).reduce((acc, curr) => acc + (curr?.totalAmount || 0), 0))) * 100)}%
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((totalExpenses / 
                        (Object.values(summary).reduce((acc, curr) => acc + (curr?.totalAmount || 0), 0))) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Of total budget completed</p>
              </div>
            </div>
          </div>

          {/* Payment Status Tabs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
            <div className="bg-white rounded-lg shadow-md p-1">
              <nav className="flex space-x-4">
                {paymentStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => setActiveTab(status)}
                    className={`
                      flex-1 py-4 px-6 text-sm font-medium rounded-md transition-all duration-200
                      ${activeTab === status
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                    `}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {status === 'Paid' && <FiCheck className="h-4 w-4" />}
                      {status === 'Partially Paid' && <FiClock className="h-4 w-4" />}
                      {status === 'Pending' && <FiAlertCircle className="h-4 w-4" />}
                      {status}
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Expenses List */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-12">
            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">{expense.category}</td>
                        <td className="px-6 py-4">{expense.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">₹{expense.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">₹{expense.totalPaid.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">₹{(expense.amount - expense.totalPaid).toLocaleString()}</td>
                        <td className="px-6 py-4">{expense.vendor}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            expense.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                            expense.paymentStatus === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {expense.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => openPaymentModal(expense)}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="Add Payment"
                            >
                              <FiDollarSign className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(expense)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              <FiEdit2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense._id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <FiAlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-lg font-medium">No {activeTab.toLowerCase()} expenses found</p>
                            <p className="text-sm text-gray-400 mt-1">Add a new expense to get started</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment Modal */}
          {isPaymentModalOpen && currentExpense && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl transform transition-all">
                <div className="flex justify-between items-center p-6 border-b">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {currentExpense.description}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setCurrentExpense(null);
                      setPaymentData({ amount: '', notes: '' });
                    }}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                      <span className="text-sm text-gray-500">
                        Total: ₹{currentExpense.totalPaid.toLocaleString()} / ₹{currentExpense.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 space-y-3">
                      {paymentHistory.map((payment, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-all duration-200">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-green-600">₹{payment.amount.toLocaleString()}</span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(payment.date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          {payment.notes && (
                            <p className="text-sm text-gray-600 mt-2">{payment.notes}</p>
                          )}
                        </div>
                      ))}
                      {paymentHistory.length === 0 && (
                        <div className="text-center py-6">
                          <FiClock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No payments recorded yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <form onSubmit={handlePayment} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Amount
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          value={paymentData.amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = Number(value);
                            const remaining = currentExpense.amount - currentExpense.totalPaid;
                            
                            if (numValue <= remaining) {
                              setPaymentData({ ...paymentData, amount: value });
                            }
                          }}
                          className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                          min="0"
                          max={currentExpense.amount - currentExpense.totalPaid}
                          step="any"
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-gray-500">
                        <span>Remaining: ₹{(currentExpense.amount - currentExpense.totalPaid).toLocaleString()}</span>
                        <span>After payment: ₹{((currentExpense.totalPaid + Number(paymentData.amount || 0)).toLocaleString())}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                        rows="2"
                        placeholder="Optional payment notes"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-md"
                      disabled={!paymentData.amount || Number(paymentData.amount) <= 0}
                    >
                      Record Payment
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Expense Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl max-w-md w-full shadow-2xl transform transition-all">
                <div className="flex justify-between items-center p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentExpense ? 'Edit Expense' : 'Add New Expense'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setCurrentExpense(null);
                      setFormData({
                        category: 'Venue',
                        description: '',
                        amount: '',
                        vendor: '',
                        paymentStatus: 'Pending',
                        remainingAmount: ''
                      });
                    }}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                        placeholder="Enter expense description"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">₹</span>
                        </div>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                      <input
                        type="text"
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                        placeholder="Enter vendor name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                      <select
                        value={formData.paymentStatus}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          handlePaymentStatusChange(newStatus);
                        }}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                      >
                        {paymentStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    {formData.paymentStatus === 'Partially Paid' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Amount</label>
                        <div className="relative rounded-lg shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₹</span>
                          </div>
                          <input
                            type="number"
                            value={formData.remainingAmount}
                            onChange={(e) => {
                              const remaining = Number(e.target.value);
                              if (remaining >= 0 && remaining < formData.amount) {
                                setFormData({ ...formData, remainingAmount: remaining });
                              }
                            }}
                            className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200 hover:border-gray-400"
                            placeholder="Enter remaining amount"
                            required
                          />
                        </div>
                        {formData.amount && (
                          <p className="text-sm text-gray-500 mt-2">
                            Paid: ₹{(formData.amount - (formData.remainingAmount || 0)).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-8">
                    <button
                      type="submit"
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      {currentExpense ? 'Update Expense' : 'Add Expense'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;