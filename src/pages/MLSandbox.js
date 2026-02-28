import React from "react";
import { motion } from "framer-motion";
import UniversalCodePlayground from "../components/sandbox/UniversalCodePlayground";

const MLSandbox = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            ML <span className="text-primary">Sandbox</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Experiment with machine learning algorithms and data science projects in our 
            powerful cloud-based sandbox environment.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary text-xl">🐍</span>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Python Support</h3>
            <p className="text-slate-300 text-sm">Full Python environment with NumPy, Pandas, Scikit-learn, and more</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary text-xl">⚡</span>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Real-time Execution</h3>
            <p className="text-slate-300 text-sm">Run your code instantly on our secure cloud servers</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary text-xl">📊</span>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Data Visualization</h3>
            <p className="text-slate-300 text-sm">Create beautiful plots and charts with Matplotlib and Seaborn</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <UniversalCodePlayground 
            defaultLanguage="python"
            height="500px"
            className="mb-8"
            showThemeToggle={true}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6"
        >
          <h2 className="text-2xl font-bold text-white mb-4">Quick Start Tutorials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Linear Regression</h3>
              <p className="text-slate-300 text-sm mb-3">Learn the basics of linear regression with NumPy and Scikit-learn</p>
              <button className="text-primary hover:text-primary/80 text-sm font-medium">
                Try Example →
              </button>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Data Visualization</h3>
              <p className="text-slate-300 text-sm mb-3">Create stunning visualizations with Matplotlib and Seaborn</p>
              <button className="text-primary hover:text-primary/80 text-sm font-medium">
                Try Example →
              </button>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Neural Networks</h3>
              <p className="text-slate-300 text-sm mb-3">Build your first neural network with TensorFlow</p>
              <button className="text-primary hover:text-primary/80 text-sm font-medium">
                Try Example →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MLSandbox;