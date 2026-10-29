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
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
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
      if (explanation?.status === 'ok' && typeof event?.id === 'string'
        && typeof explanation.data?.summary === 'string') {
        root.setAttribute('data-student-explanation-event', event.id);
        line(`사건 ID: ${event.id}`);
        line(explanation.data.summary);
        if (typeof checkedAt === 'string') line(`확인 시각: ${checkedAt}`);
      } else if (explanation?.status === 'error') {
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
        line(`사건 설명 실패: ${code} · ${message}`);
        line('기록은 그대로입니다');
      } else if (explanation?.status === 'loading') line('사건 설명 요청 중');
      else line('사건 설명은 아직 실행하지 않았습니다');
      return root;
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
