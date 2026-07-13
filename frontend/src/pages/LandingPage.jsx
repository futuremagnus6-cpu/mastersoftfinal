import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  FiShield, FiShoppingBag, FiBox, FiUsers, FiBarChart2,
  FiDollarSign, FiLayers, FiTruck, FiPackage, FiGift,
  FiTrendingUp, FiHeadphones, FiArrowRight, FiStar,
  FiCheckCircle, FiMenu, FiX, FiChevronDown,
  FiMapPin, FiSettings, FiMail, FiPhone, FiRefreshCw,
  FiLinkedin, FiGithub, FiTwitter,
  FiChevronUp, FiPlay,
} from 'react-icons/fi';
import { apiService } from '../services/api';

// ─── Animated Gradient Background ───
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <motion.div
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 dark:opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20 dark:opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 dark:opacity-5"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 30, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Floating geometric shapes */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-16 h-16 border-2 border-primary-300/20 dark:border-primary-600/10 rounded-lg"
        animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-1/3 left-1/4 w-12 h-12 border-2 border-violet-300/20 dark:border-violet-600/10"
        style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}
        animate={{ rotate: [0, -360], y: [0, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute top-2/3 right-1/3 w-10 h-10 border-2 border-emerald-300/20 dark:border-emerald-600/10 rounded-full"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Floating Particles */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][i % 4],
            opacity: 0.2 + (i % 5) * 0.1,
          }}
          animate={{
            y: [0, -(20 + (i % 10) * 3), 0],
            x: [0, (i % 2 === 0 ? 1 : -1) * (5 + (i % 5) * 2), 0],
            opacity: [0.2, 0.7, 0.2],
            scale: [1, 1.5 + (i % 3) * 0.3, 1],
          }}
          transition={{
            duration: 3 + (i % 5) * 2,
            repeat: Infinity,
            delay: (i % 8) * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

// ─── Animated Counter ───
function Counter({ from, to, suffix = '', duration = 2 }) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [from, to, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}



// ─── Scroll to Top Button ───
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-xl shadow-primary-500/30 flex items-center justify-center transition-all duration-200 hover:scale-110"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.9 }}
        >
          <FiChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Navbar ───
function LandingNavbar({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-sm border-b dark:border-gray-800'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Magnus</span>
              <span className="text-lg font-light text-gray-500 dark:text-gray-400 ml-1">OS</span>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                whileHover={{ y: -1 }}
              >
                {item.label}
              </motion.a>
            ))}              <motion.a
                href="/signup"
                className="btn-primary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
                <FiArrowRight className="w-4 h-4" />
              </motion.a>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-gray-900 border-t dark:border-gray-800 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => { setMobileOpen(false); onGetStarted(); }}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
              >
                Get Started
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Feature Card ───
function FeatureCard({ icon: Icon, title, description, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="relative group"
    >
      <div className="card p-6 h-full relative overflow-hidden">
        {/* Hover gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Icon */}
        <div className="w-12 h-12 bg-gradient-to-br from-primary-500/10 to-primary-600/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

// ─── Testimonial Card ───
function TestimonialCard({ quote, author, role, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="card p-6"
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <FiStar key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {author.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{author}</p>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── FAQ Item ───
function FAQItem({ question, answer, index }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-gray-200 dark:border-gray-700 last:border-0"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-base font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
        >
          <FiChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed -mt-1">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── How It Works Step ───
function HowItWorksStep({ icon: Icon, step, title, description, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative flex flex-col items-center text-center"
    >
      {/* Step Number */}
      <div className="relative mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/25 relative z-10">
          <Icon className="w-7 h-7 text-white" />
        </div>
        {/* Step number badge */}
        <div className="absolute -top-2 -right-2 w-7 h-7 bg-white dark:bg-gray-800 border-2 border-primary-500 rounded-full flex items-center justify-center z-20">
          <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{step}</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{description}</p>
    </motion.div>
  );
}

// ─── Contact Form Component ───
function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.submitEnquiry(form);
      setSubmitted(true);
      toast.success('Enquiry submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
      >
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
        <p className="text-white/60 text-sm">
          We have received your enquiry and will get back to you within 24 hours.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 99999 99999"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Company / Shop Name
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Your business name"
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            value={form.message}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="Tell us about your requirements..."
            rows={4}
            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm resize-none"
            required
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-white/40">
            <span className="text-red-400">*</span> Required fields
          </p>
          <motion.button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary-500/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <FiMail className="w-4 h-4" />
                Send Enquiry
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.form>
  );
}

// ─── Main Landing Page ───
export default function LandingPage() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);
  
  const features = [
    { icon: FiShoppingBag, title: 'Point of Sale', description: 'Fast and intuitive POS terminal with barcode scanning, multi-payment support, and offline mode for uninterrupted sales.' },
    { icon: FiBox, title: 'Inventory Management', description: 'Real-time stock tracking, low-stock alerts, batch management, stock transfers, and automated reorder suggestions.' },
    { icon: FiUsers, title: 'Customer Management', description: 'Comprehensive CRM with purchase history, loyalty programs, segmentation, and automated marketing campaigns.' },
    { icon: FiPackage, title: 'Order Management', description: 'Track orders from creation to delivery with status updates, invoicing, refunds, and multi-channel order sync.' },
    { icon: FiTruck, title: 'Supplier Management', description: 'Manage suppliers, purchase orders, payment terms, and automated replenishment based on inventory levels.' },
    { icon: FiDollarSign, title: 'Expense Tracking', description: 'Categorized expense logging, receipt capture, approval workflows, and detailed financial reports.' },
    { icon: FiBarChart2, title: 'Analytics & Reports', description: 'Beautiful dashboards with revenue charts, sales trends, inventory reports, and exportable financial statements.' },
    { icon: FiLayers, title: 'Multi-Branch', description: 'Manage multiple branches with centralized or per-branch inventory, pricing, and reporting.' },
    { icon: FiGift, title: 'Loyalty & Referrals', description: 'Points-based loyalty programs, referral tracking, tiered rewards, and automated campaign management.' },
    { icon: FiTrendingUp, title: 'Subscription Plans', description: 'Flexible subscription tiers with auto-billing, plan upgrades/downgrades, and usage-based pricing.' },
    { icon: FiHeadphones, title: 'Support Tickets', description: 'Built-in ticketing system with priority queues, assignment tools, and customer communication history.' },
    { icon: FiShield, title: 'Role-Based Access', description: 'Granular permissions, multi-role support, audit logging, and two-factor authentication for security.' },
  ];

  const testimonials = [
    { quote: 'Magnus OS transformed how we manage our retail chain. Inventory sync across branches is seamless, and the analytics dashboard gives us insights we never had before.', author: 'Rajesh Kumar', role: 'CEO, MegaMart India' },
    { quote: 'The POS terminal is incredibly fast. Even during peak hours, it handles hundreds of transactions without a hitch. The barcode scanner integration saved us hours daily.', author: 'Priya Sharma', role: 'Operations Manager, FreshFarms' },
    { quote: 'Setting up our subscription plans and loyalty program was a breeze. Our customer retention improved by 40% in just three months.', author: 'Amit Patel', role: 'Founder, StyleHouse' },
  ];

  const stats = [
    { value: 10000, suffix: '+', label: 'Active Businesses', icon: FiShoppingBag },
    { value: 500000, suffix: '+', label: 'Orders Processed', icon: FiPackage },
    { value: 99.9, suffix: '%', label: 'Uptime', icon: FiCheckCircle },
    { value: 50, suffix: '+', label: 'Cities Covered', icon: FiMapPin },
  ];

  const howItWorks = [
    { icon: FiMail, step: 1, title: 'Sign Up Free', description: 'Create your account in under 2 minutes. No credit card required for the 14-day free trial.' },
    { icon: FiSettings, step: 2, title: 'Set Up Your Shop', description: 'Configure your business details, add branches, set up users, and customize your preferences.' },
    { icon: FiBox, step: 3, title: 'Add Your Products', description: 'Import products via CSV or add them manually. Organize with categories, brands, and variants.' },
    { icon: FiShoppingBag, step: 4, title: 'Start Selling', description: 'Go live with the POS terminal, manage orders, and watch your business grow with powerful insights.' },
  ];

  const faqs = [
    { question: 'What is Magnus OS and who is it for?', answer: 'Magnus OS is an all-in-one business management platform designed for Indian retailers, wholesalers, and multi-branch businesses. It combines POS, inventory, accounting, CRM, and analytics into a single powerful system.' },
    { question: 'Is there a free trial available?', answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card is required. You can explore every feature and see how Magnus OS fits your business needs before committing.' },
    { question: 'Can I manage multiple branches or locations?', answer: 'Absolutely. The Business and Enterprise plans support multi-branch management with centralized or per-branch inventory, pricing, and reporting. You can view consolidated reports or drill down into individual branch performance.' },
    { question: 'Is Magnus OS compliant with Indian tax regulations?', answer: 'Yes, Magnus OS includes a full GST module that handles GST-compliant invoicing, GST return data preparation, and integrates with the latest Indian tax regulations. We regularly update to stay compliant.' },
    { question: 'What kind of support do you offer?', answer: 'Starter plan includes email support. Business plan includes chat and email support with priority response. Enterprise plan comes with a dedicated account manager, priority phone support, and custom SLA guarantees.' },
    { question: 'Can I import my existing data from another system?', answer: 'Yes, we provide CSV import tools for products, customers, and inventory. Our team can also assist with data migration from popular platforms. Enterprise plans include personalized migration support.' },
    { question: 'Is my data secure?', answer: 'Security is our top priority. We use 256-bit SSL encryption, automated daily backups, role-based access control, two-factor authentication, and host on ISO 27001 certified servers. Your data is safe with us.' },
    { question: 'Can I upgrade or downgrade my plan later?', answer: 'Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades apply at the end of your current billing cycle. You retain access to all your data regardless of plan changes.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* ─── Animated Background ─── */}
      <AnimatedBackground />

      {/* ─── Scroll to Top ─── */}
      <ScrollToTop />

      {/* ─── Navigation ─── */}
      <LandingNavbar onGetStarted={() => navigate('/login')} />

      {/* ─── Hero Section ─── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-transparent to-white dark:from-primary-950/20 dark:via-transparent dark:to-gray-900" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-full text-sm text-primary-700 dark:text-primary-300 mb-8"
          >
            <FiStar className="w-4 h-4" />
            <span>Trusted by 10,000+ businesses across India</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white leading-tight mb-6"
          >
            Your Entire Business
            <br />
            <span className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 bg-clip-text text-transparent">
              One Powerful OS
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            From POS and inventory to analytics and loyalty programs — 
            Magnus OS unifies every aspect of your retail or wholesale business 
            into a single, powerful platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              onClick={() => navigate('/signup')}
              className="btn-primary px-8 py-3.5 text-base flex items-center gap-2 shadow-xl shadow-primary-500/25"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started Free
              <FiArrowRight className="w-5 h-5" />
            </motion.button>
            <motion.a
              href="#features"
              className="btn-secondary px-8 py-3.5 text-base flex items-center gap-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Explore Features
              <FiArrowRight className="w-4 h-4" />
            </motion.a>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-6 h-10 border-2 border-gray-300 dark:border-gray-600 rounded-full flex justify-center pt-2"
            >
              <div className="w-1 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Stats Section ─── */}
      <section className="relative py-16 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent mb-1">
                  <Counter from={0} to={stat.value} suffix={stat.suffix} duration={2 + i * 0.3} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="relative py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center px-3 py-1 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-full text-xs font-medium text-primary-700 dark:text-primary-300 mb-4">
              Everything You Need
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for 
              <span className="bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent"> Modern Business</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Every tool you need to run, grow, and scale your business — all in one place.
            </p>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works Section ─── */}
      <section id="how-it-works" className="relative py-20 md:py-28 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Get Started in{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">4 Easy Steps</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              From sign-up to your first sale in minutes, not days.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 relative">
            {/* Connector Line (desktop) */}
            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary-500/20 via-primary-500/40 to-primary-500/20" />
            
            {howItWorks.map((step, i) => (
              <HowItWorksStep key={i} {...step} index={i} />
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <motion.button
              onClick={() => navigate('/signup')}
              className="btn-primary px-8 py-3.5 text-base flex items-center gap-2 mx-auto shadow-lg shadow-primary-500/25"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FiPlay className="w-4 h-4" />
              Start Your Free Trial
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ─── Testimonials Section ─── */}
      <section className="relative py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-medium text-amber-700 dark:text-amber-300 mb-4">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Loved by Business Owners
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              See what our customers have to say about their experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} {...t} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="relative py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center px-3 py-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300 mb-4">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked{' '}
              <span className="bg-gradient-to-r from-violet-500 to-violet-600 bg-clip-text text-transparent">Questions</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Everything you need to know about Magnus OS.
            </p>
          </motion.div>

          {/* FAQ List */}
          <div className="card p-6 md:p-8">
            {faqs.map((faq, i) => (
              <FAQItem key={i} {...faq} index={i} />
            ))}
          </div>

          {/* Still have questions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Still have questions? We're here to help.
            </p>
            <a
              href="mailto:support@magnusos.com"
              className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline inline-flex items-center gap-1"
            >
              <FiMail className="w-4 h-4" />
              support@magnusos.com
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── Contact / Enquiry Section ─── */}
      <section id="contact" className="relative py-20 md:py-28 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 dark:from-gray-950 dark:to-gray-900">
        {/* Animated background for this section */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.3, 1], y: [0, -20, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm text-white/80 mb-6">
              <FiMail className="w-4 h-4" />
              Get In Touch
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Have a Question?{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Let's Talk</span>
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Whether you have a question about features, pricing, or anything else — our team is ready to help.
            </p>
          </motion.div>

          <ContactForm />
        </div>
      </section>

      {/* ─── Enhanced Footer ─── */}
      <footer className="bg-gray-900 dark:bg-gray-950 border-t border-gray-800">
        {/* Newsletter Section */}
        <div className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-white font-semibold text-lg">Stay Updated</h3>
                <p className="text-gray-400 text-sm mt-1">Get the latest product updates and tips.</p>
              </div>
              <div className="flex w-full md:w-auto gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 md:w-64 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <button className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shrink-0">
                  Subscribe
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Company */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <FiShield className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Future Magnus OS</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                India's most comprehensive business management platform. Powering 10,000+ businesses across 50+ cities.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <FiTwitter className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <FiLinkedin className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all">
                  <FiGithub className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                
                {['Features'].map((item) => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                {['About Us', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Support</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <FiMail className="w-3.5 h-3.5" /> help@futuremagnusos.com
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <FiPhone className="w-3.5 h-3.5" /> +91 88052 24580
                  </a>
               </li>
               {/* <li>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Help Center</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Community Forum</a>
                </li>
                <li>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Status Page</a>
                </li>*/} 
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>&copy; {new Date().getFullYear()} Future Magnus Business OS. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-gray-300 transition-colors">Cookie Policy</a>
                <a href="#" className="hover:text-gray-300 transition-colors">GDPR</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
