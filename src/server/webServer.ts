import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { AnalyticsService } from '../services/analytics/analyticsService.js';
import { DashboardService } from '../services/dashboard/dashboardService.js';
import { DailyDigestGenerator } from '../services/digest/dailyDigestGenerator.js';
import { Phase1Pipeline } from '../services/orchestrator/phase1Pipeline.js';
import { ApplicationTracker, type TrackerStage } from '../services/tracker/applicationTracker.js';
import type { DiscoveryBatchReport } from '../services/discovery/jobDiscoveryEngine.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;
const analyticsService = new AnalyticsService();
const dashboardService = new DashboardService();
const applicationTracker = new ApplicationTracker(undefined, dashboardService);
const pipeline = new Phase1Pipeline();

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JPilot — AI Job Application & Resume Tailoring Agent</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    pre, code, .font-mono { font-family: 'JetBrains Mono', monospace; }
    /* Custom scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col antialiased">

  <!-- Top Executive Header -->
  <header class="bg-white border-b border-slate-200/80 sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between shadow-xs">
    <div class="flex items-center space-x-3.5">
      <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200 text-white font-bold text-xl">
        ✈️
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="font-bold text-slate-900 text-lg tracking-tight">JPilot</h1>
          <span class="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-indigo-100">AI Job Search Agent</span>
        </div>
        <p class="text-xs text-slate-500">Autonomous Pipeline & Resume Tailoring · Candidate: <strong class="text-slate-800 font-semibold">Sana Liaqat</strong> (Senior PM · 7+ Yrs Exp)</p>
      </div>
    </div>

    <!-- Live Status Pills & Action Buttons -->
    <div class="flex items-center space-x-3">
      <div class="hidden md:flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs text-emerald-800 font-medium">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>HUMAN_APPROVAL_MODE: <strong>Active</strong></span>
      </div>
      <button onclick="switchMainTab('tailor-new')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition">
        <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
        <span>Tailor New Job</span>
      </button>
      <button onclick="refreshData()" class="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition" title="Refresh Pipeline">
        <i class="fa-solid fa-arrows-rotate text-sm"></i>
      </button>
    </div>
  </header>

  <!-- Main Navigation Tabs -->
  <nav class="bg-white border-b border-slate-200 px-6 py-2 flex space-x-1 overflow-x-auto text-xs font-medium shadow-xs">
    <button onclick="switchMainTab('tracker')" id="nav-tracker" class="main-tab-btn px-3.5 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold flex items-center space-x-2 transition">
      <i class="fa-solid fa-table-columns"></i>
      <span>Application Tracker</span>
      <span id="badge-tracker-total" class="bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded-full text-[10px] font-bold">12</span>
    </button>
    <button onclick="switchMainTab('inspector')" id="nav-inspector" class="main-tab-btn px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition">
      <i class="fa-solid fa-briefcase"></i>
      <span>Job Inspector & Packages</span>
    </button>
    <button onclick="switchMainTab('metrics')" id="nav-metrics" class="main-tab-btn px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition">
      <i class="fa-solid fa-chart-pie"></i>
      <span>Funnel & ATS Market Demand</span>
    </button>
    <button onclick="switchMainTab('skill-gaps')" id="nav-skill-gaps" class="main-tab-btn px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition">
      <i class="fa-solid fa-bullseye"></i>
      <span>Skill Gap Intelligence</span>
    </button>
    <button onclick="switchMainTab('digest')" id="nav-digest" class="main-tab-btn px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition">
      <i class="fa-solid fa-newspaper"></i>
      <span>Daily Digest</span>
    </button>
    <button onclick="switchMainTab('profile')" id="nav-profile" class="main-tab-btn px-3.5 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-2 transition">
      <i class="fa-solid fa-user-check"></i>
      <span>Candidate Master Profile & Truth Catalog</span>
    </button>
  </nav>

  <!-- Main Content Area -->
  <main class="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">

    <!-- VIEW 1: APPLICATION TRACKER & KANBAN PIPELINE -->
    <div id="view-tracker" class="space-y-5">
      <!-- Tracker Summary Stats Bar -->
      <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span class="text-slate-500 text-[11px] block font-medium">Total Opportunities</span>
          <span id="tracker-stat-total" class="text-xl font-bold text-slate-900">12</span>
          <span class="text-[10px] text-slate-400 block mt-0.5">Across UK, EU, UAE</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span class="text-slate-500 text-[11px] block font-medium">Review Queue</span>
          <span id="tracker-stat-review" class="text-xl font-bold text-amber-600">0</span>
          <span class="text-[10px] text-amber-600/80 block mt-0.5">80%+ Match</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span class="text-slate-500 text-[11px] block font-medium">Ready to Apply</span>
          <span id="tracker-stat-ready" class="text-xl font-bold text-indigo-600">0</span>
          <span class="text-[10px] text-indigo-600/80 block mt-0.5">Packages generated</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span class="text-slate-500 text-[11px] block font-medium">Applied</span>
          <span id="tracker-stat-applied" class="text-xl font-bold text-blue-600">0</span>
          <span class="text-[10px] text-blue-600/80 block mt-0.5">Submitted</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span class="text-slate-500 text-[11px] block font-medium">Interviewing</span>
          <span id="tracker-stat-interviewing" class="text-xl font-bold text-purple-600">0</span>
          <span class="text-[10px] text-purple-600/80 block mt-0.5">In conversation</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span class="text-slate-500 text-[11px] block font-medium">Average Match</span>
          <span id="tracker-stat-avg" class="text-xl font-bold text-emerald-600">92%</span>
          <span class="text-[10px] text-emerald-600/80 block mt-0.5">High semantic fit</span>
        </div>
      </div>

      <!-- Tracker View Header with Switcher & Search -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
        <div class="flex items-center space-x-2">
          <span class="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tracker View:</span>
          <button onclick="switchTrackerViewMode('kanban')" id="btn-view-kanban" class="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
            <i class="fa-solid fa-table-columns mr-1"></i> Kanban Board
          </button>
          <button onclick="switchTrackerViewMode('table')" id="btn-view-table" class="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent">
            <i class="fa-solid fa-list mr-1"></i> Table View
          </button>
        </div>

        <div class="flex items-center space-x-3">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
            <input type="text" id="tracker-search" oninput="filterTrackerJobs()" placeholder="Search company, title, location..." class="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white w-64">
          </div>
        </div>
      </div>

      <!-- KANBAN BOARD CONTAINER -->
      <div id="tracker-kanban-container" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 items-start overflow-x-auto pb-4">
        <!-- Columns rendered dynamically -->
      </div>

      <!-- TABLE VIEW CONTAINER -->
      <div id="tracker-table-container" class="hidden bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
            <tr>
              <th class="py-3 px-4">Company & Role</th>
              <th class="py-3 px-4">Location & Remote</th>
              <th class="py-3 px-4">Match Score</th>
              <th class="py-3 px-4">Status / Stage</th>
              <th class="py-3 px-4">Quick Actions</th>
            </tr>
          </thead>
          <tbody id="tracker-table-body" class="divide-y divide-slate-100">
            <!-- Table rows rendered dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- VIEW 2: JOB INSPECTOR -->
    <div id="view-inspector" class="hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Jobs List Column (4 cols) -->
      <div class="lg:col-span-4 flex flex-col space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            All Processed Applications (<span id="insp-list-count">0</span>)
          </h2>
          <span class="text-[11px] text-slate-400">Click to inspect</span>
        </div>
        <div id="jobs-list-container" class="space-y-2 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
          <div class="text-slate-400 text-xs py-4 text-center">Loading applications...</div>
        </div>
      </div>

      <!-- Job Detail Tabs (8 cols) -->
      <div class="lg:col-span-8 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <!-- Job Header -->
        <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-2.5">
              <span id="insp-company" class="text-lg font-bold text-slate-900">Select a job</span>
              <span id="insp-match-badge" class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">--% Match</span>
            </div>
            <p id="insp-title" class="text-xs text-slate-500 mt-1">Select an opportunity to view complete tailoring details</p>
          </div>
          <div id="insp-actions" class="flex items-center space-x-2"></div>
        </div>

        <!-- Inspector Tabs -->
        <div class="bg-white border-b border-slate-200 px-4 flex space-x-1 overflow-x-auto text-xs font-medium">
          <button onclick="switchInspTab('overview')" id="tab-btn-overview" class="insp-tab-btn py-2.5 px-3 border-b-2 border-indigo-600 text-indigo-600 font-semibold flex items-center space-x-1.5">
            <i class="fa-solid fa-circle-info"></i><span>Overview</span>
          </button>
          <button onclick="switchInspTab('jd')" id="tab-btn-jd" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-1.5">
            <i class="fa-solid fa-file-lines"></i><span>JD Analysis</span>
          </button>
          <button onclick="switchInspTab('match')" id="tab-btn-match" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-1.5">
            <i class="fa-solid fa-chart-simple"></i><span>Match Score</span>
          </button>
          <button onclick="switchInspTab('explain')" id="tab-btn-explain" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-1.5">
            <i class="fa-solid fa-wand-magic-sparkles"></i><span>Resume Explainability</span>
          </button>
          <button onclick="switchInspTab('coverletter')" id="tab-btn-coverletter" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-1.5">
            <i class="fa-solid fa-envelope-open-text"></i><span>Cover Letter</span>
          </button>
          <button onclick="switchInspTab('pdf')" id="tab-btn-pdf" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-1.5">
            <i class="fa-solid fa-file-pdf"></i><span>PDF & LaTeX</span>
          </button>
          <button onclick="switchInspTab('trello')" id="tab-btn-trello" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-1.5">
            <i class="fa-brands fa-trello"></i><span>Trello Card</span>
          </button>
        </div>

        <!-- Inspector Tab Content -->
        <div id="inspector-tab-content" class="p-6 overflow-y-auto max-h-[calc(100vh-320px)] text-sm space-y-4">
          <div class="text-slate-400 text-center py-10">Select a job to view detailed intelligence</div>
        </div>
      </div>
    </div>

    <!-- VIEW 3: PIPELINE FUNNEL & ANALYTICS -->
    <div id="view-metrics" class="hidden space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-funnel-cards"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 class="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <i class="fa-solid fa-fire text-amber-500"></i>
            <span>Top Requested Market Skills (ATS Demand Across 12 JDs)</span>
          </h3>
          <div id="top-skills-bars" class="space-y-3"></div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <h3 class="text-sm font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <i class="fa-solid fa-location-dot text-indigo-600"></i>
            <span>Target Locations & Industries</span>
          </h3>
          <div id="locations-industries-box" class="space-y-4"></div>
        </div>
      </div>
    </div>

    <!-- VIEW 4: SKILL GAP INTELLIGENCE -->
    <div id="view-skill-gaps" class="hidden space-y-6">
      <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h2 class="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
          <i class="fa-solid fa-crosshairs text-indigo-600"></i>
          <span>Strategic Skill Gap Intelligence</span>
        </h2>
        <p class="text-xs text-slate-500 mb-6">
          JPilot compares live job descriptions against Sana Liaqat's verified knowledge base to distinguish between possessed skills needing ATS front-loading vs strategic career opportunities.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Underemphasized -->
          <div class="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
            <h3 class="text-sm font-bold text-indigo-900 mb-3 flex items-center space-x-2">
              <i class="fa-solid fa-lightbulb text-amber-500"></i>
              <span>Under-Emphasized Skills (Candidate Possesses)</span>
            </h3>
            <div id="underemphasized-list" class="space-y-3"></div>
          </div>

          <!-- Genuinely Lacking -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 class="text-sm font-bold text-slate-800 mb-3 flex items-center space-x-2">
              <i class="fa-solid fa-chart-line text-blue-600"></i>
              <span>Strategic Learning Opportunities</span>
            </h3>
            <div id="genuinely-lacking-list" class="space-y-3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 5: DAILY DIGEST -->
    <div id="view-digest" class="hidden space-y-4">
      <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h2 class="text-base font-bold text-slate-900 flex items-center space-x-2">
            <i class="fa-solid fa-newspaper text-indigo-600"></i>
            <span>Executive Daily Digest Report</span>
          </h2>
          <span class="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">Autonomous Run</span>
        </div>
        <pre id="digest-text" class="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed overflow-x-auto"></pre>
      </div>
    </div>

    <!-- VIEW 6: CANDIDATE MASTER PROFILE -->
    <div id="view-profile" class="hidden space-y-6">
      <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-slate-200 pb-5 gap-3">
          <div>
            <div class="flex items-center space-x-3">
              <h2 class="text-xl font-bold text-slate-900">Sana Liaqat</h2>
              <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">100% Fact Verified</span>
            </div>
            <p class="text-xs text-slate-600 mt-1">Product Manager · FinTech, Payments, SaaS & PropTech (7+ Years Experience)</p>
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
              <span><i class="fa-solid fa-envelope mr-1 text-slate-400"></i>sannayamughal9@gmail.com</span>
              <span><i class="fa-solid fa-phone mr-1 text-slate-400"></i>(+92) 3062520001</span>
              <span><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i>Pakistan (Open to UK, EU & Remote)</span>
              <a href="https://sana-liaqat-portfolio.vercel.app/" target="_blank" class="text-indigo-600 hover:underline"><i class="fa-solid fa-globe mr-1"></i>Portfolio</a>
              <a href="https://www.linkedin.com/in/sana-liaqat/" target="_blank" class="text-indigo-600 hover:underline"><i class="fa-brands fa-linkedin mr-1"></i>LinkedIn</a>
            </div>
          </div>
          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-right">
            <span class="text-xs text-slate-500 block">Strict Provenance</span>
            <span class="text-base font-bold text-emerald-600">Zero Fabrication</span>
          </div>
        </div>

        <div id="candidate-details-container" class="space-y-6 text-xs">
          <!-- Injected via JS from authentic Europass CV -->
        </div>
      </div>
    </div>

    <!-- VIEW 7: TAILOR NEW JOB -->
    <div id="view-tailor-new" class="hidden space-y-6">
      <div class="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl mx-auto shadow-xs">
        <h2 class="text-base font-bold text-slate-900 mb-1 flex items-center space-x-2">
          <i class="fa-solid fa-bolt text-indigo-600"></i>
          <span>Tailor Resume for a New Job Description</span>
        </h2>
        <p class="text-xs text-slate-500 mb-6">
          Paste any Product Manager Job Description. JPilot will extract requirements, calculate the 7-factor match score, retrieve verified facts from Sana's profile, tailor the LaTeX resume, compile the PDF, and generate a tailored cover letter.
        </p>

        <form id="tailor-form" onsubmit="submitNewJob(event)" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Company (Optional)</label>
              <input type="text" id="input-company" placeholder="e.g. Revolut, Monzo, Miro" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Role Title (Optional)</label>
              <input type="text" id="input-title" placeholder="e.g. Senior Product Manager" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Job Description Text <span class="text-rose-500">*</span></label>
            <textarea id="input-jd" rows="9" required placeholder="Paste complete job description text here..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white"></textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="tailor-status" class="text-xs text-slate-500"></span>
            <button type="submit" id="btn-submit-tailor" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-2 transition">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Generate Tailored Application</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>

  <!-- Notification Toast -->
  <div id="toast" class="fixed bottom-5 right-5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs transition-opacity duration-300 opacity-0 pointer-events-none z-50 flex items-center space-x-2">
    <i class="fa-solid fa-circle-check text-emerald-400"></i>
    <span id="toast-msg">Action completed</span>
  </div>

  <script>
    let globalTrackerData = null;
    let globalData = null;
    let selectedJob = null;
    let selectedJobDetails = null;

    async function loadData() {
      try {
        const [dashRes, trackerRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/tracker')
        ]);
        globalData = await dashRes.json();
        globalTrackerData = await trackerRes.json();

        document.getElementById('badge-tracker-total').innerText = globalTrackerData.summary.total;
        document.getElementById('insp-list-count').innerText = globalTrackerData.summary.total;

        renderTrackerView();
        renderSidebarJobs();
        renderMetricsView();
        renderSkillGapsView();
        renderDigestView();

        if (globalTrackerData.all_jobs.length > 0 && !selectedJob) {
          selectJob(globalTrackerData.all_jobs[0]);
        }
      } catch (err) {
        console.error('Failed to load JPilot data:', err);
      }
    }

    async function refreshData() {
      showToast('Refreshing pipeline data...');
      await loadData();
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      document.getElementById('toast-msg').innerText = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 3000);
    }

    function switchMainTab(tabId) {
      const views = ['tracker', 'inspector', 'metrics', 'skill-gaps', 'digest', 'profile', 'tailor-new'];
      views.forEach(v => {
        const el = document.getElementById('view-' + v);
        if (el) el.classList.add('hidden');
        const navEl = document.getElementById('nav-' + v);
        if (navEl) {
          navEl.classList.remove('bg-indigo-50', 'text-indigo-700', 'font-semibold');
          navEl.classList.add('text-slate-600');
        }
      });

      const targetView = document.getElementById('view-' + tabId);
      if (targetView) targetView.classList.remove('hidden');

      const targetNav = document.getElementById('nav-' + tabId);
      if (targetNav) {
        targetNav.classList.remove('text-slate-600');
        targetNav.classList.add('bg-indigo-50', 'text-indigo-700', 'font-semibold');
      }

      if (tabId === 'profile') loadCandidateProfile();
    }

    /* ----------------- TRACKER LOGIC ----------------- */
    const stageDefinitions = [
      { id: 'DISCOVERED', title: 'Discovered Leads', color: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-700' },
      { id: 'REVIEW_QUEUE', title: 'Review Queue (80%+)', color: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-800' },
      { id: 'READY_TO_APPLY', title: 'Ready to Apply', color: 'border-indigo-300', bg: 'bg-indigo-50', text: 'text-indigo-800' },
      { id: 'APPLIED', title: 'Applied', color: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-800' },
      { id: 'INTERVIEWING', title: 'Interviewing', color: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-800' },
      { id: 'OFFER', title: 'Offer Extended', color: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-800' }
    ];

    function renderTrackerView() {
      if (!globalTrackerData) return;
      const s = globalTrackerData.summary;

      document.getElementById('tracker-stat-total').innerText = s.total;
      document.getElementById('tracker-stat-review').innerText = s.review_queue;
      document.getElementById('tracker-stat-ready').innerText = s.ready_to_apply;
      document.getElementById('tracker-stat-applied').innerText = s.applied;
      document.getElementById('tracker-stat-interviewing').innerText = s.interviewing;
      document.getElementById('tracker-stat-avg').innerText = s.avg_match + '%';

      renderKanbanBoard();
      renderTableView();
    }

    function renderKanbanBoard() {
      const container = document.getElementById('tracker-kanban-container');
      const searchQuery = (document.getElementById('tracker-search')?.value || '').toLowerCase();

      container.innerHTML = stageDefinitions.map(stage => {
        let jobsInStage = globalTrackerData.stages[stage.id] || [];
        if (searchQuery) {
          jobsInStage = jobsInStage.filter(j => 
            j.company.toLowerCase().includes(searchQuery) ||
            j.role.toLowerCase().includes(searchQuery) ||
            (j.location && j.location.toLowerCase().includes(searchQuery))
          );
        }

        return \`
          <div class="bg-slate-100/70 border border-slate-200 rounded-xl p-3 flex flex-col min-h-[460px]">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <span class="text-xs font-bold text-slate-800 truncate">\${stage.title}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full \${stage.bg} \${stage.text} border \${stage.color}">\${jobsInStage.length}</span>
            </div>

            <div class="space-y-2.5 overflow-y-auto max-h-[580px] flex-1 pr-1">
              \${jobsInStage.length === 0 ? \`
                <div class="text-[11px] text-slate-400 py-6 text-center italic">No jobs in this stage</div>
              \` : jobsInStage.map(job => {
                const badgeColor = job.matchScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                   job.matchScore >= 80 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                   'bg-amber-50 text-amber-700 border-amber-200';
                return \`
                  <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:shadow-md transition">
                    <div class="flex items-start justify-between">
                      <span class="font-bold text-xs text-slate-900">\${job.company}</span>
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border \${badgeColor}">\${job.matchScore}%</span>
                    </div>
                    <div class="text-xs font-medium text-slate-700 mt-1 line-clamp-2" title="\${job.role}">\${job.role}</div>
                    <div class="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                      <i class="fa-solid fa-location-dot text-slate-400"></i>
                      <span class="truncate">\${job.location || 'Remote'}</span>
                    </div>

                    <!-- Quick Action Links -->
                    <div class="flex items-center justify-between border-t border-slate-100 pt-2 mt-2 text-[11px]">
                      <div class="flex items-center space-x-1.5">
                        <a href="/api/jobs/\${encodeURIComponent(job.companyDir)}/\${encodeURIComponent(job.roleDir)}/resume.pdf" target="_blank" class="text-indigo-600 hover:text-indigo-800 p-1" title="View Tailored Resume PDF">
                          <i class="fa-solid fa-file-pdf"></i>
                        </a>
                        <a href="/api/jobs/\${encodeURIComponent(job.companyDir)}/\${encodeURIComponent(job.roleDir)}/cover-letter.pdf" target="_blank" class="text-slate-600 hover:text-slate-800 p-1" title="View Cover Letter PDF">
                          <i class="fa-solid fa-envelope"></i>
                        </a>
                        <button onclick="inspectJobFromTracker('\${job.id}')" class="text-slate-600 hover:text-slate-900 p-1" title="Inspect Full Tabs">
                          <i class="fa-solid fa-eye"></i>
                        </button>
                      </div>

                      <!-- Stage Selector Dropdown -->
                      <select onchange="updateJobStage('\${job.id}', this.value)" class="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium focus:outline-none">
                        \${stageDefinitions.map(s => \`
                          <option value="\${s.id}" \${s.id === job.stage ? 'selected' : ''}>\${s.title.split(' ')[0]}</option>
                        \`).join('')}
                      </select>
                    </div>
                  </div>
                \`;
              }).join('')}
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderTableView() {
      const tbody = document.getElementById('tracker-table-body');
      const searchQuery = (document.getElementById('tracker-search')?.value || '').toLowerCase();
      let jobs = globalTrackerData.all_jobs;

      if (searchQuery) {
        jobs = jobs.filter(j => 
          j.company.toLowerCase().includes(searchQuery) ||
          j.role.toLowerCase().includes(searchQuery) ||
          (j.location && j.location.toLowerCase().includes(searchQuery))
        );
      }

      tbody.innerHTML = jobs.map(j => {
        const badgeColor = j.matchScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                           j.matchScore >= 80 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                           'bg-amber-50 text-amber-700 border-amber-200';
        return \`
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3 px-4">
              <div class="font-bold text-slate-900">\${j.company}</div>
              <div class="text-slate-600">\${j.role}</div>
            </td>
            <td class="py-3 px-4 text-slate-600">
              <div>\${j.location || 'Remote'}</div>
              <div class="text-[10px] text-slate-400 capitalize">\${j.remote_policy || 'Remote'}</div>
            </td>
            <td class="py-3 px-4">
              <span class="px-2 py-0.5 rounded text-xs font-bold border \${badgeColor}">\${j.matchScore}%</span>
            </td>
            <td class="py-3 px-4">
              <select onchange="updateJobStage('\${j.id}', this.value)" class="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-medium">
                \${stageDefinitions.map(s => \`
                  <option value="\${s.id}" \${s.id === j.stage ? 'selected' : ''}>\${s.title}</option>
                \`).join('')}
              </select>
            </td>
            <td class="py-3 px-4">
              <div class="flex items-center space-x-2">
                <a href="/api/jobs/\${encodeURIComponent(j.companyDir)}/\${encodeURIComponent(j.roleDir)}/resume.pdf" target="_blank" class="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs flex items-center space-x-1">
                  <i class="fa-solid fa-file-pdf"></i><span>Resume</span>
                </a>
                <a href="/api/jobs/\${encodeURIComponent(j.companyDir)}/\${encodeURIComponent(j.roleDir)}/cover-letter.pdf" target="_blank" class="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs flex items-center space-x-1">
                  <i class="fa-solid fa-envelope"></i><span>Letter</span>
                </a>
                <button onclick="inspectJobFromTracker('\${j.id}')" class="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-xs">
                  Inspect
                </button>
              </div>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function switchTrackerViewMode(mode) {
      const kanban = document.getElementById('tracker-kanban-container');
      const table = document.getElementById('tracker-table-container');
      const btnK = document.getElementById('btn-view-kanban');
      const btnT = document.getElementById('btn-view-table');

      if (mode === 'kanban') {
        kanban.classList.remove('hidden');
        table.classList.add('hidden');
        btnK.className = 'px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200';
        btnT.className = 'px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent';
      } else {
        kanban.classList.add('hidden');
        table.classList.remove('hidden');
        btnT.className = 'px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200';
        btnK.className = 'px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent';
      }
    }

    function filterTrackerJobs() {
      renderKanbanBoard();
      renderTableView();
    }

    async function updateJobStage(jobId, newStage) {
      try {
        const res = await fetch('/api/tracker/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, stage: newStage })
        });
        const data = await res.json();
        if (data.success) {
          showToast(\`Stage updated to \${newStage}\`);
          await loadData();
        }
      } catch (err) {
        console.error('Failed to update stage:', err);
      }
    }

    function inspectJobFromTracker(id) {
      const job = globalTrackerData.all_jobs.find(j => j.id === id);
      if (job) {
        switchMainTab('inspector');
        selectJob(job);
      }
    }

    /* ----------------- INSPECTOR LOGIC ----------------- */
    function renderSidebarJobs() {
      const container = document.getElementById('jobs-list-container');
      if (!globalTrackerData || !globalTrackerData.all_jobs || globalTrackerData.all_jobs.length === 0) {
        container.innerHTML = '<div class="text-xs text-slate-400 py-6 text-center">No applications generated yet.</div>';
        return;
      }

      container.innerHTML = globalTrackerData.all_jobs.map(job => {
        const isSelected = selectedJob && selectedJob.id === job.id;
        const scoreColor = job.matchScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                           job.matchScore >= 80 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                           'bg-amber-50 text-amber-700 border-amber-200';
        return \`
          <div onclick="selectJobById('\${job.id}')" class="cursor-pointer p-3.5 rounded-xl border transition \${
            isSelected
              ? 'bg-indigo-50/70 border-indigo-500 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }">
            <div class="flex items-start justify-between">
              <span class="font-bold text-xs text-slate-900">\${job.company}</span>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded border \${scoreColor}">\${job.matchScore}%</span>
            </div>
            <div class="text-xs text-slate-700 font-medium mt-1 truncate">\${job.role}</div>
            <div class="flex items-center space-x-2 text-[11px] text-slate-500 mt-2">
              <span><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>\${job.location || 'Remote'}</span>
              <span>•</span>
              <span class="capitalize">\${job.remote_policy || 'Remote'}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function selectJobById(id) {
      const job = globalTrackerData.all_jobs.find(j => j.id === id);
      if (job) selectJob(job);
    }

    async function selectJob(job) {
      selectedJob = job;
      renderSidebarJobs();

      document.getElementById('insp-company').innerText = job.company;
      document.getElementById('insp-title').innerText = job.role + ' · ' + (job.location || 'Remote');
      const badge = document.getElementById('insp-match-badge');
      badge.innerText = job.matchScore + '% Match (' + job.tier + ')';
      badge.className = 'px-3 py-1 rounded-full text-xs font-bold ' +
        (job.matchScore >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200');

      const actions = document.getElementById('insp-actions');
      actions.innerHTML = \`
        <a href="/api/jobs/\${encodeURIComponent(job.companyDir)}/\${encodeURIComponent(job.roleDir)}/resume.pdf" target="_blank" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition">
          <i class="fa-solid fa-file-pdf"></i>
          <span>View Resume PDF</span>
        </a>
        <a href="/api/jobs/\${encodeURIComponent(job.companyDir)}/\${encodeURIComponent(job.roleDir)}/cover-letter.pdf" target="_blank" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition">
          <i class="fa-solid fa-envelope"></i>
          <span>Cover Letter</span>
        </a>
      \`;

      try {
        const res = await fetch(\`/api/jobs/\${encodeURIComponent(job.companyDir)}/\${encodeURIComponent(job.roleDir)}\`);
        selectedJobDetails = await res.json();
        renderActiveInspTab();
      } catch (err) {
        console.error('Error fetching job details:', err);
      }
    }

    let activeInspTab = 'overview';
    function switchInspTab(tabId) {
      activeInspTab = tabId;
      document.querySelectorAll('.insp-tab-btn').forEach(btn => {
        btn.classList.remove('border-indigo-600', 'text-indigo-600', 'font-semibold');
        btn.classList.add('border-transparent', 'text-slate-500');
      });
      const activeBtn = document.getElementById('tab-btn-' + tabId);
      if (activeBtn) {
        activeBtn.classList.remove('border-transparent', 'text-slate-500');
        activeBtn.classList.add('border-indigo-600', 'text-indigo-600', 'font-semibold');
      }
      renderActiveInspTab();
    }

    function renderActiveInspTab() {
      const container = document.getElementById('inspector-tab-content');
      if (!selectedJobDetails) {
        container.innerHTML = '<div class="text-slate-400 py-6 text-center">Loading job intelligence...</div>';
        return;
      }

      const d = selectedJobDetails;
      if (activeInspTab === 'overview') {
        container.innerHTML = \`
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span class="text-slate-500 block mb-1">Company</span>
              <span class="font-bold text-slate-900 text-sm">\${d.overview.company}</span>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span class="text-slate-500 block mb-1">Role Title</span>
              <span class="font-bold text-slate-900 text-sm truncate block">\${d.overview.role}</span>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span class="text-slate-500 block mb-1">Location & Remote Policy</span>
              <span class="font-semibold text-slate-800">\${d.overview.location} (\${d.overview.remote_status})</span>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span class="text-slate-500 block mb-1">Salary Range</span>
              <span class="font-semibold text-slate-800">\${d.overview.salary || 'Competitive market rate'}</span>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span class="text-slate-500 block mb-1">Alignment Status</span>
              <span class="font-bold text-emerald-600">\${d.overview.status}</span>
            </div>
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span class="text-slate-500 block mb-1">Generated At</span>
              <span class="text-slate-700">\${new Date(d.overview.date).toLocaleString()}</span>
            </div>
          </div>
          <div class="mt-4">
            <h4 class="text-xs font-bold text-slate-700 mb-2">Application Timeline History</h4>
            <div class="space-y-2 border-l-2 border-indigo-200 pl-3">
              \${d.history.map(h => \`
                <div class="text-[11px] flex items-center justify-between text-slate-600">
                  <span>\${h.event}</span>
                  <span class="text-slate-400 font-mono">\${new Date(h.timestamp).toLocaleTimeString()}</span>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'jd') {
        container.innerHTML = \`
          <div class="space-y-4 text-xs">
            <div>
              <h4 class="font-bold text-slate-800 mb-2">Must-Have Skills</h4>
              <div class="flex flex-wrap gap-1.5">
                \${d.jd_analysis.must_haves.map(s => \`<span class="bg-indigo-50 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-md font-medium">\${s}</span>\`).join('')}
              </div>
            </div>
            <div>
              <h4 class="font-bold text-slate-800 mb-2">Target Tools & Platforms</h4>
              <div class="flex flex-wrap gap-1.5">
                \${d.jd_analysis.tools.map(t => \`<span class="bg-sky-50 border border-sky-200 text-sky-800 px-2.5 py-1 rounded-md font-medium">\${t}</span>\`).join('')}
              </div>
            </div>
            <div>
              <h4 class="font-bold text-slate-800 mb-2">ATS Keywords Extracted</h4>
              <div class="flex flex-wrap gap-1.5">
                \${d.jd_analysis.ats_keywords.map(k => \`<span class="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">\${k}</span>\`).join('')}
              </div>
            </div>
            <div>
              <h4 class="font-bold text-slate-800 mb-2">Key Role Responsibilities</h4>
              <ul class="list-disc pl-4 space-y-1 text-slate-600">
                \${d.jd_analysis.responsibilities.map(r => \`<li>\${r}</li>\`).join('')}
              </ul>
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'match') {
        const m = d.match_analysis;
        container.innerHTML = \`
          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span class="text-slate-500 block text-[11px]">7-Factor Semantic Fit</span>
                <span class="text-3xl font-black text-emerald-600">\${m.overall_score}%</span>
                <span class="text-slate-500 ml-2 font-semibold">(\${m.tier})</span>
              </div>
            </div>

            <div>
              <h4 class="font-bold text-emerald-700 mb-2 flex items-center space-x-1.5">
                <i class="fa-solid fa-circle-check"></i>
                <span>Candidate Verified Strengths</span>
              </h4>
              <ul class="space-y-1.5 text-slate-700">
                \${m.strengths.map(s => \`<li class="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-start space-x-2">
                  <span class="text-emerald-600 mt-0.5 font-bold">•</span>
                  <span>\${s}</span>
                </li>\`).join('')}
              </ul>
            </div>

            \${m.gaps.length > 0 ? \`
              <div>
                <h4 class="font-bold text-amber-700 mb-2 flex items-center space-x-1.5">
                  <i class="fa-solid fa-circle-exclamation"></i>
                  <span>Identified Gaps (Non-Critical)</span>
                </h4>
                <div class="flex flex-wrap gap-1.5">
                  \${m.gaps.map(g => \`<span class="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-md font-medium">\${g}</span>\`).join('')}
                </div>
              </div>
            \` : ''}
          </div>
        \`;
      } else if (activeInspTab === 'explain') {
        container.innerHTML = \`
          <div class="space-y-3 text-xs">
            <div class="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-indigo-900">
              <strong>Zero-Fabrication Truth Guarantee:</strong> Every bullet in the tailored resume traces directly to a verified fact ID in Sana Liaqat's authentic profile.
            </div>
            <div class="space-y-2">
              \${d.resume.diff_changes.map(c => \`
                <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-slate-800 font-bold">\${c.section}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold \${
                      c.type === 'ADDED/EMPHASIZED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }">\${c.type}</span>
                  </div>
                  <div class="text-slate-900 font-medium mb-1">\${c.item}</div>
                  <div class="text-slate-500 text-[11px] mb-1.5"><strong>Rationale:</strong> \${c.reason}</div>
                  \${c.source_fact_ids ? \`
                    <div class="flex items-center space-x-1.5 mt-2">
                      <span class="text-[10px] text-slate-400">Verified Fact Provenance:</span>
                      \${c.source_fact_ids.map(id => \`<span class="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-[10px] border border-slate-200">\${id}</span>\`).join('')}
                    </div>
                  \` : ''}
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'coverletter') {
        container.innerHTML = \`
          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <span class="text-slate-600">Word Count: <strong class="text-slate-900">\${d.cover_letter.word_count} words</strong> (Optimal 250–350)</span>
              <a href="/api/jobs/\${encodeURIComponent(selectedJob.companyDir)}/\${encodeURIComponent(selectedJob.roleDir)}/cover-letter.pdf" target="_blank" class="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1">
                <span>Open PDF Version</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>
            <div class="bg-white border border-slate-200 rounded-xl p-6 text-slate-700 leading-relaxed font-sans whitespace-pre-wrap shadow-xs">
              \${d.cover_letter.markdown_content}
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'pdf') {
        container.innerHTML = \`
          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h4 class="font-bold text-slate-900 text-sm">Tailored Resume PDF</h4>
                <p class="text-slate-500 text-[11px] mt-0.5">High-fidelity ATS-friendly PDF compiled for \${selectedJob.company}</p>
              </div>
              <div>
                <a href="/api/jobs/\${encodeURIComponent(selectedJob.companyDir)}/\${encodeURIComponent(selectedJob.roleDir)}/resume.pdf" target="_blank" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>Open PDF in New Tab</span>
                </a>
              </div>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 h-[500px] shadow-xs">
              <iframe src="/api/jobs/\${encodeURIComponent(selectedJob.companyDir)}/\${encodeURIComponent(selectedJob.roleDir)}/resume.pdf" class="w-full h-full border-none"></iframe>
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'trello') {
        const t = d.trello;
        container.innerHTML = t ? \`
          <div class="space-y-4 text-xs">
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                  <i class="fa-brands fa-trello text-indigo-600 text-lg"></i>
                  <span class="font-bold text-slate-900 text-sm">\${t.card_title}</span>
                </div>
                <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-[11px] font-semibold">List: \${t.list_name}</span>
              </div>
              <p class="text-slate-500 mb-4">Card ID: <code class="text-slate-700 font-mono">\${t.card_id}</code></p>
              <a href="\${t.card_url}" target="_blank" class="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition">
                <span>Open in Trello Board</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 class="font-bold text-slate-800 mb-2">11-Step Human Review Checklist on Trello:</h4>
              <ul class="space-y-1.5 text-slate-600">
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Review 7-factor match score breakdown</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Verify candidate headline & summary alignment</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Check prioritized Bayuti & elGrocer achievements</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Validate project order (e.g. Mangopay escrow, 33% cancellation reduction)</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Confirm ATS keywords match requirements</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Review compiled tailored resume PDF</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Review tailored 4-part cover letter</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Check location & visa sponsorship compatibility</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Approve application package</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Submit application on company portal</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-400"></i><span>Move card to 'Applied' list</span></li>
              </ul>
            </div>
          </div>
        \` : \`<div class="text-slate-400 py-6 text-center text-xs">No Trello card metadata found for this application.</div>\`;
      }
    }

    /* ----------------- METRICS LOGIC ----------------- */
    function renderMetricsView() {
      if (!globalData) return;
      const m = globalData.metrics;
      const container = document.getElementById('stats-funnel-cards');
      container.innerHTML = \`
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span class="text-slate-500 text-xs block mb-1">Total Processed</span>
          <span class="text-2xl font-bold text-slate-900">\${m.jobs_processed}</span>
          <span class="text-[11px] text-slate-400 block mt-1">12 Target PM Roles</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span class="text-slate-500 text-xs block mb-1">High Match (80%+)</span>
          <span class="text-2xl font-bold text-emerald-600">\${m.high_match_count}</span>
          <span class="text-[11px] text-emerald-600/80 block mt-1">Ready for priority apply</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span class="text-slate-500 text-xs block mb-1">Average Match Score</span>
          <span class="text-2xl font-bold text-indigo-600">\${m.average_match_score}%</span>
          <span class="text-[11px] text-indigo-600/80 block mt-1">Across target roles</span>
        </div>
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span class="text-slate-500 text-xs block mb-1">Human Approval Mode</span>
          <span class="text-base font-bold text-cyan-700">ACTIVE</span>
          <span class="text-[11px] text-slate-400 block mt-1">Human verification gate</span>
        </div>
      \`;

      const skillsContainer = document.getElementById('top-skills-bars');
      skillsContainer.innerHTML = m.top_requested_skills.map(s => \`
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="font-medium text-slate-700">\${s.skill}</span>
            <span class="text-slate-500 font-mono text-[11px]">\${s.percentage}% of jobs (\${s.count})</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2">
            <div class="bg-indigo-600 h-2 rounded-full" style="width: \${s.percentage}%"></div>
          </div>
        </div>
      \`).join('');

      const locIndContainer = document.getElementById('locations-industries-box');
      locIndContainer.innerHTML = \`
        <div>
          <span class="text-xs font-semibold text-slate-500 block mb-2">Target Industries</span>
          <div class="flex flex-wrap gap-1.5">
            \${m.common_industries.map(i => \`<span class="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium">\${i.industry} (\${i.count})</span>\`).join('')}
          </div>
        </div>
        <div class="pt-2">
          <span class="text-xs font-semibold text-slate-500 block mb-2">Target Locations & Work Auth</span>
          <div class="flex flex-wrap gap-1.5">
            \${m.common_locations.map(l => \`<span class="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium">\${l.location} (\${l.count})</span>\`).join('')}
          </div>
        </div>
      \`;
    }

    /* ----------------- SKILL GAPS LOGIC ----------------- */
    function renderSkillGapsView() {
      if (!globalData) return;
      const g = globalData.skill_gaps;

      const genContainer = document.getElementById('genuinely-lacking-list');
      if (g.genuinely_lacking_skills.length === 0) {
        genContainer.innerHTML = '<div class="text-xs text-slate-500 py-3">No critical skill gaps identified. Sana\\'s profile strongly matches market requirements.</div>';
      } else {
        genContainer.innerHTML = g.genuinely_lacking_skills.map(s => \`
          <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-slate-900">\${s.skill}</span>
              <span class="text-[10px] text-blue-600 font-mono">\${s.percentage_of_jobs}% of jobs</span>
            </div>
            <p class="text-slate-600 text-[11px] leading-relaxed">\${s.guidance}</p>
          </div>
        \`).join('');
      }

      const underContainer = document.getElementById('underemphasized-list');
      if (g.underemphasized_skills.length === 0) {
        underContainer.innerHTML = '<div class="text-xs text-slate-500 py-3">All possessed skills are adequately emphasized.</div>';
      } else {
        underContainer.innerHTML = g.underemphasized_skills.map(s => \`
          <div class="bg-white p-3 rounded-lg border border-amber-200 shadow-xs text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-slate-900">\${s.skill}</span>
              <span class="text-[10px] text-amber-700 font-mono font-semibold">\${s.percentage_of_jobs}% of jobs</span>
            </div>
            <p class="text-slate-600 text-[11px] leading-relaxed">\${s.guidance}</p>
          </div>
        \`).join('');
      }
    }

    async function renderDigestView() {
      try {
        const res = await fetch('/api/digest');
        const data = await res.json();
        document.getElementById('digest-text').innerText = data.digest;
      } catch (err) {
        console.error('Error fetching digest:', err);
      }
    }

    /* ----------------- CANDIDATE PROFILE (EUROPASS) ----------------- */
    async function loadCandidateProfile() {
      try {
        const res = await fetch('/api/candidate');
        const c = await res.json();
        const container = document.getElementById('candidate-details-container');
        container.innerHTML = \`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Work Experience -->
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 class="font-bold text-slate-900 mb-3 text-sm flex items-center space-x-1.5">
                <i class="fa-solid fa-briefcase text-indigo-600"></i>
                <span>Verified Work Experience (Europass)</span>
              </h4>
              <ul class="space-y-3">
                \${c.experience.map(e => \`
                  <li class="bg-white p-3 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">\${e.company}</div>
                    <div class="text-indigo-600 font-medium text-[11px]">\${e.role}</div>
                    <div class="text-slate-400 text-[10px]">\${e.period || e.start_date + ' -- ' + e.end_date} (\${e.location})</div>
                    <div class="text-slate-600 text-[11px] mt-1.5 line-clamp-2">\${e.overview}</div>
                    <div class="text-[10px] text-slate-500 font-mono mt-1.5">\${e.achievements.length} achievements · \${e.responsibilities.length} responsibilities</div>
                  </li>
                \`).join('')}
              </ul>
            </div>

            <!-- Key Projects & Awards -->
            <div class="space-y-4">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 class="font-bold text-slate-900 mb-3 text-sm flex items-center space-x-1.5">
                  <i class="fa-solid fa-trophy text-amber-500"></i>
                  <span>Honours & Awards</span>
                </h4>
                <div class="space-y-2">
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">Outstanding Contribution Award (elGrocer by Smiles)</div>
                    <div class="text-slate-500 text-[11px]">June 2023 · Exceptional performance as Tech Support Manager</div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">Best KPI Achiever – Performance Excellence</div>
                    <div class="text-slate-500 text-[11px]">Consistently exceeding SLA and issue resolution KPIs</div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">Hackathon Recognition – Product Execution</div>
                    <div class="text-slate-500 text-[11px]">Led cross-functional team delivering award-winning product concept</div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">Product Vision & Fintech Domain Recognition</div>
                    <div class="text-slate-500 text-[11px]">Acknowledged for deep fintech product and system workflows</div>
                  </div>
                </div>
              </div>

              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 class="font-bold text-slate-900 mb-3 text-sm flex items-center space-x-1.5">
                  <i class="fa-solid fa-graduation-cap text-indigo-600"></i>
                  <span>Education & Certifications</span>
                </h4>
                <div class="space-y-2">
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">Bachelor of Science in Software Engineering (GPA: 3.3/4.0)</div>
                    <div class="text-slate-500 text-[11px]">University of Sargodha (2014–2018) · Faisalabad, Pakistan (EQF Level 6)</div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">IBM AI Product Manager Professional Certificate</div>
                    <div class="text-slate-500 text-[11px]">Coursera (10-Course Series, expected 2026)</div>
                  </div>
                  <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div class="font-bold text-slate-900">Google Data Analytics Professional Certificate</div>
                    <div class="text-slate-500 text-[11px]">Coursera · SQL, R, Tableau, Data Storytelling</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 class="font-bold text-slate-900 mb-2 text-sm flex items-center space-x-1.5">
              <i class="fa-solid fa-shield-halved text-emerald-600"></i>
              <span>Single Source of Truth Fact Catalog</span>
            </h4>
            <p class="text-slate-600 mb-1">Total registered verified facts: <strong class="text-emerald-700 font-bold">\${c.verified_fact_count} facts</strong></p>
            <div class="text-slate-500 text-[11px]">Every resume generated by JPilot is strictly constrained by these verified facts. Any unverified claim is caught and rejected by the Truth Validation Gate.</div>
          </div>
        \`;
      } catch (err) {
        console.error('Error fetching candidate profile:', err);
      }
    }

    /* ----------------- SUBMIT NEW JOB ----------------- */
    async function submitNewJob(e) {
      e.preventDefault();
      const statusEl = document.getElementById('tailor-status');
      const submitBtn = document.getElementById('btn-submit-tailor');
      const company = document.getElementById('input-company').value.trim();
      const title = document.getElementById('input-title').value.trim();
      const jd = document.getElementById('input-jd').value.trim();

      if (!jd) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i><span>Analyzing & Tailoring...</span>';
      statusEl.innerText = 'Extracting requirements, matching skills, tailoring LaTeX & compiling PDF...';

      try {
        const res = await fetch('/api/tailor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_jd_text: jd, company_hint: company, title_hint: title })
        });
        const result = await res.json();
        if (result.success) {
          showToast(\`Application created for \${result.company}! (\${result.match.overall_score}% match)\`);
          document.getElementById('tailor-form').reset();
          await loadData();
          selectJobById(result.job_id);
          switchMainTab('tracker');
        } else {
          statusEl.innerText = 'Error: ' + result.error;
        }
      } catch (err) {
        statusEl.innerText = 'Failed to process JD: ' + err.message;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Generate Tailored Application</span>';
      }
    }

    // Run on load
    loadData();
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Root: Web Dashboard UI
  if (pathname === '/' || pathname === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHTML());
    return;
  }

  // 2. GET /api/tracker
  if (pathname === '/api/tracker') {
    try {
      const data = applicationTracker.getTrackerData();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. POST /api/tracker/update
  if (pathname === '/api/tracker/update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { jobId, stage, notes } = JSON.parse(body);
        const updated = applicationTracker.updateJobStage(jobId, stage as TrackerStage, notes);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, updated }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. GET /api/dashboard
  if (pathname === '/api/dashboard') {
    try {
      const { metrics, skill_gaps } = analyticsService.getDashboardMetrics();
      const jobs = dashboardService.listAllJobs();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ metrics, skill_gaps, jobs }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. GET /api/candidate
  if (pathname === '/api/candidate') {
    try {
      const data = dashboardService.getCandidateProfile();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 6. GET /api/digest
  if (pathname === '/api/digest') {
    try {
      const { metrics } = analyticsService.getDashboardMetrics();
      const mockReport: DiscoveryBatchReport = {
        run_id: 'RUN_' + Date.now(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        total_discovered: metrics.jobs_processed,
        duplicates_skipped: 0,
        hard_filtered: 0,
        jobs_processed: metrics.jobs_processed,
        packages_generated: metrics.jobs_processed,
        errors_count: 0,
        results: [
          {
            job_id: 'JOB_4abc9f323a',
            company: 'Wise',
            title: 'Senior Product Manager — Checkout & Payment Systems',
            status: 'PROCESSED',
            match_score: 96,
            trello_card_url: 'https://trello.com/c/card_wise',
          },
        ],
      };
      const digest = DailyDigestGenerator.generateDigest(mockReport, metrics);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ digest }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 7. GET /api/jobs/:companyDir/:roleDir/resume.pdf
  const resumePdfMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/([^/]+)\/resume\.pdf$/);
  if (resumePdfMatch) {
    const companyDir = decodeURIComponent(resumePdfMatch[1]);
    const roleDir = decodeURIComponent(resumePdfMatch[2]);
    const filePath = path.resolve(process.cwd(), 'applications', companyDir, roleDir, 'tailored_resume.pdf');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="tailored_resume.pdf"',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Resume PDF not found');
      return;
    }
  }

  // 8. GET /api/jobs/:companyDir/:roleDir/cover-letter.pdf
  const clPdfMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/([^/]+)\/cover-letter\.pdf$/);
  if (clPdfMatch) {
    const companyDir = decodeURIComponent(clPdfMatch[1]);
    const roleDir = decodeURIComponent(clPdfMatch[2]);
    const filePath = path.resolve(process.cwd(), 'applications', companyDir, roleDir, 'cover_letter.pdf');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="cover_letter.pdf"',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Cover letter PDF not found');
      return;
    }
  }

  // 9. GET /api/jobs/:companyDir/:roleDir (Details Tabs)
  const jobDetailsMatch = pathname.match(/^\/api\/jobs\/([^/]+)\/([^/]+)$/);
  if (jobDetailsMatch) {
    const companyDir = decodeURIComponent(jobDetailsMatch[1]);
    const roleDir = decodeURIComponent(jobDetailsMatch[2]);
    const appDir = path.resolve(process.cwd(), 'applications', companyDir, roleDir);
    if (fs.existsSync(appDir)) {
      try {
        const details = dashboardService.getJobDetails(appDir);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(details));
        return;
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Application directory not found' }));
      return;
    }
  }

  // 10. POST /api/tailor
  if (pathname === '/api/tailor' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        if (!data.raw_jd_text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing raw_jd_text' }));
          return;
        }

        const packageResult = await pipeline.execute({
          raw_jd_text: data.raw_jd_text,
          company_hint: data.company_hint,
          title_hint: data.title_hint,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            job_id: packageResult.job_id,
            company: packageResult.company,
            role: packageResult.role,
            match: packageResult.match,
            package_dir: packageResult.package_dir,
          })
        );
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('='.repeat(80));
  console.log(`🚀 JPilot Web Dashboard live at: http://localhost:${PORT}`);
  console.log('='.repeat(80));
});
