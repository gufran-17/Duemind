/* analytics.js — Chart.js powered analytics */

requireAuth();
loadUserInfo();

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } } } },
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3148' } },
    y: { ticks: { color: '#94a3b8' }, grid: { color: '#2d3148' }, beginAtZero: true }
  }
};

const PIE_OPTS = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 12 } }, position: 'bottom' } }
};

const COLORS = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#14b8a6','#f97316'];

async function loadAnalytics() {
  const res = await TaskAPI.getAnalytics();
  if (!res.ok) return showToast('Error loading analytics', 'error');

  const { monthly, byCategory, completionRate, byPriority } = res.data;

  // KPI cards
  const total     = completionRate.total     || 0;
  const completed = completionRate.completed || 0;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('completionRate').textContent = rate + '%';
  document.getElementById('totalCompleted').textContent = completed;
  document.getElementById('totalAll').textContent       = total;

  // Monthly chart
  new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels:   monthly.map(m => m.month),
      datasets: [{
        label:           'Tasks Created',
        data:            monthly.map(m => m.count),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderColor:     '#6366f1',
        borderWidth:     2,
        borderRadius:    6
      }]
    },
    options: CHART_OPTS
  });

  // Category doughnut
  new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels:   byCategory.map(c => c.category),
      datasets: [{ data: byCategory.map(c => c.count), backgroundColor: COLORS, borderWidth: 0 }]
    },
    options: PIE_OPTS
  });

  // Completion rate pie
  new Chart(document.getElementById('completionChart'), {
    type: 'pie',
    data: {
      labels:   ['Completed', 'Pending'],
      datasets: [{ data: [completed, total - completed], backgroundColor: ['#10b981','#2d3148'], borderWidth: 0 }]
    },
    options: PIE_OPTS
  });

  // Priority bar
  const priorityOrder = ['High','Medium','Low'];
  const priorityMap   = Object.fromEntries(byPriority.map(p => [p.priority, p.count]));
  new Chart(document.getElementById('priorityChart'), {
    type: 'bar',
    data: {
      labels:   priorityOrder,
      datasets: [{
        label:           'Tasks',
        data:            priorityOrder.map(p => priorityMap[p] || 0),
        backgroundColor: ['rgba(239,68,68,0.7)','rgba(245,158,11,0.7)','rgba(16,185,129,0.7)'],
        borderRadius:    6
      }]
    },
    options: { ...CHART_OPTS, plugins: { legend: { display: false } } }
  });
}

loadAnalytics();