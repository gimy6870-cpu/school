(() => {
  const STORAGE_KEY = 'dorm-score-helper-v2';
  const LEGACY_STORAGE_KEY = 'dorm-score-helper-v1';
  const createEmptyProfile = () => ({ baseline: 0, records: [] });
  const $ = (selector) => document.querySelector(selector);
  const tabButtons = [...document.querySelectorAll('.tab')];
  const panels = [...document.querySelectorAll('.panel')];

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

  $('#identity-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#identity-name').value.trim().replace(/\s+/g, ' ');
    const room = $('#identity-room').value.trim().replace(/\s+/g, ' ');
    if (!name || !room) return;

    const normalizedName = name.replace(/\s/g, '').toLocaleLowerCase('ko-KR');
    const normalizedRoom = room.replace(/\s/g, '').toLocaleLowerCase('ko-KR');
    currentProfileKey = JSON.stringify([normalizedName, normalizedRoom]);
    if (store.profiles[currentProfileKey]) {
      state = store.profiles[currentProfileKey];
    } else if (store.legacy) {
      state = store.legacy;
    } else {
      state = createEmptyProfile();
    }

    $('#active-identity').textContent = `${name} · ${room}`;
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
  let clipboardText = '';

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

  reviewForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const rule = $('#rule-text').value.trim();
    const behavior = $('#behavior-text').value.trim();
    const facts = $('#facts-text').value.trim();
    if (!rule || !behavior) return;

    const followUp = facts || '추가로 확인할 사실이 있는지 정리해 보세요.';
    const draft = `안녕하세요, 기숙사 생활 규정 적용과 관련해 확인을 부탁드리고 싶습니다.\n\n제가 확인한 규정은 “${rule}”이고, 당시 상황은 다음과 같습니다. ${behavior}\n\n추가로 말씀드릴 내용은 다음과 같습니다. ${followUp}\n\n이 상황에 해당 조항이 적용되는 기준과 벌점 사유를 설명해 주실 수 있을까요? 제가 놓친 부분이 있다면 안내를 듣고 개선하겠습니다.`;
    clipboardText = `상담 준비 메모\n\n확인한 규정\n${rule}\n\n내가 설명한 상황\n${behavior}\n\n추가 사실 또는 확인할 점\n${followUp}\n\n소명 초안\n${draft}\n\n※ 입력한 내용이 실제 사실과 일치하는지 확인하고, 최신 규정 및 공식 벌점 기록은 학교에 확인하세요.`;

    resultContent.replaceChildren();
    addResultSection('입력한 규정', rule);
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
