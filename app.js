const $ = (id) => document.getElementById(id);
const endpoint = (window.STATUS_API_URL || '').replace(/\/$/, '');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const formatTime = (iso) => iso ? new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) + ' SGT' : '—';
const relative = (iso) => {
  if (!iso) return 'No data yet';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins < 1 ? 'Just now' : `${mins} min ago`;
};
function render(data) {
  const checks = data.checks || [];
  const stale = checks.some((item) => !item.checked_at || Date.now() - new Date(item.checked_at).getTime() > 180000);
  const bad = checks.some((item) => item.status === 'unreachable');
  const allReady = checks.length >= 2 && checks.every((item) => item.status === 'operational');
  const state = stale ? 'unknown' : bad ? 'unreachable' : allReady ? 'operational' : 'unknown';
  $('overall-indicator').className = `status-glyph ${state}`;
  $('overall-title').textContent = stale ? 'Monitoring data is stale' : bad ? 'A website is unreachable' : allReady ? 'Websites responding' : 'Checking endpoints';
  $('overall-description').textContent = stale ? 'The backend has not checked recently. Status cannot be confirmed.' : bad ? 'At least one monitored website failed repeated external checks. An HTTP 403 may be a bot challenge.' : allReady ? 'All monitored websites responded to the latest checks.' : 'Waiting for enough checks to establish status.';
  const latest = checks.reduce((max, item) => item.checked_at && (!max || item.checked_at > max) ? item.checked_at : max, null);
  $('last-update').textContent = formatTime(latest);
  $('last-update-detail').textContent = relative(latest);
  $('services-grid').innerHTML = checks.length ? checks.map((item) => {
    const status = item.status === 'operational' ? 'operational' : item.status === 'unreachable' ? 'unreachable' : 'unknown';
    const label = status === 'operational' ? 'RESPONDING' : status === 'unreachable' ? 'UNREACHABLE' : 'CHECKING';
    const detail = item.error ? item.error : item.http_status ? `HTTP ${item.http_status}` : 'Awaiting result';
    return `<article class="service-card"><div class="card-top"><span class="icon-box">${item.id === 'singtel-home' ? '↗' : '☷'}</span><span class="pill ${status}">${label}</span></div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.url)}</p><div class="card-rule"></div><div class="card-metrics"><span>${escapeHtml(detail)}</span><strong>${formatTime(item.checked_at)}</strong></div></article>`;
  }).join('') : '<p class="empty">Waiting for the first scheduled check.</p>';
  $('event-list').innerHTML = data.events?.length ? data.events.map((event) => `<div class="event"><span class="event-icon ${event.status === 'operational' ? 'operational' : 'unreachable'}">${event.status === 'operational' ? '✓' : '!'}</span><div><strong>${escapeHtml(event.name || event.endpoint_id)} ${event.status === 'operational' ? 'recovered' : 'became unreachable'}</strong><p>Public website · ${event.http_status ? `HTTP ${event.http_status}` : 'Network error'}</p></div><time>${formatTime(event.occurred_at)}</time></div>`).join('') : '<p class="empty">No status changes recorded yet.</p>';
}
function showError(message) {
  $('overall-indicator').className = 'status-glyph unknown';
  $('overall-title').textContent = 'Monitor unavailable';
  $('overall-description').textContent = message;
}
async function refresh() {
  if (!endpoint) { showError('Set STATUS_API_URL in config.js to connect the dashboard to the backend.'); return; }
  try {
    const response = await fetch(`${endpoint}/api/status`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
    render(await response.json());
  } catch (error) { showError(`Could not reach the monitoring API: ${error.message}`); }
}
$('year').textContent = new Date().getFullYear();
const updateClock = () => { $('clock').textContent = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()) + ' SGT'; };
updateClock(); setInterval(updateClock, 30000);
refresh(); setInterval(refresh, 30000);
