import React from "react";
import { Mic } from "lucide-react";

const Landingpage = () => {
  return (
    <div className="font-['Inter'] bg-gray-50 text-gray-800">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">
            MIA
          </div>
          <nav className="hidden md:flex space-x-8 text-sm font-medium">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#use-cases" className="hover:text-indigo-600 transition">Use Cases</a>
          </nav>
          <a href="#cta" className="px-4 py-2 bg-white border border-indigo-600 text-indigo-600 font-semibold rounded-full hover:bg-indigo-50 transition text-sm">
            Sign In
          </a>
        </div>
      </header>

      <main>

        {/* Hero Section */}
        <section className="py-16 md:py-24 text-center bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">
              Minute Intelligent Assistant
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight mb-6">
              Stop Searching. <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">Start Solving.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              MIA is the <strong>Minute Intelligent Assistant</strong> that makes recording and summarizing meeting minutes effortless.
              </p>

            </div>

          <div className="mt-16 px-4">
            <img
              src="https://placehold.co/1000x500/e0f2f1/064e3b?text=MIA+Dashboard+Mockup"
              alt="MIA Dashboard Preview"
              className="mx-auto rounded-2xl shadow-2xl border border-gray-100"
            />
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="py-16 md:py-20 bg-gray-50 border-t border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Tired of the <span className="text-indigo-600">Information Overload?</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Meetings shouldn't drain your productivity. You need an assistant that records, summarizes, and organizes your minutes automatically.
              </p>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-white rounded-xl shadow-lg border border-red-100">
                <h3 className="font-bold text-xl mb-2 text-red-600">The Struggle</h3>
                <p className="text-gray-600">
                  Wasting hours manually recording and summarizing meeting minutes, trying to capture every key point. Important insights get lost in the shuffle.
                </p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg border border-indigo-300">
                <h3 className="font-bold text-xl mb-2 text-indigo-600">The MIA Solution</h3>
                <p className="text-gray-600">
                  Upload recordings or take live notes. MIA automatically generates accurate, concise meeting minutes so your team stays aligned and productive.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-extrabold mb-4">
              Your Meeting Assistant. <span className="text-indigo-600">Always On.</span>
            </h2>
            <p className="text-lg text-gray-600 mb-12">
              MIA streamlines your workflow, making meetings more effective and actionable.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 transition duration-300 hover:shadow-xl hover:border-indigo-300">
                <div className="text-5xl mb-4 text-indigo-600">⏱</div>
                <h3 className="font-bold text-xl mb-2">Instant Minutes</h3>
                <p className="text-gray-600">
                  Automatically generate meeting summaries in seconds.
                </p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 transition duration-300 hover:shadow-xl hover:border-indigo-300">
                <div className="text-5xl mb-4 text-indigo-600">📚</div>
                <h3 className="font-bold text-xl mb-2">Source Accuracy</h3>
                <p className="text-gray-600">
                  Each summary is backed by the original transcript or recording.
                </p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 transition duration-300 hover:shadow-xl hover:border-indigo-300">
                <div className="text-5xl mb-4 text-indigo-600">🔗</div>
                <h3 className="font-bold text-xl mb-2">Integration Ready</h3>
                <p className="text-gray-600">
                  Works with Zoom, Google-meet, and other collaboration tools.
                </p>
              </div>
              <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 transition duration-300 hover:shadow-xl hover:border-indigo-300">
                <div className="text-5xl mb-4 text-indigo-600">💡</div>
                <h3 className="font-bold text-xl mb-2">Smart Highlights</h3>
                <p className="text-gray-600">
                  Identifies key decisions, action items, and follow-ups automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-20 bg-indigo-600 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold mb-10">Trusted by Productive Teams</h2>
            <blockquote className="bg-white text-gray-800 p-8 md:p-12 rounded-2xl shadow-2xl relative">
              <p className="text-2xl md:text-3xl italic font-medium leading-relaxed">
                "Before MIA, our team struggled with keeping meeting notes. Now, minutes are instantly generated and accurate. <strong className="text-indigo-600">It's a total game-changer.</strong>"
              </p>
            </blockquote>
          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-extrabold text-center mb-4">How MIA Transforms Meetings</h2>
            <p className="text-lg text-gray-600 text-center mb-12">
              Perfect for any professional looking to save time and capture key insights.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 bg-gray-50 rounded-2xl shadow-md border border-gray-200">
                <div className="text-3xl font-bold text-indigo-600 mb-3">Support Teams</div>
                <h3 className="font-semibold text-xl mb-4">Accurate Records Instantly</h3>
                <p className="text-gray-600 mb-4">
                  Capture customer interactions and decisions effortlessly.
                </p>
              </div>
              <div className="p-8 bg-gray-50 rounded-2xl shadow-md border border-gray-200">
                <div className="text-3xl font-bold text-indigo-600 mb-3">Sales & Marketing</div>
                <h3 className="font-semibold text-xl mb-4">Pitch Ready Minutes</h3>
                <p className="text-gray-600 mb-4">
                  Summarize meetings and extract actionable points for campaigns.
                </p>
              </div>
              <div className="p-8 bg-gray-50 rounded-2xl shadow-md border border-gray-200">
                <div className="text-3xl font-bold text-indigo-600 mb-3">HR & Operations</div>
                <h3 className="font-semibold text-xl mb-4">Centralized Notes</h3>
                <p className="text-gray-600 mb-4">
                  Automatically store, summarize, and share team meetings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-purple-500 text-center text-white" id="pricing">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Focus on Decisions, Not Notes
            </h2>
            <p className="text-xl text-gray-100 mb-10">
              Let MIA handle the recording and summarization. Spend your meeting time effectively.
              </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landingpage;
