// DOM 요소 - 로그인
const loginScreen = document.getElementById('loginScreen');
const adminScreen = document.getElementById('adminScreen');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const failCountEl = document.getElementById('failCount');
const logoutBtn = document.getElementById('logoutBtn');

// DOM 요소 - 탭
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// DOM 요소 - 기록
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const userFilterSelect = document.getElementById('userFilter');
const filterBtn = document.getElementById('filterBtn');
const exportBtn = document.getElementById('exportBtn');
const recordsBody = document.getElementById('recordsBody');

// DOM 요소 - 직원
const employeesBody = document.getElementById('employeesBody');

// DOM 요소 - 설정
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordMessage = document.getElementById('passwordMessage');

// DOM 요소 - 비밀번호 재설정 모달
const resetPasswordModal = document.getElementById('resetPasswordModal');
const resetPasswordEmployee = document.getElementById('resetPasswordEmployee');
const newEmployeePasswordInput = document.getElementById('newEmployeePassword');
const confirmEmployeePasswordInput = document.getElementById('confirmEmployeePassword');
const resetPasswordError = document.getElementById('resetPasswordError');
const confirmResetPasswordBtn = document.getElementById('confirmResetPasswordBtn');
const cancelResetPasswordBtn = document.getElementById('cancelResetPasswordBtn');

// DOM 요소 - 수정 모달
const editModal = document.getElementById('editModal');
const editDateInput = document.getElementById('editDate');
const editNameInput = document.getElementById('editName');
const editCheckInInput = document.getElementById('editCheckIn');
const editCheckOutInput = document.getElementById('editCheckOut');
const editBreakInput = document.getElementById('editBreak');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// 상태
let appData = { records: [] };
let facesData = { users: [] };
let settings = { failCount: 0, lockedUntil: null };
let filteredRecords = [];
let editingRecord = null;
let resetPasswordTarget = null;

// XSS 방지: HTML 이스케이프 함수
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// 안전한 텍스트 설정
function setTextContent(element, text) {
  if (element) {
    element.textContent = text;
  }
}

// 초기화
async function init() {
  // DB 연결 확인
  const isConnected = await window.electronAPI.checkDbConnection();
  if (!isConnected) {
    setTextContent(loginError, 'DB 연결 실패 - 인터넷 확인');
    loginError.style.color = '#ef4444';
  }

  settings = await window.electronAPI.loadSettings();
  updateLockStatus();

  // 기본 날짜 설정 (최근 1개월)
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  endDateInput.value = today.toISOString().split('T')[0];
  startDateInput.value = monthAgo.toISOString().split('T')[0];

  setupEventListeners();
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 로그인
  loginBtn.addEventListener('click', login);
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
  logoutBtn.addEventListener('click', logout);

  // 탭
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 기록 필터
  filterBtn.addEventListener('click', loadRecords);
  exportBtn.addEventListener('click', exportToExcel);

  // 설정
  changePasswordBtn.addEventListener('click', changePassword);

  // 수정 모달
  saveEditBtn.addEventListener('click', saveEdit);
  cancelEditBtn.addEventListener('click', closeModal);

  // 비밀번호 재설정 모달
  confirmResetPasswordBtn.addEventListener('click', confirmResetPassword);
  cancelResetPasswordBtn.addEventListener('click', closeResetPasswordModal);
}

// 로그인 (서버 측 검증 사용)
async function login() {
  const password = passwordInput.value;

  if (!password) {
    setTextContent(loginError, '비밀번호를 입력하세요.');
    return;
  }

  const result = await window.electronAPI.verifyPassword(password);

  if (result.success) {
    // 로그인 성공
    loginScreen.classList.add('hidden');
    adminScreen.classList.remove('hidden');
    setTextContent(loginError, '');
    setTextContent(failCountEl, '');

    await loadAllData();
    loadRecords();
    loadEmployees();
  } else {
    // 로그인 실패
    setTextContent(loginError, result.message);

    if (result.locked) {
      passwordInput.disabled = true;
      loginBtn.disabled = true;
      // 잠금 해제 타이머
      startLockTimer();
    }

    passwordInput.value = '';
    passwordInput.focus();
  }
}

// 잠금 상태 업데이트
function updateLockStatus() {
  if (settings.lockedUntil) {
    const lockedUntil = new Date(settings.lockedUntil);
    if (lockedUntil > new Date()) {
      const remainingMs = lockedUntil - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      setTextContent(loginError, `계정이 잠겼습니다. ${remainingMin}분 후에 다시 시도하세요.`);
      passwordInput.disabled = true;
      loginBtn.disabled = true;
      startLockTimer();
    }
  }
}

// 잠금 해제 타이머
function startLockTimer() {
  const checkLock = setInterval(async () => {
    settings = await window.electronAPI.loadSettings();
    if (!settings.lockedUntil || new Date(settings.lockedUntil) <= new Date()) {
      passwordInput.disabled = false;
      loginBtn.disabled = false;
      setTextContent(loginError, '잠금이 해제되었습니다.');
      clearInterval(checkLock);
    } else {
      const remainingMs = new Date(settings.lockedUntil) - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      setTextContent(loginError, `계정이 잠겼습니다. ${remainingMin}분 후에 다시 시도하세요.`);
    }
  }, 10000); // 10초마다 확인
}

// 로그아웃
function logout() {
  adminScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  passwordInput.value = '';
  setTextContent(loginError, '');
}

// 모든 데이터 로드
async function loadAllData() {
  appData = await window.electronAPI.loadData();
  facesData = await window.electronAPI.loadFaces();

  // 사용자 필터 업데이트
  updateUserFilter();
}

// 사용자 필터 업데이트 (XSS 방지)
function updateUserFilter() {
  const users = [...new Set(appData.records.map(r => r.userName))].filter(Boolean);

  // 기존 옵션 제거
  while (userFilterSelect.options.length > 1) {
    userFilterSelect.remove(1);
  }

  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user;
    option.textContent = user; // XSS 방지: textContent 사용
    userFilterSelect.appendChild(option);
  });
}

// 탭 전환
function switchTab(tabId) {
  tabBtns.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`${tabId}Tab`).classList.add('active');
}

// 기록 로드
function loadRecords() {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  const userFilter = userFilterSelect.value;

  filteredRecords = appData.records.filter(record => {
    if (startDate && record.date < startDate) return false;
    if (endDate && record.date > endDate) return false;
    if (userFilter && record.userName !== userFilter) return false;
    return true;
  });

  renderRecords();
}

// 기록 렌더링 (XSS 방지)
function renderRecords() {
  // 기존 내용 제거
  recordsBody.innerHTML = '';

  if (filteredRecords.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'empty-state';
    td.textContent = '기록이 없습니다';
    tr.appendChild(td);
    recordsBody.appendChild(tr);
    return;
  }

  filteredRecords.forEach((record, index) => {
    const workMins = calculateWorkMinutes(record);
    const workTime = formatDuration(workMins);

    const tr = document.createElement('tr');

    // 날짜
    const tdDate = document.createElement('td');
    tdDate.textContent = record.date;
    tr.appendChild(tdDate);

    // 이름
    const tdName = document.createElement('td');
    tdName.textContent = record.userName || '-';
    tr.appendChild(tdName);

    // 출근
    const tdCheckIn = document.createElement('td');
    tdCheckIn.textContent = record.checkIn || '-';
    tr.appendChild(tdCheckIn);

    // 퇴근
    const tdCheckOut = document.createElement('td');
    tdCheckOut.textContent = record.checkOut || '-';
    tr.appendChild(tdCheckOut);

    // 휴식
    const tdBreak = document.createElement('td');
    tdBreak.textContent = record.totalBreakMinutes || 0;
    tr.appendChild(tdBreak);

    // 실근무
    const tdWork = document.createElement('td');
    tdWork.textContent = workTime;
    tr.appendChild(tdWork);

    // 수정 버튼
    const tdEdit = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '수정';
    editBtn.addEventListener('click', () => openEditModal(index));
    tdEdit.appendChild(editBtn);
    tr.appendChild(tdEdit);

    recordsBody.appendChild(tr);
  });
}

// 근무시간 계산
function calculateWorkMinutes(record) {
  if (!record.checkIn || !record.checkOut) return 0;

  const [inH, inM] = record.checkIn.split(':').map(Number);
  const [outH, outM] = record.checkOut.split(':').map(Number);

  let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  return Math.max(0, totalMinutes - (record.totalBreakMinutes || 0));
}

// 시간 포맷
function formatDuration(minutes) {
  if (minutes === 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분`;
}

// 수정 모달 열기
function openEditModal(index) {
  const record = filteredRecords[index];
  editingRecord = {
    date: record.date,
    userName: record.userName
  };

  editDateInput.value = record.date;
  editNameInput.value = record.userName;
  editCheckInInput.value = record.checkIn || '';
  editCheckOutInput.value = record.checkOut || '';
  editBreakInput.value = record.totalBreakMinutes || 0;

  editModal.classList.remove('hidden');
}

// 모달 닫기
function closeModal() {
  editModal.classList.add('hidden');
  editingRecord = null;
}

// 수정 저장
async function saveEdit() {
  if (!editingRecord) return;

  const updatedRecord = {
    date: editingRecord.date,
    userName: editingRecord.userName,
    checkIn: editCheckInInput.value || null,
    checkOut: editCheckOutInput.value || null,
    totalBreakMinutes: parseInt(editBreakInput.value) || 0
  };

  await window.electronAPI.saveRecord(updatedRecord);

  // 로컬 데이터 업데이트
  const recordIndex = appData.records.findIndex(
    r => r.date === editingRecord.date && r.userName === editingRecord.userName
  );
  if (recordIndex !== -1) {
    appData.records[recordIndex] = { ...appData.records[recordIndex], ...updatedRecord };
  }

  closeModal();
  loadRecords();
}

// 직원 로드 (XSS 방지)
function loadEmployees() {
  // 기존 내용 제거
  employeesBody.innerHTML = '';

  if (facesData.users.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'empty-state';
    td.textContent = '등록된 직원이 없습니다';
    tr.appendChild(td);
    employeesBody.appendChild(tr);
    return;
  }

  facesData.users.forEach((user, index) => {
    const date = new Date(user.registeredAt).toLocaleDateString('ko-KR');

    const tr = document.createElement('tr');

    // 이름
    const tdName = document.createElement('td');
    tdName.textContent = user.name;
    tr.appendChild(tdName);

    // 등록일
    const tdDate = document.createElement('td');
    tdDate.textContent = date;
    tr.appendChild(tdDate);

    // 얼굴 샘플
    const tdSamples = document.createElement('td');
    tdSamples.textContent = `${user.descriptors.length}개`;
    tr.appendChild(tdSamples);

    // 비밀번호 재설정 버튼
    const tdReset = document.createElement('td');
    const resetBtn = document.createElement('button');
    resetBtn.className = 'edit-btn';
    resetBtn.textContent = '비밀번호';
    resetBtn.addEventListener('click', () => openResetPasswordModal(user.name));
    tdReset.appendChild(resetBtn);
    tr.appendChild(tdReset);

    // 삭제 버튼
    const tdDelete = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', () => deleteEmployee(user.name));
    tdDelete.appendChild(deleteBtn);
    tr.appendChild(tdDelete);

    employeesBody.appendChild(tr);
  });
}

// 비밀번호 재설정 모달 열기
function openResetPasswordModal(name) {
  resetPasswordTarget = name;
  resetPasswordEmployee.textContent = `${name}님`;
  newEmployeePasswordInput.value = '';
  confirmEmployeePasswordInput.value = '';
  resetPasswordError.textContent = '';
  resetPasswordModal.classList.remove('hidden');
  newEmployeePasswordInput.focus();
}

// 비밀번호 재설정 모달 닫기
function closeResetPasswordModal() {
  resetPasswordModal.classList.add('hidden');
  resetPasswordTarget = null;
  newEmployeePasswordInput.value = '';
  confirmEmployeePasswordInput.value = '';
  resetPasswordError.textContent = '';
}

// 비밀번호 재설정 확인
async function confirmResetPassword() {
  if (!resetPasswordTarget) return;

  const newPassword = newEmployeePasswordInput.value;
  const confirmPassword = confirmEmployeePasswordInput.value;

  if (!newPassword || newPassword.length < 4) {
    resetPasswordError.textContent = '비밀번호는 4자리 이상이어야 합니다.';
    return;
  }

  if (newPassword !== confirmPassword) {
    resetPasswordError.textContent = '비밀번호가 일치하지 않습니다.';
    return;
  }

  const result = await window.electronAPI.resetEmployeePassword(resetPasswordTarget, newPassword);

  if (result.success) {
    closeResetPasswordModal();
    alert(`${resetPasswordTarget}님의 비밀번호가 재설정되었습니다.`);
  } else {
    resetPasswordError.textContent = result.message;
  }
}

// 직원 삭제
async function deleteEmployee(name) {
  if (!confirm(`"${name}" 직원을 삭제하시겠습니까?\n\n주의: 얼굴 데이터만 삭제되며, 출퇴근 기록은 유지됩니다.`)) {
    return;
  }

  await window.electronAPI.deleteFace(name);

  // 로컬 데이터 업데이트
  facesData.users = facesData.users.filter(u => u.name !== name);
  loadEmployees();
}

// 비밀번호 변경 (서버 측 검증 사용)
async function changePassword() {
  const current = currentPasswordInput.value;
  const newPass = newPasswordInput.value;
  const confirm = confirmPasswordInput.value;

  passwordMessage.className = 'message';

  if (!current) {
    setTextContent(passwordMessage, '현재 비밀번호를 입력하세요.');
    passwordMessage.classList.add('error');
    return;
  }

  if (!newPass) {
    setTextContent(passwordMessage, '새 비밀번호를 입력하세요.');
    passwordMessage.classList.add('error');
    return;
  }

  if (newPass !== confirm) {
    setTextContent(passwordMessage, '새 비밀번호가 일치하지 않습니다.');
    passwordMessage.classList.add('error');
    return;
  }

  const result = await window.electronAPI.changePassword(current, newPass);

  setTextContent(passwordMessage, result.message);
  passwordMessage.classList.add(result.success ? 'success' : 'error');

  if (result.success) {
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
  }
}

// 엑셀 저장
async function exportToExcel() {
  if (filteredRecords.length === 0) {
    alert('저장할 기록이 없습니다.');
    return;
  }

  const result = await window.electronAPI.exportExcel(filteredRecords);

  if (result.success) {
    alert(`엑셀 파일이 저장되었습니다.\n${result.path}`);
  } else if (result.error) {
    alert(`저장 실패: ${result.error}`);
  }
}

// 앱 시작
init();
