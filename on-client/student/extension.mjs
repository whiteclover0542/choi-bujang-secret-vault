// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
