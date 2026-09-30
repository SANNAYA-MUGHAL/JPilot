import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { AnalyticsService } from '../services/analytics/analyticsService.js';
import { DashboardService } from '../services/dashboard/dashboardService.js';
import { DailyDigestGenerator } from '../services/digest/dailyDigestGenerator.js';
import { Phase1Pipeline } from '../services/orchestrator/phase1Pipeline.js';
import type { DiscoveryBatchReport } from '../services/discovery/jobDiscoveryEngine.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;
const analyticsService = new AnalyticsService();
const dashboardService = new DashboardService();
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body { font-family: 'Inter', sans-serif; }
    pre, code, .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col">
  <!-- Top Navigation Bar -->
  <header class="bg-slate-950/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
        ✈️
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="font-bold text-lg text-white tracking-tight">JPilot</h1>
          <span class="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full font-medium border border-indigo-500/30">v1.0 Phase 1–5</span>
        </div>
        <p class="text-xs text-slate-400">AI Resume Tailoring & Job Operations · <strong class="text-slate-200">Sana Liaqat</strong> (Senior PM)</p>
      </div>
    </div>

    <!-- Live Status & Human Gate -->
    <div class="flex items-center space-x-4">
      <div class="hidden md:flex items-center space-x-2 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs text-emerald-300">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-semibold">HUMAN_APPROVAL_MODE:</span> Active
      </div>
      <button onclick="switchMainTab('tailor-new')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition">
        <i class="fa-solid fa-plus text-xs"></i>
        <span>Tailor New Job</span>
      </button>
      <button onclick="refreshData()" class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition" title="Refresh Data">
        <i class="fa-solid fa-arrows-rotate text-sm"></i>
      </button>
    </div>
  </header>

  <!-- Sub Navigation Bar (Main Views) -->
  <div class="bg-slate-950 border-b border-slate-800/80 px-6 py-2 flex space-x-2 overflow-x-auto text-xs font-medium">
    <button onclick="switchMainTab('inspector')" id="nav-inspector" class="main-tab-btn px-3 py-1.5 rounded-md bg-indigo-600 text-white flex items-center space-x-2 transition">
      <i class="fa-solid fa-briefcase"></i>
      <span>Job Inspector & Packages</span>
      <span id="badge-total-jobs" class="bg-indigo-900/60 text-indigo-200 px-1.5 py-0.2 rounded text-[10px]">5</span>
    </button>
    <button onclick="switchMainTab('metrics')" id="nav-metrics" class="main-tab-btn px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center space-x-2 transition">
      <i class="fa-solid fa-chart-pie"></i>
      <span>Pipeline Funnel & Analytics</span>
    </button>
    <button onclick="switchMainTab('skill-gaps')" id="nav-skill-gaps" class="main-tab-btn px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center space-x-2 transition">
      <i class="fa-solid fa-bullseye"></i>
      <span>Skill Gap Intelligence</span>
    </button>
    <button onclick="switchMainTab('digest')" id="nav-digest" class="main-tab-btn px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center space-x-2 transition">
      <i class="fa-solid fa-newspaper"></i>
      <span>Daily Digest</span>
    </button>
    <button onclick="switchMainTab('profile')" id="nav-profile" class="main-tab-btn px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 flex items-center space-x-2 transition">
      <i class="fa-solid fa-user-check"></i>
      <span>Candidate Profile & Truth Catalog</span>
    </button>
  </div>

  <!-- Content Container -->
  <main class="flex-1 p-6 max-w-7xl w-full mx-auto">
    <!-- VIEW 1: JOB INSPECTOR -->
    <div id="view-inspector" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Jobs List Column (4 cols) -->
      <div class="lg:col-span-4 flex flex-col space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <span>Tailored Applications</span>
            <span class="text-xs text-slate-500 font-normal">(Ranked by Fit)</span>
          </h2>
        </div>
        <div id="jobs-list-container" class="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          <div class="text-slate-500 text-xs py-4 text-center">Loading applications...</div>
        </div>
      </div>

      <!-- Job Inspector Detail (8 cols) -->
      <div class="lg:col-span-8 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <!-- Inspector Job Header -->
        <div id="inspector-header" class="p-5 border-b border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-2.5">
              <span id="insp-company" class="text-lg font-bold text-white">Select a job</span>
              <span id="insp-match-badge" class="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300">--% Match</span>
            </div>
            <p id="insp-title" class="text-xs text-slate-400 mt-0.5">Click any job from the left panel to inspect</p>
          </div>
          <div id="insp-actions" class="flex items-center space-x-2">
            <!-- Buttons injected dynamically -->
          </div>
        </div>

        <!-- Inspector Sub Tabs -->
        <div class="bg-slate-900/60 border-b border-slate-800 px-4 flex space-x-1 overflow-x-auto text-xs font-medium">
          <button onclick="switchInspTab('overview')" id="tab-btn-overview" class="insp-tab-btn py-2.5 px-3 border-b-2 border-indigo-500 text-indigo-400 flex items-center space-x-1.5">
            <i class="fa-solid fa-circle-info"></i><span>Overview</span>
          </button>
          <button onclick="switchInspTab('jd')" id="tab-btn-jd" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center space-x-1.5">
            <i class="fa-solid fa-file-lines"></i><span>JD Analysis</span>
          </button>
          <button onclick="switchInspTab('match')" id="tab-btn-match" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center space-x-1.5">
            <i class="fa-solid fa-chart-simple"></i><span>Match Score</span>
          </button>
          <button onclick="switchInspTab('explain')" id="tab-btn-explain" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center space-x-1.5">
            <i class="fa-solid fa-wand-magic-sparkles"></i><span>Resume Explainability</span>
          </button>
          <button onclick="switchInspTab('coverletter')" id="tab-btn-coverletter" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center space-x-1.5">
            <i class="fa-solid fa-envelope-open-text"></i><span>Cover Letter</span>
          </button>
          <button onclick="switchInspTab('pdf')" id="tab-btn-pdf" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center space-x-1.5">
            <i class="fa-solid fa-file-pdf"></i><span>PDF & LaTeX</span>
          </button>
          <button onclick="switchInspTab('trello')" id="tab-btn-trello" class="insp-tab-btn py-2.5 px-3 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center space-x-1.5">
            <i class="fa-brands fa-trello"></i><span>Trello Card</span>
          </button>
        </div>

        <!-- Tab Body Content -->
        <div id="inspector-tab-content" class="p-5 overflow-y-auto max-h-[calc(100vh-320px)] text-sm space-y-4">
          <div class="text-slate-400 text-center py-10">Select a job to view detailed intelligence</div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: PIPELINE & CONVERSION FUNNEL -->
    <div id="view-metrics" class="hidden space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="stats-funnel-cards">
        <!-- Injected via JS -->
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-slate-200 mb-4 flex items-center space-x-2">
            <i class="fa-solid fa-fire text-amber-400"></i>
            <span>Top Requested Market Skills (ATS Demand)</span>
          </h3>
          <div id="top-skills-bars" class="space-y-3"></div>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-5">
          <h3 class="text-sm font-semibold text-slate-200 mb-4 flex items-center space-x-2">
            <i class="fa-solid fa-location-dot text-indigo-400"></i>
            <span>Target Locations & Industries</span>
          </h3>
          <div id="locations-industries-box" class="space-y-4"></div>
        </div>
      </div>
    </div>

    <!-- VIEW 3: SKILL GAP INTELLIGENCE -->
    <div id="view-skill-gaps" class="hidden space-y-6">
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-5">
        <h2 class="text-base font-bold text-white mb-2 flex items-center space-x-2">
          <i class="fa-solid fa-crosshairs text-cyan-400"></i>
          <span>Strategic Skill Gap Intelligence</span>
        </h2>
        <p class="text-xs text-slate-400 mb-6">
          JPilot analyzes all processed market JDs against Sana Liaqat's verified knowledge base to distinguish between skills that already exist (but need ATS emphasis) vs strategic growth opportunities.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Genuinely Lacking -->
          <div class="bg-rose-950/20 border border-rose-500/30 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-rose-300 mb-3 flex items-center space-x-2">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Genuinely Lacking Skills (Career Opportunity)</span>
            </h3>
            <div id="genuinely-lacking-list" class="space-y-3"></div>
          </div>

          <!-- Underemphasized -->
          <div class="bg-amber-950/20 border border-amber-500/30 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-amber-300 mb-3 flex items-center space-x-2">
              <i class="fa-solid fa-lightbulb"></i>
              <span>Under-Emphasized Skills (Candidate Possesses)</span>
            </h3>
            <div id="underemphasized-list" class="space-y-3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 4: DAILY DIGEST -->
    <div id="view-digest" class="hidden space-y-4">
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-white flex items-center space-x-2">
            <i class="fa-solid fa-newspaper text-indigo-400"></i>
            <span>Executive Daily Digest Report</span>
          </h2>
          <span class="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded">Automated Report</span>
        </div>
        <pre id="digest-text" class="bg-slate-900 border border-slate-800/80 rounded-lg p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto"></pre>
      </div>
    </div>

    <!-- VIEW 5: CANDIDATE PROFILE -->
    <div id="view-profile" class="hidden space-y-6">
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div>
            <h2 class="text-lg font-bold text-white">Sana Liaqat</h2>
            <p class="text-xs text-slate-400">Senior Product Manager · FinTech, Payments, SaaS & Marketplaces</p>
          </div>
          <div class="text-right">
            <div class="text-xs font-bold text-emerald-400">100% Fact Provenance Enforced</div>
            <div class="text-[11px] text-slate-500">Zero-Fabrication Policy Active</div>
          </div>
        </div>
        <div id="candidate-details-container" class="space-y-6 text-xs">
          <!-- Injected via JS -->
        </div>
      </div>
    </div>

    <!-- VIEW 6: TAILOR NEW JOB -->
    <div id="view-tailor-new" class="hidden space-y-6">
      <div class="bg-slate-950 border border-slate-800 rounded-xl p-6 max-w-3xl mx-auto">
        <h2 class="text-base font-bold text-white mb-2 flex items-center space-x-2">
          <i class="fa-solid fa-bolt text-indigo-400"></i>
          <span>Tailor Resume for New Job Description</span>
        </h2>
        <p class="text-xs text-slate-400 mb-6">
          Paste any Product Manager Job Description. JPilot will extract requirements, calculate the 7-factor match score, retrieve verified achievements from Sana's profile, tailor the LaTeX resume, compile the PDF, and generate a tailored cover letter.
        </p>

        <form id="tailor-form" onsubmit="submitNewJob(event)" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Company (Optional Hint)</label>
              <input type="text" id="input-company" placeholder="e.g. Stripe, Revolut, Spotify" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Role Title (Optional Hint)</label>
              <input type="text" id="input-title" placeholder="e.g. Senior Product Manager" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500">
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Job Description Text <span class="text-rose-400">*</span></label>
            <textarea id="input-jd" rows="10" required placeholder="Paste complete job description text here..." class="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"></textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="tailor-status" class="text-xs text-slate-400"></span>
            <button type="submit" id="btn-submit-tailor" class="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition">
              <i class="fa-solid fa-wand-magic-sparkles"></i>
              <span>Generate Tailored Application</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>

  <!-- Notification Toast -->
  <div id="toast" class="fixed bottom-5 right-5 bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs transition-opacity duration-300 opacity-0 pointer-events-none z-50 flex items-center space-x-2">
    <i class="fa-solid fa-circle-check text-emerald-400"></i>
    <span id="toast-msg">Action completed</span>
  </div>

  <script>
    let globalData = null;
    let selectedJob = null;
    let selectedJobDetails = null;

    async function loadData() {
      try {
        const res = await fetch('/api/dashboard');
        globalData = await res.json();
        renderSidebarJobs();
        renderMetricsView();
        renderSkillGapsView();
        renderDigestView();
        document.getElementById('badge-total-jobs').innerText = globalData.jobs.length;

        // Auto select first job if none selected
        if (globalData.jobs.length > 0 && !selectedJob) {
          selectJob(globalData.jobs[0]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }

    async function refreshData() {
      showToast('Refreshing JPilot data...');
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
      const views = ['inspector', 'metrics', 'skill-gaps', 'digest', 'profile', 'tailor-new'];
      views.forEach(v => {
        const el = document.getElementById('view-' + v);
        if (el) el.classList.add('hidden');
        const navEl = document.getElementById('nav-' + v);
        if (navEl) {
          navEl.classList.remove('bg-indigo-600', 'text-white');
          navEl.classList.add('text-slate-400');
        }
      });

      const targetView = document.getElementById('view-' + tabId);
      if (targetView) targetView.classList.remove('hidden');

      const targetNav = document.getElementById('nav-' + tabId);
      if (targetNav) {
        targetNav.classList.remove('text-slate-400');
        targetNav.classList.add('bg-indigo-600', 'text-white');
      }

      if (tabId === 'profile') loadCandidateProfile();
    }

    function renderSidebarJobs() {
      const container = document.getElementById('jobs-list-container');
      if (!globalData || !globalData.jobs || globalData.jobs.length === 0) {
        container.innerHTML = '<div class="text-xs text-slate-500 py-6 text-center">No applications generated yet.</div>';
        return;
      }

      container.innerHTML = globalData.jobs.map(job => {
        const isSelected = selectedJob && selectedJob.id === job.id;
        const scoreColor = job.matchScore >= 90 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                           job.matchScore >= 80 ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                           'bg-amber-500/20 text-amber-300 border-amber-500/30';
        return \`
          <div onclick="selectJobById('\${job.id}')" class="cursor-pointer p-3.5 rounded-xl border transition \${
            isSelected
              ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10'
              : 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
          }">
            <div class="flex items-start justify-between">
              <span class="font-bold text-xs text-white tracking-wide">\${job.company}</span>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded border \${scoreColor}">\${job.matchScore}%</span>
            </div>
            <div class="text-xs text-slate-300 font-medium mt-1 truncate">\${job.role}</div>
            <div class="flex items-center space-x-2 text-[11px] text-slate-400 mt-2">
              <span><i class="fa-solid fa-location-dot text-slate-500 mr-1"></i>\${job.location || 'Remote'}</span>
              <span>•</span>
              <span class="capitalize text-slate-400">\${job.remote_policy || 'Remote'}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function selectJobById(id) {
      const job = globalData.jobs.find(j => j.id === id);
      if (job) selectJob(job);
    }

    async function selectJob(job) {
      selectedJob = job;
      renderSidebarJobs();

      document.getElementById('insp-company').innerText = job.company;
      document.getElementById('insp-title').innerText = job.role + ' · ' + (job.location || 'Remote');
      const badge = document.getElementById('insp-match-badge');
      badge.innerText = job.matchScore + '% Match (' + job.tier + ')';
      badge.className = 'px-2 py-0.5 rounded text-xs font-bold ' +
        (job.matchScore >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30');

      const actions = document.getElementById('insp-actions');
      actions.innerHTML = \`
        <a href="/api/jobs/\${encodeURIComponent(job.companyDir)}/\${encodeURIComponent(job.roleDir)}/resume.pdf" target="_blank" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition">
          <i class="fa-solid fa-file-pdf"></i>
          <span>View Resume PDF</span>
        </a>
        <a href="/api/jobs/\${encodeURIComponent(job.companyDir)}/\${encodeURIComponent(job.roleDir)}/cover-letter.pdf" target="_blank" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition">
          <i class="fa-solid fa-envelope"></i>
          <span>Cover Letter</span>
        </a>
      \`;

      // Fetch Full Tabs Details
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
        btn.classList.remove('border-indigo-500', 'text-indigo-400');
        btn.classList.add('border-transparent', 'text-slate-400');
      });
      const activeBtn = document.getElementById('tab-btn-' + tabId);
      if (activeBtn) {
        activeBtn.classList.remove('border-transparent', 'text-slate-400');
        activeBtn.classList.add('border-indigo-500', 'text-indigo-400');
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
            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span class="text-slate-500 block mb-1">Company</span>
              <span class="font-bold text-white text-sm">\${d.overview.company}</span>
            </div>
            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span class="text-slate-500 block mb-1">Role Title</span>
              <span class="font-bold text-white text-sm truncate block">\${d.overview.role}</span>
            </div>
            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span class="text-slate-500 block mb-1">Location & Remote Policy</span>
              <span class="font-bold text-slate-200">\${d.overview.location} (\${d.overview.remote_status})</span>
            </div>
            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span class="text-slate-500 block mb-1">Salary Range</span>
              <span class="font-bold text-slate-200">\${d.overview.salary || 'Competitive market rate'}</span>
            </div>
            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span class="text-slate-500 block mb-1">Match Alignment Tier</span>
              <span class="font-bold text-emerald-400">\${d.overview.status}</span>
            </div>
            <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span class="text-slate-500 block mb-1">Generated At</span>
              <span class="text-slate-300">\${new Date(d.overview.date).toLocaleString()}</span>
            </div>
          </div>
          <div class="mt-4">
            <h4 class="text-xs font-semibold text-slate-300 mb-2">Application Timeline History</h4>
            <div class="space-y-2 border-l-2 border-slate-800 pl-3">
              \${d.history.map(h => \`
                <div class="text-[11px] flex items-center justify-between text-slate-400">
                  <span>\${h.event}</span>
                  <span class="text-slate-500 font-mono">\${new Date(h.timestamp).toLocaleTimeString()}</span>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'jd') {
        container.innerHTML = \`
          <div class="space-y-4 text-xs">
            <div>
              <h4 class="font-semibold text-slate-200 mb-2">Must-Have Skills</h4>
              <div class="flex flex-wrap gap-1.5">
                \${d.jd_analysis.must_haves.map(s => \`<span class="bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-md">\${s}</span>\`).join('')}
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-200 mb-2">Target Tools & Platforms</h4>
              <div class="flex flex-wrap gap-1.5">
                \${d.jd_analysis.tools.map(t => \`<span class="bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 px-2.5 py-1 rounded-md">\${t}</span>\`).join('')}
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-200 mb-2">ATS Keywords Extracted</h4>
              <div class="flex flex-wrap gap-1.5">
                \${d.jd_analysis.ats_keywords.map(k => \`<span class="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">\${k}</span>\`).join('')}
              </div>
            </div>
            <div>
              <h4 class="font-semibold text-slate-200 mb-2">Key Role Responsibilities</h4>
              <ul class="list-disc pl-4 space-y-1 text-slate-300">
                \${d.jd_analysis.responsibilities.map(r => \`<li>\${r}</li>\`).join('')}
              </ul>
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'match') {
        const m = d.match_analysis;
        container.innerHTML = \`
          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span class="text-slate-400 block text-[11px]">7-Factor Weighted Semantic Fit</span>
                <span class="text-2xl font-black text-emerald-400">\${m.overall_score}%</span>
                <span class="text-slate-400 ml-2">(\${m.tier})</span>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-emerald-400 mb-2 flex items-center space-x-1.5">
                <i class="fa-solid fa-circle-check"></i>
                <span>Candidate Verified Strengths</span>
              </h4>
              <ul class="space-y-1.5 text-slate-300">
                \${m.strengths.map(s => \`<li class="bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-lg flex items-start space-x-2">
                  <span class="text-emerald-400 mt-0.5">•</span>
                  <span>\${s}</span>
                </li>\`).join('')}
              </ul>
            </div>

            \${m.gaps.length > 0 ? \`
              <div>
                <h4 class="font-semibold text-amber-400 mb-2 flex items-center space-x-1.5">
                  <i class="fa-solid fa-circle-exclamation"></i>
                  <span>Identified Gaps (Non-Critical)</span>
                </h4>
                <div class="flex flex-wrap gap-1.5">
                  \${m.gaps.map(g => \`<span class="bg-amber-950/30 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-md">\${g}</span>\`).join('')}
                </div>
              </div>
            \` : ''}
          </div>
        \`;
      } else if (activeInspTab === 'explain') {
        container.innerHTML = \`
          <div class="space-y-3 text-xs">
            <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-slate-400">
              <strong class="text-indigo-400">Zero Fabrication Provenance:</strong> Every highlighted bullet is backed by a verified fact ID from Sana Liaqat's canonical profile.
            </div>
            <div class="space-y-2">
              \${d.resume.diff_changes.map(c => \`
                <div class="bg-slate-900/50 border border-slate-800/90 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-slate-300 font-semibold">\${c.section}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold \${
                      c.type === 'ADDED/EMPHASIZED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }">\${c.type}</span>
                  </div>
                  <div class="text-slate-200 font-medium mb-1">\${c.item}</div>
                  <div class="text-slate-400 text-[11px] mb-1.5"><strong class="text-slate-500">Rationale:</strong> \${c.reason}</div>
                  \${c.source_fact_ids ? \`
                    <div class="flex items-center space-x-1.5 mt-2">
                      <span class="text-[10px] text-slate-500">Verified Fact IDs:</span>
                      \${c.source_fact_ids.map(id => \`<span class="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[10px]">\${id}</span>\`).join('')}
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
            <div class="flex items-center justify-between bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <span class="text-slate-400">Word Count: <strong class="text-white">\${d.cover_letter.word_count} words</strong> (Optimal 250–350)</span>
              <a href="/api/jobs/\${encodeURIComponent(selectedJob.companyDir)}/\${encodeURIComponent(selectedJob.roleDir)}/cover-letter.pdf" target="_blank" class="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1">
                <span>Open Formatted PDF</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>
            <div class="bg-slate-900 border border-slate-800 rounded-lg p-5 text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              \${d.cover_letter.markdown_content}
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'pdf') {
        container.innerHTML = \`
          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <h4 class="font-bold text-white text-sm">Tailored Resume PDF</h4>
                <p class="text-slate-400 text-[11px] mt-0.5">High-fidelity ATS-friendly PDF compiled specifically for \${selectedJob.company}</p>
              </div>
              <div class="flex space-x-2">
                <a href="/api/jobs/\${encodeURIComponent(selectedJob.companyDir)}/\${encodeURIComponent(selectedJob.roleDir)}/resume.pdf" target="_blank" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition">
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>Open PDF in New Tab</span>
                </a>
              </div>
            </div>

            <!-- PDF Embed Preview -->
            <div class="border border-slate-800 rounded-lg overflow-hidden bg-slate-900 h-[480px]">
              <iframe src="/api/jobs/\${encodeURIComponent(selectedJob.companyDir)}/\${encodeURIComponent(selectedJob.roleDir)}/resume.pdf" class="w-full h-full border-none"></iframe>
            </div>
          </div>
        \`;
      } else if (activeInspTab === 'trello') {
        const t = d.trello;
        container.innerHTML = t ? \`
          <div class="space-y-4 text-xs">
            <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-2">
                  <i class="fa-brands fa-trello text-indigo-400 text-base"></i>
                  <span class="font-bold text-white text-sm">\${t.card_title}</span>
                </div>
                <span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">List: \${t.list_name}</span>
              </div>
              <p class="text-slate-400 mb-4">Card ID: <code class="text-slate-300 font-mono">\${t.card_id}</code></p>
              <a href="\${t.card_url}" target="_blank" class="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition">
                <span>View on Trello Board</span>
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </a>
            </div>

            <div class="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
              <h4 class="font-semibold text-slate-200 mb-2">11-Step Human Review Checklist on Trello:</h4>
              <ul class="space-y-1.5 text-slate-400">
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Review 7-factor match score breakdown</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Verify candidate headline & summary alignment</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Check prioritized Bayut & dubizzle achievements</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Validate project order (e.g. MangoPay split escrow)</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Confirm ATS keywords match requirements</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Review compiled tailored resume PDF</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Review tailored 4-part cover letter</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Check location & visa sponsorship compatibility</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Approve application package</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Submit application on company portal</span></li>
                <li class="flex items-center space-x-2"><i class="fa-regular fa-square text-slate-500"></i><span>Move card to 'Applied' list</span></li>
              </ul>
            </div>
          </div>
        \` : \`<div class="text-slate-400 py-6 text-center text-xs">No Trello card metadata found for this application.</div>\`;
      }
    }

    function renderMetricsView() {
      if (!globalData) return;
      const m = globalData.metrics;
      const container = document.getElementById('stats-funnel-cards');
      container.innerHTML = \`
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <span class="text-slate-500 text-xs block mb-1">Total Processed</span>
          <span class="text-2xl font-black text-white">\${m.jobs_processed}</span>
          <span class="text-[11px] text-slate-400 block mt-1">Applications generated</span>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <span class="text-slate-500 text-xs block mb-1">High Match (80%+)</span>
          <span class="text-2xl font-black text-emerald-400">\${m.high_match_count}</span>
          <span class="text-[11px] text-emerald-500/80 block mt-1">Ready for priority apply</span>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <span class="text-slate-500 text-xs block mb-1">Average Match Score</span>
          <span class="text-2xl font-black text-indigo-400">\${m.average_match_score}%</span>
          <span class="text-[11px] text-indigo-500/80 block mt-1">Across all target roles</span>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <span class="text-slate-500 text-xs block mb-1">Human Approval Mode</span>
          <span class="text-base font-bold text-cyan-400">ACTIVE</span>
          <span class="text-[11px] text-slate-400 block mt-1">Trello review required</span>
        </div>
      \`;

      // Skills bars
      const skillsContainer = document.getElementById('top-skills-bars');
      skillsContainer.innerHTML = m.top_requested_skills.map(s => \`
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="font-medium text-slate-300">\${s.skill}</span>
            <span class="text-slate-400 font-mono">\${s.percentage}% of jobs (\${s.count})</span>
          </div>
          <div class="w-full bg-slate-900 rounded-full h-2">
            <div class="bg-indigo-500 h-2 rounded-full" style="width: \${s.percentage}%"></div>
          </div>
        </div>
      \`).join('');

      // Locations & industries
      const locIndContainer = document.getElementById('locations-industries-box');
      locIndContainer.innerHTML = \`
        <div>
          <span class="text-xs font-semibold text-slate-400 block mb-2">Target Industries</span>
          <div class="flex flex-wrap gap-1.5">
            \${m.common_industries.map(i => \`<span class="bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded text-xs">\${i.industry} (\${i.count})</span>\`).join('')}
          </div>
        </div>
        <div class="pt-2">
          <span class="text-xs font-semibold text-slate-400 block mb-2">Target Locations & Work Auth</span>
          <div class="flex flex-wrap gap-1.5">
            \${m.common_locations.map(l => \`<span class="bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded text-xs">\${l.location} (\${l.count})</span>\`).join('')}
          </div>
        </div>
      \`;
    }

    function renderSkillGapsView() {
      if (!globalData) return;
      const g = globalData.skill_gaps;

      const genContainer = document.getElementById('genuinely-lacking-list');
      if (g.genuinely_lacking_skills.length === 0) {
        genContainer.innerHTML = '<div class="text-xs text-slate-400">None detected. Profile strongly matches all current target requirements.</div>';
      } else {
        genContainer.innerHTML = g.genuinely_lacking_skills.map(s => \`
          <div class="bg-slate-900/60 p-3 rounded-lg border border-rose-500/20 text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-white">\${s.skill}</span>
              <span class="text-[10px] text-rose-400 font-mono">\${s.percentage_of_jobs}% of jobs</span>
            </div>
            <p class="text-slate-300 text-[11px] leading-relaxed">\${s.guidance}</p>
          </div>
        \`).join('');
      }

      const underContainer = document.getElementById('underemphasized-list');
      if (g.underemphasized_skills.length === 0) {
        underContainer.innerHTML = '<div class="text-xs text-slate-400">All possessed skills are adequately emphasized in tailored resumes.</div>';
      } else {
        underContainer.innerHTML = g.underemphasized_skills.map(s => \`
          <div class="bg-slate-900/60 p-3 rounded-lg border border-amber-500/20 text-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-white">\${s.skill}</span>
              <span class="text-[10px] text-amber-400 font-mono">\${s.percentage_of_jobs}% of jobs</span>
            </div>
            <p class="text-slate-300 text-[11px] leading-relaxed">\${s.guidance}</p>
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

    async function loadCandidateProfile() {
      try {
        const res = await fetch('/api/candidate');
        const c = await res.json();
        const container = document.getElementById('candidate-details-container');
        container.innerHTML = \`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <h4 class="font-bold text-slate-200 mb-2">Verified Experience & Employers</h4>
              <ul class="space-y-2">
                \${c.experience.map(e => \`
                  <li class="border-b border-slate-800/80 pb-2">
                    <div class="font-semibold text-white">\${e.company} · \${e.role}</div>
                    <div class="text-slate-400 text-[11px]">\${e.period} (\${e.location})</div>
                    <div class="text-slate-400 text-[11px] mt-1">\${e.achievements.length} verified achievements</div>
                  </li>
                \`).join('')}
              </ul>
            </div>

            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <h4 class="font-bold text-slate-200 mb-2">Verified Key Projects</h4>
              <ul class="space-y-2">
                \${c.projects.map(p => \`
                  <li class="border-b border-slate-800/80 pb-2">
                    <div class="font-semibold text-white">\${p.name}</div>
                    <div class="text-slate-400 text-[11px]">\${p.context}</div>
                    <div class="text-slate-500 font-mono text-[10px] mt-1">ID: \${p.fact_id}</div>
                  </li>
                \`).join('')}
              </ul>
            </div>
          </div>

          <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <h4 class="font-bold text-slate-200 mb-2">Verified Fact Catalog</h4>
            <p class="text-slate-400 mb-2">Total registered verified facts in single-source-of-truth: <strong class="text-emerald-400">\${c.verified_fact_count} facts</strong></p>
            <div class="text-slate-500 text-[11px]">All generated resumes and cover letters strictly reference this catalog. Fabrications are blocked by the Truth Validation Gate.</div>
          </div>
        \`;
      } catch (err) {
        console.error('Error fetching candidate profile:', err);
      }
    }

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
          switchMainTab('inspector');
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

    // Initialize on page load
    loadData();
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
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

  // 2. GET /api/dashboard
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

  // 3. GET /api/candidate
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

  // 4. GET /api/digest
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
            job_id: 'JOB_dcfbeeef07',
            company: 'Wise',
            title: 'Senior Product Manager — Checkout & Payment Systems',
            status: 'PROCESSED',
            match_score: 98,
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

  // 5. GET /api/jobs/:companyDir/:roleDir/resume.pdf
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

  // 6. GET /api/jobs/:companyDir/:roleDir/cover-letter.pdf
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

  // 7. GET /api/jobs/:companyDir/:roleDir (Details Tabs)
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

  // 8. POST /api/tailor
  if (pathname === '/api/tailor' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
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
