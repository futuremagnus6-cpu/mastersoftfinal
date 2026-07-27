import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiShield, FiArrowRight, FiMail, FiMapPin,
  FiClock, FiCheckCircle, FiEye, FiEyeOff,
  FiShoppingBag, FiUser, FiCreditCard,
} from 'react-icons/fi';
import axios from 'axios';
import config from '../../config';
import toast from 'react-hot-toast';
import FormField from '../../components/form/FormField';

const businessTypes = [
  { value: 'medical_store', label: 'Medical Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'grocery_store', label: 'Grocery Store' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'electronics_shop', label: 'Electronics Shop' },
  { value: 'mobile_shop', label: 'Mobile Shop' },
  { value: 'cosmetics_shop', label: 'Cosmetics Shop' },
  { value: 'hardware_shop', label: 'Hardware Shop' },
  { value: 'riyansh_mlm', label: 'Riyansh MLM' },
  { value: 'custom', label: 'Custom' },
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar', 'Chandigarh', 'Dadra & Nagar Haveli',
  'Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
  'Lakshadweep', 'Puducherry',
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [form, setForm] = useState({
    // Admin details (Step 1)
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    // Shop details (Step 2)
    name: '',
    businessType: 'grocery_store',
    customBusinessType: '',

    contact: {
      email: '',
      phone: '',
      website: '',
    },
    address: {
      line1: '',
      line2: '',
      city: '',
      state: 'Maharashtra',
      pincode: '',
      country: 'India',
    },
  });

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNestedChange = (section, field, value) => {
    setForm(f => ({
      ...f,
      [section]: { ...f[section], [field]: value },
    }));
    const key = `${section}.${field}`;
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: '' }));
  };

  const clearErrors = () => setFormErrors({});

  const validateStep1 = () => {
    const errors = {};
    if (!form.adminName.trim()) errors.adminName = 'Name is required';
    if (!form.adminEmail.trim()) errors.adminEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.adminEmail)) errors.adminEmail = 'Invalid email format';
    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Shop name is required';
    if (!form.contact.email.trim()) errors['contact.email'] = 'Contact email is required';
    else if (!/\S+@\S+\.\S+/.test(form.contact.email)) errors['contact.email'] = 'Invalid email format';
    if (!form.contact.phone.trim()) errors['contact.phone'] = 'Phone number is required';
    if (!form.address.line1.trim()) errors['address.line1'] = 'Address is required';
    if (!form.address.city.trim()) errors['address.city'] = 'City is required';
    if (!form.address.pincode.trim()) errors['address.pincode'] = 'Pincode is required';
    else if (!/^\d{6}$/.test(form.address.pincode)) errors['address.pincode'] = 'Invalid pincode';
    if (form.businessType === 'custom' && !form.customBusinessType.trim()) errors.customBusinessType = 'Custom type is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Next = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        businessType: form.businessType,
        customBusinessType: form.customBusinessType,

        adminName: form.adminName,
        adminEmail: form.adminEmail,
        password: form.password,
        contact: form.contact,
        address: form.address,
      };

      const { data } = await axios.post(`${config.apiUrl || '/api'}/shops/register`, payload);

      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      setSuccess(true);
      toast.success('Account created successfully!');

      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── SUCCESS SCREEN ───
  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
          <div className="bg-white border border-gray-200 shadow-lg rounded-2xl p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <FiCheckCircle className="w-10 h-10 text-emerald-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Magnus OS!</h2>
            <p className="text-gray-500 mb-4">
              Your shop <strong className="text-gray-900">{form.name}</strong> is ready.
            </p>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-primary-700 mb-1">
                <FiClock className="w-4 h-4" />
                <span className="text-sm font-medium">Free Trial Active — 14 Days</span>
              </div>
              <p className="text-xs text-gray-500">
                Start exploring your dashboard. Before the trial ends, you can set up billing to continue.
              </p>
            </div>
            <p className="text-gray-400 text-sm">Redirecting to your dashboard...</p>
            <div className="mt-4 w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── MAIN FORM ───
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <FiShield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Magnus <span className="font-light text-gray-400">OS</span></span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Create Your Shop Account</h1>
          <p className="text-gray-500 text-sm">Start your 14-day free trial — no credit card required</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110'
                  : step > s
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s ? <FiCheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={`h-0.5 w-16 transition-all ${step > s ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 md:p-8">
          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); }}>

            {/* ══════ STEP 1: Admin Details ══════ */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="flex items-center gap-2 mb-4">
                  <FiUser className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Admin Information</h2>
                </div>
                <p className="text-sm text-gray-500 -mt-3 mb-4">This will be your account to manage the shop.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Full Name" error={formErrors.adminName} className="sm:col-span-2" required>
                    <input
                      type="text"
                      value={form.adminName}
                      onChange={(e) => handleChange('adminName', e.target.value)}
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors.adminName ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                      placeholder="Rajesh Kumar"
                    />
                  </FormField>
                  <FormField label="Admin Email" error={formErrors.adminEmail} className="sm:col-span-2" required>
                    <input
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => handleChange('adminEmail', e.target.value)}
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors.adminEmail ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                      placeholder="rajesh@example.com"
                    />
                  </FormField>
                  <FormField label="Password" error={formErrors.password} required>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm pr-10 ${formErrors.password ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="Min. 6 characters"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Confirm Password" error={formErrors.confirmPassword} required>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors.confirmPassword ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                      placeholder="Re-enter password"
                    />
                  </FormField>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Already have an account? <span className="text-primary-600 font-medium">Sign In</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleStep1Next}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
                  >
                    Shop Details <FiArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ══════ STEP 2: Shop Details ══════ */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* ─── Basic Information ─── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FiShoppingBag className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Shop Name" error={formErrors.name} className="sm:col-span-2" required>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => { handleChange('name', e.target.value); clearErrors(); }}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors.name ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="My Shop"
                      />
                    </FormField>
                    <FormField label="Business Type" error={formErrors.businessType} required>
                      <select
                        value={form.businessType}
                        onChange={(e) => handleChange('businessType', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors.businessType ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                      >
                        {businessTypes.map(bt => (
                          <option key={bt.value} value={bt.value}>{bt.label}</option>
                        ))}
                      </select>
                    </FormField>
                    {form.businessType === 'custom' && (
                      <FormField label="Custom Type" error={formErrors.customBusinessType} required>
                        <input
                          type="text"
                          value={form.customBusinessType}
                          onChange={(e) => handleChange('customBusinessType', e.target.value)}
                          className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors.customBusinessType ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                          placeholder="e.g. Restaurant"
                        />
                      </FormField>
                    )}
                  </div>
                </div>

                {/* ─── Contact Information ─── */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <FiMail className="w-5 h-5 text-primary-600" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Contact Email" error={formErrors['contact.email']} required>
                      <input
                        type="email"
                        value={form.contact.email}
                        onChange={(e) => handleNestedChange('contact', 'email', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['contact.email'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="shop@example.com"
                      />
                    </FormField>
                    <FormField label="Phone Number" error={formErrors['contact.phone']} required>
                      <input
                        type="tel"
                        value={form.contact.phone}
                        onChange={(e) => handleNestedChange('contact', 'phone', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['contact.phone'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="+919999999999"
                      />
                    </FormField>
                    <FormField label="Website" error={formErrors['contact.website']} className="sm:col-span-2">
                      <input
                        type="url"
                        value={form.contact.website}
                        onChange={(e) => handleNestedChange('contact', 'website', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['contact.website'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="https://example.com"
                      />
                    </FormField>
                  </div>
                </div>

                {/* ─── Address ─── */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <FiMapPin className="w-5 h-5 text-primary-600" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Address</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Address Line 1" error={formErrors['address.line1']} className="sm:col-span-2" required>
                      <input
                        type="text"
                        value={form.address.line1}
                        onChange={(e) => handleNestedChange('address', 'line1', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['address.line1'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="Shop no, building"
                      />
                    </FormField>
                    <FormField label="Address Line 2" error={formErrors['address.line2']} className="sm:col-span-2">
                      <input
                        type="text"
                        value={form.address.line2}
                        onChange={(e) => handleNestedChange('address', 'line2', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['address.line2'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="Street, area"
                      />
                    </FormField>
                    <FormField label="City" error={formErrors['address.city']} required>
                      <input
                        type="text"
                        value={form.address.city}
                        onChange={(e) => handleNestedChange('address', 'city', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['address.city'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="Mumbai"
                      />
                    </FormField>
                    <FormField label="State" error={formErrors['address.state']} required>
                      <select
                        value={form.address.state}
                        onChange={(e) => handleNestedChange('address', 'state', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['address.state'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                      >
                        {indianStates.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Pincode" error={formErrors['address.pincode']} required>
                      <input
                        type="text"
                        value={form.address.pincode}
                        onChange={(e) => handleNestedChange('address', 'pincode', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['address.pincode'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="400001"
                        maxLength={6}
                      />
                    </FormField>
                    <FormField label="Country" error={formErrors['address.country']}>
                      <input
                        type="text"
                        value={form.address.country}
                        onChange={(e) => handleNestedChange('address', 'country', e.target.value)}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm ${formErrors['address.country'] ? 'border-danger-400 focus:ring-danger-500' : 'border-gray-300'}`}
                        placeholder="India"
                      />
                    </FormField>
                  </div>
                </div>

                {/* ─── Trial Info Banner ─── */}
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center gap-2 text-primary-700 mb-1">
                    <FiCreditCard className="w-4 h-4" />
                    <span className="text-sm font-medium">14-Day Free Trial</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Your shop will start on a free trial. No payment needed today — you'll get full access to all features.
                    When the trial ends, you can choose a subscription plan and pay via Razorpay to continue.
                  </p>
                </div>

                {/* ─── Actions ─── */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-medium text-sm transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Account...</>
                    ) : (
                      <><FiCheckCircle className="w-4 h-4" /> Create Shop & Start Trial</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-primary-600 hover:text-primary-700">Terms of Service</a> and{' '}
          <a href="#" className="text-primary-600 hover:text-primary-700">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}
