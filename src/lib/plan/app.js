import './plan.css';
import { boot } from './client.js';
import { home } from './views-home.js';
import { gantt, gates, scorecard } from './views-plan.js';
import { daily, weekly, kpis, career } from './views-log.js';
import { money, budget, funds, accounts } from './views-money.js';
import { settings, help } from './views-misc.js';

const VIEWS = { home, gantt, gates, scorecard, daily, weekly, kpis, career, money, budget, funds, accounts, settings, help };

/** Red counters on the menu, so neglected pages are visible from anywhere. */
function badges(a) {
  const n = (key) => a.alerts.find((x) => x.key === key)?.n ?? 0;
  const counts = {
    home: a.needs.reduce((s, x) => s + x.n, 0),
    gantt: n('overdue') + n('late') + n('stale') + n('blocked'),
    daily: n('today') + n('missed'),
    weekly: n('weekly'), money: n('tx'), kpis: n('kpi'), career: n('evidence'), funds: n('invest'), gates: n('gates'),
  };
  for (const el of document.querySelectorAll('[data-alert]')) {
    const c = counts[el.dataset.alert] ?? 0;
    let dot = el.querySelector('.dot');
    if (c > 0) {
      if (!dot) { dot = document.createElement('span'); dot.className = 'dot'; el.append(dot); }
      dot.textContent = c > 99 ? '99+' : String(c);
    } else dot?.remove();
  }
}

export function start(view) {
  const render = VIEWS[view] ?? home;
  boot((a, raw) => {
    badges(a);
    return render(a, raw);
  });
}
