// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView({ api, onChange } = {}) {
  // PC 실측은 이 탭의 메모리에만 보관합니다. 제공 카드와 별도 조회이며 자동 실행하지 않습니다.
  let pc = { status: 'idle' }, pcGeneration = 0, pcPending = false, dashboardHost = null;
  let freshnessTimer = null;
  const pcHistory = [];
  const pcTime = (value) => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  const finite = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const percent = (value) => finite(value) && value <= 100;
  const gib = (value) => `${(value / 1024 ** 3).toFixed(1)} GiB`;
  const metricNames = { cpu: 'CPU', memory: '메모리', disk: '디스크 여유', firewall: 'Windows 방화벽' };
  function pcMetric(key, metric) {
    const missing = { value: '확인 불가', state: 'unknown', note: '응답의 값이나 단위를 확인할 수 없습니다.', percent: null };
    if (metric?.state !== 'ok') {
      return { ...missing, note: ({ permission_denied: '읽기 권한이 없습니다.', timeout: '조회 시간이 초과됐습니다.', unsupported: '지원하지 않는 항목입니다.' })[metric?.reason] ?? '이번 조회에서 값을 읽지 못했습니다.' };
    }
    if (key === 'cpu' && percent(metric.usagePercent)) return {
      value: `${metric.usagePercent.toFixed(1)}%`, percent: metric.usagePercent,
      state: metric.usagePercent >= 85 ? 'attention' : 'measured',
      note: metric.usagePercent >= 85 ? '짧은 표본의 사용률이 높습니다. 실행 중인 앱을 확인하세요.' : '짧은 구간의 사용률입니다. 안전 판정이 아닙니다.',
    };
    if ((key === 'memory' || key === 'disk') && finite(metric.totalBytes) && metric.totalBytes > 0) {
      const amount = key === 'memory' ? metric.usedBytes : metric.freeBytes;
      if (!finite(amount) || amount > metric.totalBytes) return missing;
      const ratio = amount / metric.totalBytes * 100;
      const attention = key === 'memory' ? ratio >= 85 : ratio < 10;
      return { value: `${ratio.toFixed(1)}%${key === 'disk' ? ' 여유' : ' 사용'}`, percent: key === 'memory' ? ratio : null,
        state: attention ? 'attention' : 'measured', note: `${gib(amount)} / ${gib(metric.totalBytes)}${attention ? key === 'memory' ? ' · 사용량이 높습니다.' : ' · 남은 공간이 적습니다.' : ''}` };
    }
    if (key === 'firewall' && Array.isArray(metric.profiles) && metric.profiles.length === 3
      && ['Domain', 'Private', 'Public'].every(name => metric.profiles.filter(p => p?.name === name && typeof p.enabled === 'boolean').length === 1)) {
      const enabled = metric.profiles.filter(p => p.enabled).length;
      return { value: `${enabled} / 3 켜짐`, percent: null, state: enabled === 3 ? 'measured' : 'attention',
        note: metric.profiles.map(p => `${p.name}: ${p.enabled ? '켜짐' : '꺼짐'}`).join(' · ') };
    }
    return missing;
  }
  function rememberPc(status, note, metrics = null, measuredAt = null) {
    pcHistory.push({ at: Date.now(), measuredAt, status, note, metrics });
    if (pcHistory.length > 30) pcHistory.shift();
  }
  function updateDashboard() {
    const focusKey = document.activeElement?.getAttribute?.('data-aegis-control');
    if (dashboardHost?.isConnected) {
      const old = dashboardHost;
      old.replaceWith(drawDashboard());
      if (focusKey) dashboardHost.querySelector(`[data-aegis-control="${focusKey}"]`)?.focus({ preventScroll: true });
    } else if (typeof onChange === 'function') onChange();
  }
  async function readPc() {
    if (pcPending) return;
    const own = ++pcGeneration;
    pcPending = true;
    clearTimeout(freshnessTimer);
    pc = { status: 'loading' };
    updateDashboard();
    try {
      if (typeof api?.get !== 'function') throw Error('unsupported');
      const result = await api.get('/api/pc/status');
      if (own !== pcGeneration) return;
      if (result?.ok !== true) throw Error(result?.error?.code === 'NOT_ALLOWED' ? 'unsupported' : 'failed');
      const data = result.data;
      const measured = typeof data?.measuredAt === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(data.measuredAt) ? Date.parse(data.measuredAt) : NaN;
      if (data?.schema !== 'aleph.on.pc-status.v1' || data.source !== 'local-pc' || !Number.isFinite(measured)
        || Math.abs(Date.now() - measured) > 60000) throw Error('unverified');
      const metrics = Object.fromEntries(Object.keys(metricNames).map(key => [key, pcMetric(key, data.metrics?.[key])]));
      const partial = Object.values(metrics).some(item => item.state === 'unknown');
      pc = { status: 'ok', measuredAt: measured, metrics };
      rememberPc(partial ? '부분 결과' : '실측 성공', partial ? '읽지 못한 항목이 있습니다.' : '네 항목의 실측값을 확인했습니다.', metrics, measured);
      freshnessTimer = setTimeout(updateDashboard, Math.max(1, measured + 60001 - Date.now()));
      freshnessTimer?.unref?.();
    } catch (error) {
      if (own !== pcGeneration) return;
      const note = error.message === 'unsupported' ? '학생 PC 조회 API를 사용할 수 없습니다.'
        : error.message === 'unverified' ? '실측 출처·시각을 확인할 수 없거나 60초 이상 지난 응답입니다.' : '이번 조회에 실패했습니다. 앱 실행 상태를 확인한 뒤 직접 다시 조회하세요.';
      pc = { status: 'error', note };
      rememberPc('조회 실패', note);
    } finally {
      pcPending = false;
      updateDashboard();
    }
  }
  function cancelPc() {
    if (!pcPending || pc.status !== 'loading') return;
    ++pcGeneration;
    pc = { status: 'cancelled', note: '조회 화면을 취소했습니다. 늦은 응답은 표시하지 않습니다.' };
    rememberPc('조회 취소', pc.note);
    updateDashboard();
  }
  function drawDashboard() {
    const root = document.createElement('section');
    root.setAttribute('data-aegis-dashboard', 'local-pc');
    dashboardHost = root;
    const node = (tag, text, parent = root, className = '') => {
      const el = document.createElement(tag);
      if (text != null) el.textContent = text;
      if (className) el.className = className;
      parent.appendChild(el);
      return el;
    };
    node('h3', '이지스 · 내 PC 실측 대시보드');
    node('p', '학생이 추가한 실측 요약·추이·기록입니다. 아래 제공 기능과 별도로 조회합니다. 예시 값은 사용하지 않습니다.', root, 'muted');
    const controls = node('div', null, root, 'row');
    for (const [label, key, action, disabled] of [
      ['PC 실측 조회', 'read', readPc, pcPending],
      ['조회 화면 취소', 'cancel', cancelPc, !pcPending || pc.status !== 'loading'],
    ]) {
      const button = node('button', label, controls, 'btn');
      button.type = 'button'; button.disabled = disabled;
      button.setAttribute('data-aegis-control', key);
      button.addEventListener('click', action);
    }
    const stale = pc.status === 'ok' && Date.now() - pc.measuredAt > 60000;
    const current = pc.status === 'ok' && !stale;
    const status = node('p', current ? `실측 시각: ${pcTime(pc.measuredAt)} (한국 시간)`
      : stale ? '마지막 실측이 60초 이상 지났습니다. 현재 값은 확인 불가입니다. 직접 다시 조회하세요.'
      : ({ idle: '조회 전 · 자동 조회하지 않습니다.', loading: '실측 조회 중 · 이전 값을 현재 카드에 표시하지 않습니다.' })[pc.status] ?? pc.note);
    status.setAttribute('role', 'status');
    const cards = node('div', null, root, 'row');
    const stateText = { measured: '실측', attention: '주의', unknown: '확인 불가' };
    for (const [key, title] of Object.entries(metricNames)) {
      const card = node('article', null, cards, 'card');
      card.setAttribute('data-aegis-metric', key);
      node('h4', title, card);
      const metric = current ? pc.metrics[key] : { value: '확인 불가', state: 'unknown', note: pc.status === 'idle' ? '아직 조회하지 않았습니다.' : '현재 조회 결과가 없습니다.' };
      node('strong', metric.value, card);
      node('p', stateText[metric.state], card);
    }
    const notes = node('details');
    node('summary', '항목별 실측 근거와 안내', notes);
    for (const [key, title] of Object.entries(metricNames)) {
      node('p', `${title}: ${current ? pc.metrics[key].note : '현재 조회 결과가 없습니다.'}`, notes);
    }
    node('p', '주의 기준: CPU 85% 이상, 메모리 85% 이상, 디스크 여유 10% 미만, 방화벽 일부 꺼짐. 편의를 위한 표시이며 침해·전체 안전 판정이 아닙니다.', root, 'muted');
    node('h4', 'CPU·메모리 추이 · 실제 수집한 조회만');
    node('p', '가로축: 조회 시각 · 세로축: 사용률 0~100%. CPU는 청록, 메모리는 보라입니다. 실패·취소·확인 불가 구간은 연결하지 않습니다.', root, 'muted');
    const svgNode = (tag, attributes, parent, text = null) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, String(value));
      if (text != null) el.textContent = text;
      parent.appendChild(el);
      return el;
    };
    const samples = pcHistory.filter(row => row.metrics);
    if (samples.length === 0) node('p', '아직 그래프에 표시할 실측값이 없습니다.');
    else {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [key, value] of Object.entries({ viewBox: '0 0 640 200', width: '100%', height: '200', role: 'img', 'aria-label': '실측 CPU와 메모리 사용률 추이. 수치는 아래 조회 기록에서도 확인할 수 있습니다.' })) svg.setAttribute(key, value);
      root.appendChild(svg);
      const graphFont = (document.defaultView?.innerWidth ?? 1280) < 600 ? 24 : 12;
      const first = pcHistory[0].at, span = Math.max(1, pcHistory.at(-1).at - first);
      const x = row => 70 + (row.at - first) / span * 528;
      const y = value => 158 - value * 1.3;
      for (const value of [0, 50, 100]) {
        svgNode('line', { x1: 70, x2: 598, y1: y(value), y2: y(value), stroke: '#cbd5e1' }, svg);
        svgNode('text', { x: 4, y: y(value) + 4, fill: '#475569', 'font-size': graphFont }, svg, `${value}%`);
      }
      for (const [key, color] of [['cpu', '#0e7490'], ['memory', '#7e22ce']]) {
        let previous = null;
        for (const row of pcHistory) {
          const value = row.metrics?.[key]?.percent;
          if (!percent(value)) { previous = null; continue; }
          const point = { x: x(row), y: y(value) };
          if (previous) svgNode('line', { x1: previous.x, y1: previous.y, x2: point.x, y2: point.y, stroke: color, 'stroke-width': 2 }, svg);
          svgNode('circle', { cx: point.x, cy: point.y, r: 3, fill: color }, svg);
          previous = point;
        }
      }
      svgNode('text', { x: 70, y: 188, fill: '#475569', 'font-size': graphFont }, svg, new Date(first).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }));
      svgNode('text', { x: 598, y: 188, fill: '#475569', 'font-size': graphFont, 'text-anchor': 'end' }, svg, new Date(pcHistory.at(-1).at).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }));
    }
    node('h4', `최근 조회 기록 · ${pcHistory.length} / 30회`);
    node('p', '과거 기록입니다. 이 탭의 메모리에만 보관하고 새로고침하면 지워집니다. 제공 카드에서 한 조회는 여기에 누적하지 않습니다.', root, 'muted');
    if (pcHistory.length === 0) node('p', '아직 조회 기록이 없습니다.');
    else {
      const details = node('details');
      node('summary', '시각·결과·수치 기록 펼치기', details);
      const list = node('ol', null, details);
      for (const row of [...pcHistory].reverse()) {
        const item = node('li', `${pcTime(row.at)} · ${row.status}`, list);
        node('p', row.note, item);
        if (row.metrics) {
          node('p', `실측 시각: ${pcTime(row.measuredAt)}`, item, 'muted');
          node('p', `CPU ${row.metrics.cpu.value} · 메모리 ${row.metrics.memory.value}`, item);
        }
      }
    }
    return root;
  }
  return {
    renderIdentity({ me, devices, sessions }) {
      const root = document.createElement('section');
      const deviceStates = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
      const sessionStates = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
      const value = (input) => input == null || input === '' ? '확인 불가' : String(input);
      const line = (parent, text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        parent.appendChild(paragraph);
      };
      const device = (parent, item) => line(parent,
        `기기: ${value(item?.label)} · ID: ${value(item?.id)} · 상태: ${deviceStates[item?.status] ?? '확인 불가'} (${value(item?.status)})`);
      const session = (parent, item) => line(parent,
        `세션 ID: ${value(item?.id)} · 상태: ${sessionStates[item?.status] ?? '확인 불가'} (${value(item?.status)})`);

      for (const [title, resource, render] of [
        ['현재 계정·기기·세션', me, (parent, data) => {
          line(parent, `사용자: ${value(data?.user?.label)} · ID: ${value(data?.user?.id)}`);
          device(parent, data?.device);
          session(parent, data?.session);
        }],
        ['기기 목록', devices, (parent, data) => {
          if (!Array.isArray(data)) return line(parent, '확인 불가');
          if (data.length === 0) return line(parent, '기기 목록이 비어 있습니다.');
          for (const item of data) device(parent, item);
        }],
        ['세션 목록', sessions, (parent, data) => {
          if (!Array.isArray(data)) return line(parent, '확인 불가');
          if (data.length === 0) return line(parent, '세션 목록이 비어 있습니다.');
          for (const item of data) session(parent, item);
        }],
      ]) {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = title;
        section.appendChild(heading);
        const modeText = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' }[resource?.mode];
        if (modeText) line(section, modeText);
        if (resource?.status === 'loading') line(section, '불러오는 중');
        else if (resource?.status === 'error') line(section, `연결 실패: ${value(resource.error?.message)}`);
        else if (resource?.status === 'ok') render(section, resource.data);
        else line(section, '확인 불가');
        root.appendChild(section);
      }
      return root;
    },
    renderDecision({ status, mode, data, error, appId }) {
      const root = document.createElement('section');
      const line = (text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        root.appendChild(paragraph);
      };
      const value = (input) => input == null || input === '' ? '확인 불가' : String(input);
      const modeText = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' }[mode];
      if (modeText) line(modeText);
      if (status === 'idle') {
        line('앱을 골라 접속을 요청하세요');
      } else if (status === 'loading') {
        line(`업무 앱 ID: ${value(appId)}`);
        line('판정 확인 중');
      } else if (status === 'error') {
        line(`업무 앱 ID: ${value(appId)}`);
        line(`요청 실패: ${value(error?.message)}`);
        line('요청 실패는 접근 거부 판정이 아닙니다. 접근 허용 여부를 확인할 수 없습니다.');
      } else if (status === 'ok') {
        const decisions = {
          allow: '접근 허용',
          deny: '접근 거부',
          challenge: '추가 인증 또는 확인 필요',
          unknown: '판정 확인 불가',
        };
        const decision = Object.hasOwn(decisions, data?.decision) ? data.decision : 'unknown';
        line(`업무 앱 ID: ${value(data?.appId ?? appId)}`);
        line(`${decisions[decision]} (${decision})`);
        line(`판정 이유: ${value(data?.reason)}`);
        line(`판정 시각: ${value(data?.checkedAt)}`);
        if (decision === 'allow') line('정책상 접근 허용이며 실제 앱 접속 성공을 보장하지 않습니다.');
        if (decision === 'challenge') line('이 앱은 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
        if (decision === 'unknown') line('접근 허용 여부를 확인할 수 없습니다.');
      } else {
        line('요청 상태 확인 불가. 접근 허용 여부를 확인할 수 없습니다.');
      }
      return root;
    },
    renderEvents({ status, mode, data, error }) {
      const root = document.createElement('section');
      const element = (tag, text, parent) => {
        const node = document.createElement(tag);
        if (text != null) node.textContent = text;
        if (parent) parent.appendChild(node);
        return node;
      };
      const value = (input) => input == null || input === '' ? '확인 불가' : String(input);
      const modeText = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' }[mode];
      if (modeText) element('p', modeText, root);
      if (status === 'loading') {
        element('p', '기록을 불러오는 중', root);
        return root;
      }
      if (status === 'error') {
        element('p', `기록을 불러오지 못했습니다: ${value(error?.message)}`, root);
        if (error?.code === 'CONTRACT_MISMATCH') element('p', '확인 불가 (CONTRACT_MISMATCH)', root);
        return root;
      }
      if (status !== 'ok' || !Array.isArray(data)) {
        element('p', '기록 확인 불가', root);
        return root;
      }
      const events = [...data].sort((a, b) => {
        const time = (at) => Number.isFinite(Date.parse(at)) ? Date.parse(at) : -Infinity;
        const left = time(a.at);
        const right = time(b.at);
        return left === right ? 0 : left > right ? -1 : 1;
      });
      if (events.length === 0) {
        element('p', '표시할 기록이 없습니다', root);
        return root;
      }
      const kindNames = { access: '접속 기록', xdr: 'XDR 경보' };
      const stateNames = {
        access: { allowed: '접근 허용', denied: '접근 거부', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const filters = [];
      for (const [name, read] of [
        ['기록 종류', (event) => event.kind],
        ['업무 앱', (event) => event.appId],
        ['접속 상태', (event) => event.state?.access],
      ]) {
        const label = element('label', name, root);
        const select = element('select', null, label);
        select.setAttribute('aria-label', name);
        element('option', '전체', select).value = 'all';
        for (const original of new Set(events.map(read).filter((item) => typeof item === 'string' && item !== ''))) {
          const description = name === '기록 종류' ? kindNames[original]
            : name === '접속 상태' ? stateNames.access[original] : null;
          element('option', description ? `${description} (${original})` : original, select).value = original;
        }
        select.value = 'all';
        filters.push({ select, read });
      }
      const count = element('p', null, root);
      const list = element('ul', null, root);
      const detail = element('section', null, root);
      const showDetail = (event) => {
        detail.textContent = '';
        detail.setAttribute('data-student-event-detail', String(event.id));
        element('h3', `${value(event.id)} 상세`, detail);
        element('p', `사건 ID: ${value(event.id)}`, detail);
        element('p', `업무 앱 ID: ${value(event.appId)}`, detail);
        for (const [title, items] of [['근거', event.evidence], ['규칙', event.rules]]) {
          element('h4', title, detail);
          if (!Array.isArray(items) || items.length === 0) element('p', `${title} 정보 없음`, detail);
          else for (const item of items) element('p', `ID: ${value(item.id)} · ${value(item.text)}`, detail);
        }
        for (const [key, title] of [['access', '접속 상태'], ['session', '세션 상태'], ['device', '기기 상태']]) {
          const original = event.state?.[key];
          const names = stateNames[key];
          const description = Object.hasOwn(names, original) ? names[original] : '확인 불가';
          element('p', `${title}: ${description}(${value(original)})`, detail);
        }
        if (Array.isArray(event.supportedActions) && event.supportedActions.length > 0) {
          element('p', '조치 실행 연결은 준비 중입니다', detail);
          for (const action of event.supportedActions) {
            const button = element('button', `${action} 미지원`, detail);
            button.type = 'button';
            button.disabled = true;
          }
        }
      };
      const draw = () => {
        list.textContent = '';
        detail.textContent = '';
        detail.removeAttribute('data-student-event-detail');
        const shown = events.filter((event) => filters.every(({ select, read }) => select.value === 'all' || read(event) === select.value));
        count.textContent = `표시 건수: ${shown.length} / 받은 기록: ${events.length}`;
        if (shown.length === 0) element('li', '표시할 기록이 없습니다', list);
        for (const event of shown) {
          const row = element('li', null, list);
          row.setAttribute('data-student-event-id', String(event.id));
          const kind = Object.hasOwn(kindNames, event.kind) ? kindNames[event.kind] : '종류 확인 불가';
          element('p', `사건 ID: ${value(event.id)} · 시각: ${value(event.at)} · 종류: ${kind} (${value(event.kind)}) · 업무 앱 ID: ${value(event.appId)} · 요약: ${value(event.summary)}`, row);
          const button = element('button', `${event.id} 상세`, row);
          button.type = 'button';
          button.addEventListener('click', () => showDetail(event));
        }
      };
      for (const { select } of filters) select.addEventListener('change', draw);
      draw();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode }) {
      const root = document.createElement('section');
      root.appendChild(drawDashboard());
      const element = (tag, text, parent = root) => {
        const node = document.createElement(tag);
        if (text != null) node.textContent = text;
        parent.appendChild(node);
        return node;
      };
      const value = (input) => typeof input === 'string' && input !== '' ? input : '확인 불가';
      const showMode = (parent, input) => {
        const labels = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
        if (Object.hasOwn(labels, input)) element('p', labels[input], parent);
      };
      const failure = (parent, title, error) => {
        const timeout = /timeout/i.test(error?.code ?? '') || /시간\s*초과/i.test(error?.message ?? '');
        element('p', `${title}를 불러오지 못했습니다${timeout ? ' (시간 초과)' : ''}: ${value(error?.message)}`, parent);
        element('p', '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요', parent);
      };
      showMode(root, mode);
      for (const [title, resource, empty, labels] of [
        ['기기 정보', devices, '등록된 기기가 없습니다', { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' }],
        ['세션 정보', sessions, '현재 연결이 없습니다', { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' }],
      ]) {
        const section = element('section');
        element('h3', title, section);
        showMode(section, resource?.mode);
        if (title === '세션 정보') element('p', '세션 조회 범위는 현재 검증된 연결 하나입니다. 과거 세션 전체 목록이 아닙니다.', section);
        if (resource?.status === 'loading') element('p', `${title} 불러오는 중`, section);
        else if (resource?.status === 'error') failure(section, title, resource.error);
        else if (resource?.status === 'ok' && Array.isArray(resource.data)) {
          if (resource.data.length === 0) element('p', empty, section);
          for (const item of resource.data) {
            const description = Object.hasOwn(labels, item.status) ? labels[item.status] : '확인 불가';
            const name = title === '기기 정보' ? `기기: ${value(item.label)} · ID: ${value(item.id)}` : `세션 ID: ${value(item.id)}`;
            element('p', `${name} · 상태: ${description} (${value(item.status)})`, section);
          }
        } else element('p', `${title} 확인 불가`, section);
      }
      const alerts = element('section');
      element('h3', '알림', alerts);
      if (!Array.isArray(notifications)) element('p', '알림 확인 불가', alerts);
      else if (notifications.length === 0) element('p', '주의할 알림이 없습니다', alerts);
      else for (const item of notifications) element('p', `자료: ${value(item.resource)} · 코드: ${value(item.code)} · ${value(item.message)}`, alerts);

      const diagnostic = element('section');
      element('h3', '진단 정보', diagnostic);
      showMode(diagnostic, diagnostics?.mode);
      let helpText = '';
      if (diagnostics?.status === 'loading') element('p', '진단 정보 불러오는 중', diagnostic);
      else if (diagnostics?.status === 'error') failure(diagnostic, '진단 정보', diagnostics.error);
      else if (diagnostics?.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object' && !Array.isArray(diagnostics.data)) {
        const input = diagnostics.data;
        const safe = {
          requestId: value(input.requestId), component: value(input.component),
          version: value(input.version), checkedAt: value(input.checkedAt),
          engine: { mode: value(input.engine?.mode), code: value(input.engine?.code) },
        };
        helpText = JSON.stringify(safe, null, 2);
        element('pre', helpText, diagnostic);
      } else {
        element('p', '진단 정보 확인 불가', diagnostic);
        element('p', '위쪽 연결 점검의 도움정보 불러오기를 직접 누르세요', diagnostic);
      }
      element('p', '도움정보는 도움 요청에 사용할 진단 정보입니다. 버튼을 누를 때만 복사합니다.', diagnostic);
      const copy = element('button', '도움정보 복사', diagnostic);
      copy.type = 'button';
      copy.disabled = !helpText;
      const result = element('p', '', diagnostic);
      result.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        if (!helpText) return;
        try {
          await navigator.clipboard.writeText(helpText);
          result.textContent = '도움정보를 복사했습니다';
        } catch {
          result.textContent = '도움정보를 복사하지 못했습니다. 표시된 진단 정보를 직접 선택해 복사하세요';
        }
      });
      return root;
    },
    renderVulnerabilities({ status, mode, data, error }) {
      const root = document.createElement('section');
      const element = (tag, text, parent = root) => {
        const node = document.createElement(tag);
        if (text != null) node.textContent = text;
        parent.appendChild(node);
        return node;
      };
      const modes = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modes, mode)) element('p', modes[mode]);
      if (status === 'idle') {
        element('p', '패키지 조회 전(idle)');
        return root;
      }
      if (status === 'loading') {
        element('p', '패키지 조회 중(loading)');
        return root;
      }
      if (status === 'error') {
        // 제공 UI가 전달한 안전한 안내만 사용하고 비밀 표기가 있는 원문은 표시하지 않습니다.
        const message = typeof error?.message === 'string'
          && !/Bearer\s|sk-|ghp_|eyJ|PRIVATE KEY/i.test(error.message)
          ? error.message : '패키지 조회 결과를 확인할 수 없습니다';
        element('p', `조회 실패: ${message}`);
        element('p', '조회 실패는 취약점 없음이 아닙니다. 제공 화면에서 직접 다시 조회하세요.');
        return root;
      }
      const scanLabels = {
        complete: '모두 조회', partial: '일부 조회 실패', not_checked: '아직 조회 안 함',
        not_configured: '조회 준비 미완료', unverifiable: 'lock 파일 확인 불가',
      };
      if (status !== 'ok' || !Object.hasOwn(scanLabels, data?.status) || !Array.isArray(data.packages)) {
        element('p', '패키지 조회 결과 확인 불가. 취약점 없음으로 판단할 수 없습니다.');
        return root;
      }
      element('p', `${scanLabels[data.status]}(${data.status})`);
      if (data.status === 'not_configured') element('p', '조회 대상 프로젝트 설정이 필요합니다. 대상 경로와 허용 패키지는 운영자가 준비합니다.');
      if (data.status === 'not_checked') element('p', '승인된 공개 조회 대상이 없어 조회하지 않았습니다. 취약점 없음이 아닙니다.');
      if (data.status === 'unverifiable') element('p', '잠금 파일 또는 설치 목록을 확인할 수 없어 취약점 여부를 판단할 수 없습니다.');
      for (const key of ['lockfileVersion', 'lockfileHash', 'checkedAt']) {
        if (data[key] != null) element('p', `${key}: ${data[key]}`);
      }
      if (data.packages.length === 0) element('p', '표시할 패키지 조회 결과가 없습니다.');
      else {
        const table = element('table');
        element('caption', '정확한 설치 버전별 OSV 조회 결과', table);
        const header = element('tr', null, element('thead', null, table));
        for (const title of ['패키지', '설치 버전', '조회 상태', '출처', '조회 시각', '취약점 ID · 수정 시각']) {
          element('th', title, header).setAttribute('scope', 'col');
        }
        const body = element('tbody', null, table);
        const packageLabels = { known_vulnerabilities: '알려진 항목 있음', none_found: '알려진 항목 없음(조회 범위 기준)', unverifiable: '조회 확인 불가' };
        for (const pkg of data.packages) {
          const row = element('tr', null, body);
          row.setAttribute('data-student-package-name', pkg.name);
          row.setAttribute('data-student-package-version', pkg.version);
          element('td', pkg.name, row);
          element('td', pkg.version, row);
          const findings = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities : [];
          const description = pkg.status === 'unverifiable' && findings.length > 0
            ? '일부 확인·전체 조회 확인 불가' : packageLabels[pkg.status] ?? '조회 확인 불가';
          element('td', `${description} (${pkg.status})`, row);
          element('td', pkg.source, row);
          element('td', pkg.checkedAt, row);
          const cell = element('td', null, row);
          for (const finding of findings) element('p', `${finding.id} — 수정 시각: ${finding.modified}`, cell);
          if (findings.length === 0) element('p', pkg.status === 'none_found'
            ? '조회 범위에서 알려진 항목이 없습니다.' : '표시할 취약점 ID가 없으며 조회 상태를 확인해야 합니다.', cell);
        }
      }
      element('p', 'OSV는 알려진 취약점 데이터베이스입니다. 조회 범위에서 항목이 없더라도 패키지나 앱 전체의 안전을 보장하지 않습니다.');
      return root;
    },
    renderAiConnection({ status, mode, data, error, checkedAt }) {
      const root = document.createElement('section');
      const line = (text) => {
        const node = document.createElement('p');
        node.textContent = text;
        root.appendChild(node);
      };
      const modes = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      if (Object.hasOwn(modes, mode)) line(modes[mode]);
      if (status === 'idle') line('AI 연결 점검 전');
      else if (status === 'loading') line('AI 연결 점검 중');
      else if (status === 'ok' && data?.transportChecked === true
        && ['test', 'verified'].includes(data.audienceAuthorization)) {
        line(data.audienceAuthorization === 'test' ? '시험 연결 점검(test)' : '앱 권한 확인 후 점검(verified)');
        line(`모델 수: ${Number.isInteger(data.modelCount) && data.modelCount >= 0 ? data.modelCount : '확인 불가'}`);
        line(`점검 시각: ${typeof checkedAt === 'string' ? checkedAt : '확인 불가'}`);
        line('사건 설명은 아직 실행하지 않았습니다');
      } else if (status === 'error') {
        const guidance = {
          ON_AI_PROVISIONING_PENDING: '권한 준비 중입니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.',
          WB_CLCO_AUTH_REQUIRED: '인증 실패. 계정 연결을 다시 확인하고 담당자에게 확인하세요.',
          WB_CLCO_ACCESS_BLOCKED: '접근 제한. 담당자에게 앱 이용 권한을 확인하세요.',
          WB_CLCO_COHORT_BUDGET_EXHAUSTED: '반 사용량이 소진됐습니다. 담당자에게 확인하세요.',
          WB_CLCO_LIMIT_REACHED: '이용 한도에 도달했습니다. 담당자에게 확인하세요.',
          WB_CLCO_SESSION_CLOSED: '현재 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
          WB_CLCO_RATE_LIMITED: '요청 제한. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_TIMEOUT: '시간 초과. 잠시 뒤 직접 다시 점검하세요.',
          REQUEST_TIMEOUT: '시간 초과. 잠시 뒤 직접 다시 점검하세요.',
          ENGINE_TIMEOUT: '시간 초과. 잠시 뒤 직접 다시 점검하세요.',
          TIMEOUT: '시간 초과. 잠시 뒤 직접 다시 점검하세요.',
          WB_CLCO_CANCELLED: '취소됨. 이전 결과는 현재 결과가 아닙니다.',
          CANCELLED: '취소됨. 이전 결과는 현재 결과가 아닙니다.',
          REQUEST_CANCELLED: '취소됨. 이전 결과는 현재 결과가 아닙니다.',
          MODEL_NOT_CONFIGURED: '사용할 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
          ON_AI_MODEL_LIST_EMPTY: '사용할 모델이 없습니다. 담당자에게 모델 허용 설정을 확인하세요.',
          ON_AI_AUTHORIZATION_CHANGED: '권한이 변경됐습니다. 담당자에게 현재 권한을 확인하세요.',
          SUBJECT_SCOPE_UNVERIFIED: '계정 연결 확인 불가. 담당자에게 계정과 앱 권한을 확인하세요.',
          AI_REQUEST_UNVERIFIED: '연결·네트워크 또는 응답 확인 불가. 담당자에게 확인하거나 잠시 뒤 직접 다시 점검하세요.',
        };
        const code = Object.hasOwn(guidance, error?.code) ? error.code : 'AI_REQUEST_UNVERIFIED';
        // 제공 UI가 정제한 메시지만 사용하며, 알려지지 않은 원문 오류는 표시하지 않습니다.
        const message = code === error?.code && typeof error.message === 'string'
          && !/Bearer\s|sk-|ghp_|eyJ|PRIVATE KEY/i.test(error.message) ? error.message : 'AI 점검 결과를 확인할 수 없습니다';
        line(`AI 연결 점검 실패: ${code} · ${message}`);
        line(guidance[code]);
      } else line('AI 연결 점검 결과 확인 불가');
      line('다시 점검하려면 현재 API 연결 점검 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.');
      return root;
    },
    renderExplanation({ event, explanation, checkedAt }) {
      const root = document.createElement('section');
      const line = (text) => {
        const node = document.createElement('p');
        node.textContent = text;
        root.appendChild(node);
      };
      if (explanation?.status === 'error') {
        const codes = ['ON_AI_PROVISIONING_PENDING', 'WB_CLCO_AUTH_REQUIRED', 'WB_CLCO_ACCESS_BLOCKED',
          'WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_RATE_LIMITED', 'WB_CLCO_LIMIT_REACHED',
          'WB_CLCO_SESSION_CLOSED', 'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT',
          'WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED', 'MODEL_NOT_CONFIGURED',
          'ON_AI_AUTHORIZATION_CHANGED', 'ON_AI_MODEL_LIST_EMPTY', 'SUBJECT_SCOPE_UNVERIFIED',
          'ON_AI_INVALID_INPUT', 'ON_AI_INVALID_OUTPUT', 'AI_REQUEST_UNVERIFIED'];
        const known = codes.includes(explanation.error?.code);
        const code = known ? explanation.error.code : 'AI_REQUEST_UNVERIFIED';
        const input = explanation.error?.message;
        const message = known && typeof input === 'string' && !/Bearer\s|sk-|ghp_|eyJ|PRIVATE KEY/i.test(input)
          ? input : '사건 설명을 확인할 수 없습니다';
        line(`AI 설명 실패: ${code} · ${message}`);
        if (code === 'ON_AI_INVALID_INPUT') line('설명에 필요한 사건 근거·규칙을 확인할 수 없습니다.');
        if (code === 'ON_AI_INVALID_OUTPUT') line('응답의 근거·조치·형식을 확인할 수 없습니다. 이미 실행했다고 답한 설명도 사용할 수 없습니다.');
        line('기록은 그대로입니다. AI 설명 실패는 과제 불합격 판정이 아닙니다.');
        return root;
      }
      if (!event) {
        line('보안 기록에서 기록을 먼저 고르세요');
        return root;
      }
      if (explanation?.status === 'loading') {
        line(`사건 ID: ${event.id}`);
        line('사건 설명 요청 중');
        return root;
      }
      if (explanation?.status !== 'ok') {
        line('사건 설명은 아직 실행하지 않았습니다');
        return root;
      }
      const data = explanation.data;
      const failure = (reason) => {
        line(`AI 설명 확인 불가: ON_AI_INVALID_OUTPUT · ${reason}`);
        line('기록은 그대로입니다');
        return root;
      };
      if (data?.executed === true) return failure('AI가 이미 실행했다고 답한 설명은 사용할 수 없습니다.');
      if (!data || typeof event.id !== 'string' || typeof data.summary !== 'string'
        || !data.summary.trim() || !Array.isArray(data.evidenceIds) || !Array.isArray(data.proposals)
        || !Array.isArray(event.evidence) || !Array.isArray(event.rules) || !Array.isArray(event.supportedActions)
        || data.requiresHumanConfirmation !== true || data.executed !== false) {
        return failure('설명에 필요한 자료 또는 미실행·사람 확인 조건을 확인할 수 없습니다.');
      }
      const evidence = new Map(event.evidence.map((item) => [item.id, item.text]));
      const matches = (ids) => Array.isArray(ids) && ids.length > 0 && new Set(ids).size === ids.length
        && ids.every((id) => evidence.has(id) && typeof evidence.get(id) === 'string');
      if (!matches(data.evidenceIds) || data.evidenceIds.length !== evidence.size) {
        return failure('근거가 부족하거나 근거 ID가 현재 기록과 맞지 않아 설명을 사용할 수 없습니다.');
      }
      if (data.proposals.some((proposal) => !proposal || !event.supportedActions.includes(proposal.action)
        || typeof proposal.reason !== 'string' || !matches(proposal.evidenceIds))) {
        return failure('제안의 조치 또는 근거가 현재 기록과 맞지 않습니다.');
      }
      root.setAttribute('data-student-explanation-event', event.id);
      line(`사건 ID: ${event.id}`);
      line('AI 설명(참고용)');
      line(data.summary);
      line('AI 설명은 해석입니다. 사실 판단은 아래 근거와 연동 시스템의 상태를 기준으로 합니다.');
      if (typeof checkedAt === 'string') line(`확인 시각: ${checkedAt}`);
      line('인용한 근거');
      for (const id of data.evidenceIds) line(`${id} — ${evidence.get(id)}`);
      line('규칙');
      if (event.rules.length === 0) line('규칙 정보 없음');
      for (const rule of event.rules) line(`${rule.id} — ${rule.text}`);
      line('확인 불가 상태');
      let unknownCount = 0;
      for (const [key, label] of [['access', '접속'], ['session', '세션'], ['device', '기기']]) {
        if (event.state?.[key] === 'unknown') {
          line(`${label}: 확인 불가(unknown)`);
          unknownCount++;
        }
      }
      if (unknownCount === 0) line('없음');
      line('조치 제안');
      if (data.proposals.length === 0) {
        line(event.supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상)'
          : 'AI가 제안한 조치가 없습니다');
      }
      for (const proposal of data.proposals) {
        line(`조치: ${proposal.action} — ${proposal.reason}`);
        for (const id of proposal.evidenceIds) line(`제안 근거: ${id} — ${evidence.get(id)}`);
        line('사람 확인이 필요하며 실행되지 않았습니다');
      }
      line('AI 설명·제안만으로 보안 조치가 실행되지는 않습니다.');
      return root;
    },
    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error }) {
      const root = document.createElement('section');
      const line = (text) => {
        const node = document.createElement('p');
        node.textContent = text;
        root.appendChild(node);
      };
      // 제공 UI가 검증한 공개 값만 표시하며 확인 티켓이나 객체 전체는 출력하지 않습니다.
      const safeText = (value) => typeof value === 'string' && value.trim() !== ''
        && !/Bearer\s|sk-|ghp_|eyJ|PRIVATE KEY|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(value);
      const field = (label, value) => {
        if (safeText(value) || typeof value === 'number' && Number.isFinite(value)) line(`${label}: ${value}`);
      };
      const labels = {
        idle: '아직 미실행(idle)',
        loading: '조치 준비 또는 결과 조회 중(loading). 결과는 아직 확인되지 않았습니다.',
        prepared: '준비됨·미실행(prepared). 실제 대상과 조치를 사람이 확인해야 합니다.',
        executing: '서버에 전달 중(executing). 결과는 아직 확인되지 않았습니다.',
        pending: '서버 접수·처리 중(pending). ACK는 접수 응답이며, 실제 효과와 처리 결과는 아직 확인되지 않았습니다.',
        denied: '거절(denied)',
        failed: '실패(failed)',
        unknown: '결과 불명(unknown)',
        expired: '확인 기한 지남(expired). 제공 화면에서 다시 준비하고 대상을 확인하세요.',
        error: '요청 처리 안 됨(error)',
      };
      const confirmed = status === 'succeeded' && observation?.effectApplied === true;
      const uncertain = status === 'unknown' || status === 'succeeded' && !confirmed || !Object.hasOwn(labels, status) && status !== 'succeeded';
      if (confirmed) {
        line('효과 확인(succeeded)');
        field('관측 시각', observation.observedAt);
        line('effectApplied: true');
      } else if (uncertain) {
        line('결과 불명(unknown)');
        if (status === 'succeeded') line('받은 상태: succeeded. 실제 효과 확인 조건을 충족하지 못했습니다.');
      } else line(labels[status]);
      if (uncertain) line('성공이나 효과 없음으로 판단하지 마세요. 제공 화면의 「연동 시스템 결과만 재조회」로 결과만 직접 재조회하세요.');
      if (safeText(event?.id)) {
        root.setAttribute('data-student-action-event', event.id);
        field('사건 ID', event.id);
      }
      if (Array.isArray(event?.evidence)) {
        for (const evidence of event.evidence) field('근거 ID', evidence.id);
      }
      field('조치 ID', actionId);
      field('실제 대상 ID', target?.id);
      field('대상 세대(generation)', target?.generation);
      if (safeText(receipt?.requestId)) {
        root.setAttribute('data-student-action-request', receipt.requestId);
        field('요청 ID(requestId)', receipt.requestId);
      }
      field('접수 ID(receiptId)', receipt?.receiptId);
      field('결과 버전(version)', receipt?.version);
      if (receipt?.replayed === true) line('동일 요청의 기존 처리 결과입니다. 집행 요청을 반복하지 말고 결과만 재조회하세요.');
      if (status === 'prepared') field('확인 기한', confirmationExpiresAt);
      if (safeText(message)) line(message);
      const errorCodes = ['ACTION_UNSUPPORTED', 'ACTION_DENIED', 'ACTION_CONFIRMATION_EXPIRED',
        'ACTION_CONFIRMATION_INVALID', 'ACTION_SCOPE_CHANGED', 'ACTION_SCOPE_UNVERIFIED',
        'SUBJECT_SCOPE_UNVERIFIED', 'ACTION_SNAPSHOT_CHANGED', 'ACTION_EVENT_UNAVAILABLE',
        'ACTION_TIMEOUT', 'ACTION_STORE_FAILED', 'ACTION_RESULT_UNVERIFIED'];
      if (error) {
        const known = errorCodes.includes(error.code);
        line(`오류 코드: ${known ? error.code : 'ACTION_RESULT_UNVERIFIED'}`);
        line(known && safeText(error.message) ? error.message : '조치 요청 또는 결과를 확인할 수 없습니다.');
      }
      if (Array.isArray(event?.supportedActions) && event.supportedActions.length === 0) {
        line('연동 시스템이 지원하는 조치가 없어 조치 준비 버튼이 없는 것이 정상입니다.');
      }
      line('AI 조치 제안은 집행이 아닙니다. 사람 확인과 요청 전송은 제공 화면의 버튼으로만 진행합니다.');
      line('「조치 화면 취소」는 화면의 진행을 취소하며, 이미 서버에 전달된 조치 효과를 되돌리지 않습니다.');
      return root;
    },
  };
}
