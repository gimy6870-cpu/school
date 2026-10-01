(() => {
  const STORAGE_KEY = 'dorm-score-helper-v2';
  const LEGACY_STORAGE_KEY = 'dorm-score-helper-v1';
  const createEmptyProfile = () => ({ baseline: 0, records: [] });
  const $ = (selector) => document.querySelector(selector);
  const tabButtons = [...document.querySelectorAll('.tab')];
  const panels = [...document.querySelectorAll('.panel')];
  const officialRulesUrl = 'https://school.busanedu.net/upload/bbs/files/2026/hgschl/bmt-h/ntt/1003821/04/32ba0343dc3079b425bf8faa4c0c5be7.pdf';
  const ruleGroups = [
    {
      reference: '생활관 운영 규정',
      penalties: Array.from({ length: 43 }, (_, index) => {
        const itemNumber = index + 1;
        if (itemNumber <= 9) return '선도위 회부';
        if (itemNumber <= 11) return '벌점 8점';
        if (itemNumber <= 17) return '벌점 7점';
        if (itemNumber <= 28) return '벌점 5점';
        if (itemNumber <= 34) return '벌점 4점';
        return '벌점 3점';
      }),
      rules: [
        '사감의 징계 지도에 불응 및 거부, 반항',
        '불량 써클 조직 및 결성',
        '휴대폰 불법 촬영 및 유포 행위',
        '생활관 시설 및 비품 고의적 훼손, 파손',
        '사감 지시 및 지도에 반항 (언행 및 태도)',
        '불법 게시물 부착, 무허가 집회',
        '호실 내 흉기 소지',
        '외부인 무단 숙식 제공',
        '생활관 내 이성 친구 무단출입',
        '사칭행위 및 수칙위반 망을 봐줌 (관망 포함)',
        '무단외박, 무단외출, 무단 호실잔류, 무단 귀사, 점호 불참, 무단 하급생 호실 출입, 무단호실 변경 사용',
        '동·하급생에게 부당한 지시 (빨래, 심부름 등)',
        '모든 전열 기구, 화기 소지 및 사용',
        '타 호실 취침자 및 취침 제공자, 호실 비밀번호 유출',
        '창문 및 담을 넘는 행위',
        '마스터 비밀번호 설정 위반 행위',
        '불법 장치 설치 및 휴대폰 공기계 제출',
        '사감의 정당한 지도에 불응',
        '호실 내 사행성 놀이 (카드류, 동전 등)',
        '타인의 학생증 사용 및 타인 우편물 수취',
        '정당성 없는 귀사일의 외박 신청, 귀사시간 연장',
        '일과 중 허락 없는 생활관 출입',
        '허락 없는 외부인 출입 제공',
        '반입금지 물품 반입',
        '취침 시 휴대폰 사용 및 야간 취침 방해',
        '음식물 호실 내 반입 및 취식 행위',
        '취침 시간 이후 호실 출입문 잠금 (개방 이중 잠김)',
        '호실 청소상태 불량',
        '남의 물건을 허락 없이 사용하는 행위',
        '열람실 및 다중이용시설 분위기 저해',
        '물품 판매 행위 및 허위사실 유포',
        '음란물 소지 (서적, 컴퓨터 등 매체에 저장)',
        '외출·외박의 행선지, 목적 위반',
        '쓰레기 등 각종 오물 건물 밖 투척',
        '등교 및 귀사시간 미준수',
        '등교 복장 위반',
        '소등 위반 및 취침 시간 미준수',
        '호실 내 지나친 놀이, 장난으로 소음 유발',
        '스텝의 업무에 비협조 및 방해하는 행위',
        '생활관 부대시설 이용 수칙 미준수',
        '등교 및 귀가 시 호실 문단속 미준수',
        '샤워실 및 세면 시 복도를 알몸으로 이동',
        '등교 및 외출 시 슬리퍼 착용 (우천 시 슬리퍼 착용 포함)'
      ]
    }
  ];
  const dormRules = ruleGroups.flatMap((group, groupIndex) => group.rules.map((text, index) => ({
    id: `${groupIndex}-${index}`,
    reference: group.reference,
    text,
    penalty: group.penalties?.[index] || '',
    source: '2026학년도 부산기계공업고등학교 규정집'
  })));

  function normalizeProfile(profile) {
    if (!profile || typeof profile !== 'object') return createEmptyProfile();
    const baseline = Number.isInteger(Number(profile.baseline)) && Number(profile.baseline) >= 0 ? Number(profile.baseline) : 0;
    const records = Array.isArray(profile.records) ? profile.records.filter((item) =>
      item && typeof item.id === 'string' && typeof item.title === 'string' &&
      Number.isInteger(item.points) && item.points > 0 && typeof item.date === 'string'
    ) : [];
    return { baseline, records };
  }

  function loadStore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object' && saved.profiles && typeof saved.profiles === 'object') {
        const profiles = {};
        for (const [key, profile] of Object.entries(saved.profiles)) profiles[key] = normalizeProfile(profile);
        return { profiles, legacy: null };
      }
    } catch {
      // Fall through to the previous local-only data format, if present.
    }

    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
      return { profiles: {}, legacy: legacy ? normalizeProfile(legacy) : null };
    } catch {
      return { profiles: {}, legacy: null };
    }
  }

  const store = loadStore();
  let state = createEmptyProfile();
  let currentProfileKey = null;

  function saveState() {
    if (!currentProfileKey) return;
    try {
      store.profiles[currentProfileKey] = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profiles: store.profiles }));
      if (store.legacy) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        store.legacy = null;
      }
    } catch {
      window.alert('브라우저 저장 공간을 사용할 수 없습니다. 이 브라우저에서는 기록이 저장되지 않을 수 있어요.');
    }
  }

  function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  function renderRecords() {
    if (!currentProfileKey) return;
    const list = $('#record-list');
    const empty = $('#empty-records');
    const sorted = [...state.records].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const total = state.baseline + state.records.reduce((sum, item) => sum + item.points, 0);
    $('#total-score').textContent = String(total);
    $('#baseline-score').value = String(state.baseline);
    $('#record-count').textContent = `${state.records.length}건`;
    list.replaceChildren();
    empty.hidden = sorted.length > 0;

    for (const item of sorted) {
      const row = document.createElement('div');
      row.className = 'record-row';
      const date = document.createElement('div');
      date.className = 'record-date';
      date.textContent = formatDate(item.date);
      const detail = document.createElement('div');
      detail.className = 'record-detail';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const dateText = document.createElement('span');
      dateText.textContent = item.date.replaceAll('-', '.') + ' 기록';
      detail.append(title, dateText);
      const points = document.createElement('span');
      points.className = 'record-points';
      points.textContent = `+${item.points}점`;
      const remove = document.createElement('button');
      remove.className = 'delete-record';
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `${item.title} 기록 삭제`);
      remove.addEventListener('click', () => {
        state.records = state.records.filter((record) => record.id !== item.id);
        saveState();
        renderRecords();
      });
      row.append(date, detail, points, remove);
      list.append(row);
    }
  }

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const identityDorm = $('#identity-dorm');
  const identityLine = $('#identity-line');
  const identityLineField = $('#identity-line-field');

  function updateDormLineVisibility() {
    const isEastDorm = identityDorm.value === '동관';
    identityLineField.hidden = !isEastDorm;
    identityLine.disabled = !isEastDorm;
    identityLine.required = isEastDorm;
    if (!isEastDorm) identityLine.value = '';
  }

  identityDorm.addEventListener('change', updateDormLineVisibility);
  updateDormLineVisibility();

  $('#identity-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#identity-name').value.trim().replace(/\s+/g, ' ');
    const room = $('#identity-room').value.trim().replace(/\s+/g, ' ').replace(/\s*호$/i, '').trim();
    const dorm = identityDorm.value;
    const line = dorm === '동관' ? identityLine.value : '';
    if (!name || !room || !dorm || (dorm === '동관' && !line)) return;

    const normalizedName = name.replace(/\s/g, '').toLocaleLowerCase('ko-KR');
    const normalizedRoom = room.replace(/\s/g, '').toLocaleLowerCase('ko-KR');
    const roomLabel = `${dorm}${line ? ` ${line}` : ''} · ${room}호`;
    const normalizedLocation = roomLabel.replace(/\s/g, '').toLocaleLowerCase('ko-KR');
    currentProfileKey = JSON.stringify([normalizedName, normalizedLocation]);
    const legacyRoomKeys = [normalizedRoom, `${normalizedRoom}호`];
    const legacyProfileKey = legacyRoomKeys
      .map((legacyRoom) => JSON.stringify([normalizedName, legacyRoom]))
      .find((key) => store.profiles[key]);

    if (store.profiles[currentProfileKey]) {
      state = store.profiles[currentProfileKey];
    } else if (legacyProfileKey) {
      state = store.profiles[legacyProfileKey];
      delete store.profiles[legacyProfileKey];
    } else if (store.legacy) {
      state = store.legacy;
    } else {
      state = createEmptyProfile();
    }

    $('#active-identity').textContent = `${name} · ${roomLabel}`;
    $('#identity-gate').hidden = true;
    $('#score-content').hidden = false;
    saveState();
    renderRecords();
  });

  $('#switch-identity').addEventListener('click', () => {
    currentProfileKey = null;
    state = createEmptyProfile();
    $('#score-content').hidden = true;
    $('#identity-gate').hidden = false;
    $('#identity-name').value = '';
    identityDorm.value = '';
    identityLine.value = '';
    updateDormLineVisibility();
    $('#identity-room').value = '';
    $('#identity-name').focus();
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selectedPanel = button.dataset.panel;
      for (const tab of tabButtons) {
        const active = tab === button;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      }
      for (const panel of panels) {
        const active = panel.id === `panel-${selectedPanel}`;
        panel.hidden = !active;
        panel.classList.toggle('hidden', !active);
      }
    });
  });

  $('#record-date').value = localDateString(new Date());
  $('#record-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = $('#record-title').value.trim();
    const points = Number($('#record-points').value);
    const date = $('#record-date').value;
    if (!title || !Number.isInteger(points) || points < 1 || points > 100 || !date) return;
    state.records.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, points, date });
    saveState();
    renderRecords();
    $('#record-title').value = '';
    $('#record-points').value = '';
    $('#record-title').focus();
  });

  $('#save-baseline').addEventListener('click', () => {
    const value = Number($('#baseline-score').value);
    if (!Number.isInteger(value) || value < 0 || value > 10000) {
      window.alert('0점 이상의 숫자를 입력해 주세요.');
      return;
    }
    state.baseline = value;
    saveState();
    renderRecords();
  });

  const reviewForm = $('#review-form');
  const reviewResult = $('#review-result');
  const resultContent = $('#result-content');
  const ruleSearch = $('#rule-search');
  const ruleList = $('#rule-list');
  const ruleCount = $('#rule-count');
  let selectedRuleId = '';
  let clipboardText = '';

  function selectRule(rule) {
    selectedRuleId = rule.id;
    const penaltyText = rule.penalty ? ` · 규정표: ${rule.penalty}` : '';
    $('#rule-text').value = `${rule.reference}${penaltyText}: ${rule.text}`;
    $('#selected-rule-text').textContent = rule.text;
    const selectedPenalty = $('#selected-rule-penalty');
    selectedPenalty.hidden = !rule.penalty;
    selectedPenalty.textContent = rule.penalty ? `규정표 표기: ${rule.penalty}` : '';
    $('#selected-rule-source').textContent = `${rule.reference} · ${rule.source}`;
    ruleSearch.setCustomValidity('');
    ruleSearch.removeAttribute('aria-invalid');
    for (const option of ruleList.querySelectorAll('.rule-option')) {
      const selected = option.dataset.ruleId === selectedRuleId;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    }
  }

  function renderRuleList() {
    const query = ruleSearch.value.trim().toLocaleLowerCase('ko-KR');
    const filtered = dormRules.filter((rule) =>
      `${rule.reference} ${rule.text} ${rule.penalty}`.toLocaleLowerCase('ko-KR').includes(query)
    );
    ruleList.replaceChildren();
    ruleCount.textContent = `${filtered.length}개 항목`;

    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'rule-empty';
      empty.textContent = '검색어와 일치하는 규정이 없어요.';
      ruleList.append(empty);
      return;
    }

    const heading = document.createElement('h4');
    heading.className = 'rule-group-heading';
    heading.textContent = '생활관 운영 규정';
    ruleList.append(heading);

    for (const rule of filtered) {
      const option = document.createElement('button');
      option.className = 'rule-option';
      option.type = 'button';
      option.dataset.ruleId = rule.id;
      option.setAttribute('aria-pressed', String(rule.id === selectedRuleId));
      option.classList.toggle('selected', rule.id === selectedRuleId);
      const meta = document.createElement('span');
      meta.className = 'rule-option-meta';
      if (rule.penalty) {
        const penalty = document.createElement('span');
        penalty.className = 'rule-penalty';
        penalty.textContent = rule.penalty;
        meta.append(penalty);
      }
      const text = document.createElement('span');
      text.className = 'rule-option-text';
      text.textContent = rule.text;
      option.append(meta, text);
      option.addEventListener('click', () => selectRule(rule));
      ruleList.append(option);
    }
  }

  ruleSearch.addEventListener('input', renderRuleList);
  renderRuleList();

  function addResultSection(heading, content, className = '') {
    const section = document.createElement('section');
    section.className = `result-section ${className}`.trim();
    const title = document.createElement('h4');
    title.textContent = heading;
    const text = document.createElement('p');
    text.textContent = content;
    section.append(title, text);
    resultContent.append(section);
  }

  function polishForTeacher(value) {
    const replacements = [
      [/아니었(?:어|음|다)$/u, '아니었습니다'],
      [/이었(?:어|음|다)$/u, '이었습니다'],
      [/였(?:어|음|다)$/u, '였습니다'],
      [/했(?:어요|어|음|다)$/u, '했습니다'],
      [/왔(?:어요|어|음|다)$/u, '왔습니다'],
      [/갔(?:어요|어|음|다)$/u, '갔습니다'],
      [/썼(?:어요|어|음|다)$/u, '썼습니다'],
      [/늦었(?:어요|어|음|다)$/u, '늦었습니다'],
      [/됐(?:어요|어|음|다)$/u, '됐습니다'],
      [/않았(?:어|음|다)$/u, '않았습니다'],
      [/있음$/u, '있습니다'],
      [/없음$/u, '없습니다'],
      [/됨$/u, '됐습니다'],
      [/옴$/u, '왔습니다'],
      [/감$/u, '갔습니다'],
      [/씀$/u, '썼습니다'],
      [/했는데$/u, '했는데요'],
      [/했지만$/u, '했지만요'],
      [/하는데$/u, '하는데요'],
      [/거야$/u, '겁니다'],
      [/아니야$/u, '아닙니다'],
      [/이야$/u, '입니다'],
      [/해야 함$/u, '해야 합니다'],
      [/않는다$/u, '않습니다'],
      [/한다$/u, '합니다'],
      [/간다$/u, '갑니다'],
      [/온다$/u, '옵니다'],
      [/본다$/u, '봅니다'],
      [/준다$/u, '줍니다'],
      [/가다$/u, '갑니다'],
      [/오다$/u, '옵니다'],
      [/보다$/u, '봅니다'],
      [/주다$/u, '줍니다'],
      [/하다$/u, '합니다'],
      [/(지각|불참|사용|취식|반입|귀사|외출|외박|출입|청소|훼손|파손)$/u, '$1했습니다'],
      [/된다$/u, '됩니다'],
      [/있다$/u, '있습니다'],
      [/없다$/u, '없습니다'],
      [/아니다$/u, '아닙니다'],
      [/이다$/u, '입니다'],
      [/했음$/u, '했습니다'],
      [/었음$/u, '었습니다'],
      [/았음$/u, '았습니다'],
      [/함$/u, '했습니다'],
      [/임$/u, '입니다'],
      [/음$/u, '었습니다'],
      [/다$/u, '습니다'],
      [/해$/u, '합니다'],
      [/어$/u, '습니다']
    ];
    const normalized = value.trim()
      .replace(/(^|[\s,])나는(?=[\s,.!?]|$)/gu, '$1저는')
      .replace(/(^|[\s,])난(?=[\s,.!?]|$)/gu, '$1저는')
      .replace(/(^|[\s,])내가(?=[\s,.!?]|$)/gu, '$1제가')
      .replace(/(^|[\s,])나도(?=[\s,.!?]|$)/gu, '$1저도');

    return normalized
      .split(/(?<=[.!?])\s+|\n+/u)
      .map((part) => {
        const sentence = part.trim();
        if (!sentence) return '';
        const punctuation = sentence.match(/[.!?]+$/u)?.[0] || '.';
        const content = sentence.slice(0, punctuation === '.' && !sentence.endsWith('.') ? undefined : -punctuation.length)
          .split(/,\s*/u)
          .map((clause) => {
            let polished = clause.trim();
            if (!/(?:습니다|ㅂ니다|입니다|아닙니다|세요|해요|예요|이에요|죠|겠습니다)$/u.test(polished)) {
              for (const [pattern, replacement] of replacements) {
                if (pattern.test(polished)) {
                  polished = polished.replace(pattern, replacement);
                  break;
                }
              }
            }
            return polished;
          }).join(', ');
        return `${content}${punctuation}`;
      })
      .join(' ');
  }

  reviewForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedRule = dormRules.find((rule) => rule.id === selectedRuleId);
    const rule = $('#rule-text').value.trim();
    const behavior = polishForTeacher($('#behavior-text').value);
    const facts = polishForTeacher($('#facts-text').value);
    if (!selectedRule) {
      ruleSearch.setCustomValidity('공식 규정 목록에서 검토할 항목을 선택해 주세요.');
      ruleSearch.setAttribute('aria-invalid', 'true');
      ruleSearch.reportValidity();
      return;
    }
    if (!behavior) return;

    const followUp = facts || '추가로 확인할 사실이 있는지 정리해 보세요.';
    const citation = `${selectedRule.source} · ${selectedRule.reference}${selectedRule.penalty ? ` · 규정표 표기: ${selectedRule.penalty}` : ''}`;
    const draft = `안녕하세요, 선생님. 기숙사 생활 규정 적용과 관련해 확인을 부탁드립니다.\n\n제가 확인한 규정은 “${rule}”입니다. 당시 상황을 정중한 표현으로 정리하면 다음과 같습니다. ${behavior}\n\n추가로 말씀드릴 내용이나 확인이 필요한 사항은 다음과 같습니다. ${followUp}\n\n이 상황에 해당 조항이 적용되는 기준과 규정표에 표시된 벌점을 설명해 주실 수 있을까요? 제가 놓친 부분이 있다면 안내해 주시는 내용을 확인하고 개선하겠습니다.`;
    clipboardText = `상담 준비 메모\n\n확인한 규정\n${rule}\n출처: ${citation}\n${officialRulesUrl}\n\n내가 설명한 상황\n${behavior}\n\n추가 사실 또는 확인할 점\n${followUp}\n\n소명 초안\n${draft}\n\n※ 입력한 내용이 실제 사실과 일치하는지 확인하고, 규정의 최신 내용·적용 기준·공식 벌점 기록은 학교에 확인하세요.`;

    resultContent.replaceChildren();
    addResultSection('입력한 규정', rule);
    addResultSection('공식 규정 출처', `${citation}\n${officialRulesUrl}`);
    addResultSection('내가 설명한 상황', behavior);
    addResultSection('추가 사실 / 확인할 점', followUp);
    addResultSection('선생님께 말씀드릴 초안', draft, 'draft');
    reviewResult.hidden = false;
    $('#copy-feedback').textContent = '';
  });

  $('#copy-result').addEventListener('click', async () => {
    if (!clipboardText) return;
    const feedback = $('#copy-feedback');
    try {
      await navigator.clipboard.writeText(clipboardText);
      feedback.textContent = '상담 준비 메모를 복사했어요.';
    } catch {
      feedback.textContent = '복사할 수 없어요. 메모 내용을 선택해 복사해 주세요.';
    }
  });

})();
