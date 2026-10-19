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
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
