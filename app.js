/**
 * MyToDoList - Collaborative To-Do List Application
 * Powered by Firebase Authentication & Cloud Firestore
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

import { getFirebaseConfig, saveFirebaseConfig, resetFirebaseConfig } from './config.js';

// Application State
const state = {
  config: getFirebaseConfig(),
  auth: null,
  db: null,
  currentUser: null,
  lists: [],
  activeListId: null,
  activeList: null,
  tasks: [],
  filter: 'all', // 'all' | 'active' | 'completed' | 'assigned-me'
  searchQuery: '',
  unsubLists: null,
  unsubTasks: null,
};

// UI Elements
const el = {
  // Auth
  btnLoginGoogle: document.getElementById('btn-login-google'),
  btnHeroLogin: document.getElementById('btn-hero-login'),
  btnLogout: document.getElementById('btn-logout'),
  userProfileMenu: document.getElementById('user-profile-menu'),
  userAvatar: document.getElementById('user-avatar'),
  userName: document.getElementById('user-name'),
  userEmail: document.getElementById('user-email'),
  loggedOutHero: document.getElementById('logged-out-hero'),
  mainApp: document.getElementById('main-app'),

  // Config Banner & Modal
  configWarningBanner: document.getElementById('config-warning-banner'),
  btnBannerSettings: document.getElementById('btn-banner-settings'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  modalSettings: document.getElementById('modal-settings'),
  formSettings: document.getElementById('form-settings'),
  inputCfgApiKey: document.getElementById('input-cfg-apikey'),
  inputCfgProjectId: document.getElementById('input-cfg-projectid'),
  inputCfgAuthDomain: document.getElementById('input-cfg-authdomain'),
  inputCfgAppId: document.getElementById('input-cfg-appid'),
  btnResetConfig: document.getElementById('btn-reset-config'),

  // Lists Management
  listsContainer: document.getElementById('lists-container'),
  btnOpenCreateList: document.getElementById('btn-open-create-list'),
  modalCreateList: document.getElementById('modal-create-list'),
  formCreateList: document.getElementById('form-create-list'),
  inputListTitle: document.getElementById('input-list-title'),
  inputListDesc: document.getElementById('input-list-desc'),

  // Active List & Actions
  activeListTitle: document.getElementById('active-list-title'),
  activeListDesc: document.getElementById('active-list-desc'),
  activeListBadge: document.getElementById('active-list-badge'),
  activeListActions: document.getElementById('active-list-actions'),
  btnDeleteList: document.getElementById('btn-delete-list'),
  listMembersBar: document.getElementById('list-members-bar'),
  listMembersAvatars: document.getElementById('list-members-avatars'),
  progressBarContainer: document.getElementById('progress-bar-container'),
  tasksProgressBar: document.getElementById('tasks-progress-bar'),
  tasksProgressText: document.getElementById('tasks-progress-text'),

  // Invite Modal
  btnOpenInvite: document.getElementById('btn-open-invite'),
  modalInvite: document.getElementById('modal-invite'),
  formInviteMember: document.getElementById('form-invite-member'),
  inputInviteEmail: document.getElementById('input-invite-email'),
  modalMembersList: document.getElementById('modal-members-list'),

  // Task Input & Form
  addTaskCard: document.getElementById('add-task-card'),
  formAddTask: document.getElementById('form-add-task'),
  inputTaskTitle: document.getElementById('input-task-title'),
  selectTaskPriority: document.getElementById('select-task-priority'),
  inputTaskDueDate: document.getElementById('input-task-duedate'),
  selectTaskAssignee: document.getElementById('select-task-assignee'),

  // Toolbar & Tasks List
  tasksToolbar: document.getElementById('tasks-toolbar'),
  inputSearchTasks: document.getElementById('input-search-tasks'),
  tasksList: document.getElementById('tasks-list'),
  toastContainer: document.getElementById('toast-container'),
};

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    info: 'bg-slate-900 text-white',
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-600 text-white',
  };
  const icons = {
    info: 'fa-circle-info',
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
  };
  toast.className = `${colors[type] || colors.info} px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 pointer-events-auto animate-fade-in transition-all`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]}"></i> <span>${escapeHtml(message)}</span>`;
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Initialize Firebase
 */
function initFirebase() {
  const cfg = state.config;
  const isDefaultDummyKey = cfg.apiKey.includes('DummyKey');

  if (isDefaultDummyKey) {
    el.configWarningBanner.classList.remove('hidden');
  } else {
    el.configWarningBanner.classList.add('hidden');
  }

  try {
    const app = initializeApp(cfg);
    state.auth = getAuth(app);
    state.db = getFirestore(app);

    // Auth State Observer
    onAuthStateChanged(state.auth, handleAuthStateChanged);
  } catch (error) {
    console.error('Firebase initialization error:', error);
    showToast('Firebase 初始化失敗，請檢查設定與 Web API Key', 'error');
  }
}

/**
 * Handle Auth State Change
 */
async function handleAuthStateChanged(user) {
  state.currentUser = user;

  if (user) {
    // Authenticated
    el.btnLoginGoogle.classList.add('hidden');
    el.userProfileMenu.classList.remove('hidden');
    el.userProfileMenu.classList.add('flex');
    el.loggedOutHero.classList.add('hidden');
    el.mainApp.classList.remove('hidden');

    el.userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=6366f1&color=fff`;
    el.userName.textContent = user.displayName || '使用者';
    el.userEmail.textContent = user.email || '';

    // Record user profile in Firestore
    try {
      const userRef = doc(state.db, 'users', user.uid);
      const userDoc = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || '使用者',
        email: user.email || '',
        lastLogin: serverTimestamp()
      };
      if (user.photoURL && user.photoURL.startsWith('http')) {
        userDoc.photoURL = user.photoURL;
      }
      await setDoc(userRef, userDoc, { merge: true });
    } catch (e) {
      console.warn('Could not sync user profile to Firestore:', e);
    }

    // Subscribe to collaborative lists
    subscribeToLists();
  } else {
    // Logged Out
    if (state.unsubLists) { state.unsubLists(); state.unsubLists = null; }
    if (state.unsubTasks) { state.unsubTasks(); state.unsubTasks = null; }

    state.lists = [];
    state.activeListId = null;
    state.activeList = null;
    state.tasks = [];

    el.btnLoginGoogle.classList.remove('hidden');
    el.btnLoginGoogle.classList.add('flex');
    el.userProfileMenu.classList.add('hidden');
    el.loggedOutHero.classList.remove('hidden');
    el.mainApp.classList.add('hidden');
  }
}

/**
 * Google Sign-in Handler
 */
async function handleGoogleSignIn() {
  if (!state.auth) {
    showToast('請先完成 Firebase 設定', 'warning');
    openSettingsModal();
    return;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await signInWithPopup(state.auth, provider);
    showToast('登入成功！', 'success');
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/invalid-api-key') {
      showToast('Firebase 設定無效，請於設定視窗輸入正確的 Web API Key', 'error');
      openSettingsModal();
    } else if (error.code === 'auth/popup-closed-by-user') {
      showToast('登入視窗已關閉', 'info');
    } else {
      showToast(`登入失敗: ${error.message}`, 'error');
    }
  }
}

/**
 * Sign Out Handler
 */
async function handleSignOut() {
  try {
    await signOut(state.auth);
    showToast('已安全登出', 'info');
  } catch (error) {
    console.error('Sign Out Error:', error);
  }
}

/**
 * Subscribe to Lists (Where current user is a member or owner)
 */
function subscribeToLists() {
  if (state.unsubLists) {
    state.unsubLists();
  }

  const userEmail = state.currentUser.email || '';
  const listsRef = collection(state.db, 'lists');

  // Query lists where memberEmails array contains user email
  const q = query(listsRef, where('memberEmails', 'array-contains', userEmail));

  state.unsubLists = onSnapshot(q, (snapshot) => {
    const lists = [];
    snapshot.forEach((docSnap) => {
      lists.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sort by createdAt desc
    lists.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    state.lists = lists;
    renderListsSidebar();

    // If no active list or active list was deleted, select first available list
    if (lists.length > 0) {
      if (!state.activeListId || !lists.find(l => l.id === state.activeListId)) {
        selectList(lists[0].id);
      } else {
        // Update active list data
        state.activeList = lists.find(l => l.id === state.activeListId);
        updateActiveListHeader();
      }
    } else {
      state.activeListId = null;
      state.activeList = null;
      renderEmptyActiveList();
    }
  }, (error) => {
    console.error('Error listening to lists:', error);
    showToast('讀取清單失敗：' + error.message, 'error');
  });
}

/**
 * Render Lists in Left Sidebar
 */
function renderListsSidebar() {
  if (state.lists.length === 0) {
    el.listsContainer.innerHTML = `
      <div class="text-center py-8 px-4 text-slate-400 text-xs space-y-2">
        <i class="fa-regular fa-folder-open text-2xl text-slate-300"></i>
        <p>尚未建立任何清單</p>
        <button id="btn-empty-create" class="text-brand-600 hover:underline font-semibold">
          立即建立第一份清單
        </button>
      </div>
    `;
    const emptyBtn = document.getElementById('btn-empty-create');
    if (emptyBtn) emptyBtn.addEventListener('click', openCreateListModal);
    return;
  }

  el.listsContainer.innerHTML = state.lists.map(list => {
    const isSelected = list.id === state.activeListId;
    const isOwner = list.ownerId === state.currentUser?.uid;
    const memberCount = (list.memberEmails || []).length;

    return `
      <button data-list-id="${list.id}"
        class="list-item-btn w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center justify-between group ${
          isSelected
            ? 'bg-brand-50 border border-brand-200 text-brand-900 shadow-sm'
            : 'hover:bg-slate-50 border border-transparent text-slate-700'
        }">
        <div class="flex items-center space-x-3 truncate">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
            isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
          }">
            <i class="fa-solid fa-list-check"></i>
          </div>
          <div class="truncate">
            <div class="text-xs font-semibold truncate ${isSelected ? 'text-brand-900' : 'text-slate-800'}">
              ${escapeHtml(list.title)}
            </div>
            <div class="text-[11px] text-slate-400 truncate">
              ${isOwner ? '👑 我建立的' : '👥 協作共享'} • ${memberCount} 位成員
            </div>
          </div>
        </div>
        ${isSelected ? '<i class="fa-solid fa-chevron-right text-brand-500 text-xs"></i>' : ''}
      </button>
    `;
  }).join('');

  // Attach click events
  el.listsContainer.querySelectorAll('.list-item-btn').forEach(button => {
    button.addEventListener('click', () => {
      const listId = button.getAttribute('data-list-id');
      selectList(listId);
    });
  });
}

/**
 * Select Active List
 */
function selectList(listId) {
  if (state.activeListId === listId && state.unsubTasks) return;

  state.activeListId = listId;
  state.activeList = state.lists.find(l => l.id === listId);
  renderListsSidebar();
  updateActiveListHeader();
  subscribeToTasks(listId);
}

/**
 * Update Header for the Active List
 */
function updateActiveListHeader() {
  if (!state.activeList) {
    renderEmptyActiveList();
    return;
  }

  const list = state.activeList;
  const isOwner = list.ownerId === state.currentUser?.uid;

  el.activeListTitle.textContent = list.title;
  el.activeListDesc.textContent = list.description || '點擊下方輸入框新增即時待辦事項';
  el.activeListBadge.classList.remove('hidden');
  el.activeListBadge.textContent = isOwner ? '👑 擁有者' : '👥 協作者';
  el.activeListBadge.className = isOwner
    ? 'text-xs font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200'
    : 'text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200';

  el.activeListActions.classList.remove('hidden');
  el.listMembersBar.classList.remove('hidden');
  el.progressBarContainer.classList.remove('hidden');
  el.addTaskCard.classList.remove('hidden');
  el.tasksToolbar.classList.remove('hidden');

  // Render Member Avatars
  const members = list.memberEmails || [];
  el.listMembersAvatars.innerHTML = members.map(email => {
    const initial = email.charAt(0).toUpperCase();
    return `
      <div title="${escapeHtml(email)}" class="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
        ${initial}
      </div>
    `;
  }).join('');

  // Update Assignee Dropdown in Add Task Form
  el.selectTaskAssignee.innerHTML = `<option value="">指派: 未指派</option>` +
    members.map(email => `<option value="${escapeHtml(email)}">${escapeHtml(email)}</option>`).join('');

  // Delete button visibility
  if (isOwner) {
    el.btnDeleteList.classList.remove('hidden');
  } else {
    el.btnDeleteList.classList.add('hidden');
  }
}

function renderEmptyActiveList() {
  el.activeListTitle.textContent = '請選擇或建立清單';
  el.activeListDesc.textContent = '協作待辦事項即時更新';
  el.activeListBadge.classList.add('hidden');
  el.activeListActions.classList.add('hidden');
  el.listMembersBar.classList.add('hidden');
  el.progressBarContainer.classList.add('hidden');
  el.addTaskCard.classList.add('hidden');
  el.tasksToolbar.classList.add('hidden');
  el.tasksList.innerHTML = `
    <div class="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
      請從左側點選待辦清單，或點擊「新增清單」開始協作
    </div>
  `;
}

/**
 * Subscribe to Tasks for Selected List
 */
function subscribeToTasks(listId) {
  if (state.unsubTasks) {
    state.unsubTasks();
  }

  const tasksRef = collection(state.db, 'lists', listId, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'));

  state.unsubTasks = onSnapshot(q, (snapshot) => {
    const tasks = [];
    snapshot.forEach(docSnap => {
      tasks.push({ id: docSnap.id, ...docSnap.data() });
    });

    state.tasks = tasks;
    renderTasks();
    updateTaskStats();
  }, (error) => {
    console.error('Error fetching tasks:', error);
    showToast('讀取任務失敗: ' + error.message, 'error');
  });
}

/**
 * Calculate & Update Progress Stats
 */
function updateTaskStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  el.tasksProgressBar.style.width = `${pct}%`;
  el.tasksProgressText.textContent = total === 0
    ? '尚無任務'
    : `${total} 個任務 • 已完成 ${completed} (${pct}%)`;
}

/**
 * Render Tasks with Filter & Search
 */
function renderTasks() {
  let filtered = [...state.tasks];

  // Status Filter
  if (state.filter === 'active') {
    filtered = filtered.filter(t => !t.completed);
  } else if (state.filter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  } else if (state.filter === 'assigned-me') {
    const userEmail = (state.currentUser?.email || '').toLowerCase();
    filtered = filtered.filter(t => t.assignedTo?.email?.toLowerCase() === userEmail);
  }

  // Search Filter
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.assignedTo?.email && t.assignedTo.email.toLowerCase().includes(q)) ||
      (t.assignedTo?.displayName && t.assignedTo.displayName.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    el.tasksList.innerHTML = `
      <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs space-y-1">
        <i class="fa-solid fa-clipboard-check text-2xl text-slate-300 mb-1 block"></i>
        <span>沒有符合條件的任務</span>
      </div>
    `;
    return;
  }

  const priorityMeta = {
    high: { label: '高優先', bg: 'bg-red-50 text-red-700 border-red-200' },
    medium: { label: '一般', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    low: { label: '低優先', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  el.tasksList.innerHTML = filtered.map(task => {
    const pMeta = priorityMeta[task.priority] || priorityMeta.medium;
    const isCompleted = !!task.completed;
    const assignedEmail = task.assignedTo?.email;
    const createdByName = task.createdBy?.displayName || task.createdBy?.email || '成員';
    const completedByName = task.completedBy?.displayName || task.completedBy?.email;

    return `
      <div data-task-id="${task.id}" class="card-hover bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-3 ${
        isCompleted ? 'task-completed bg-slate-50/70 border-slate-100' : ''
      }">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          <!-- Complete Checkbox -->
          <input type="checkbox" ${isCompleted ? 'checked' : ''} data-action="toggle-complete"
            class="custom-checkbox mt-0.5 shrink-0" title="標記完成狀態">

          <div class="space-y-1.5 min-w-0 flex-1">
            <div class="task-title text-sm font-medium text-slate-900 break-words leading-snug">
              ${escapeHtml(task.title)}
            </div>

            <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <!-- Priority badge -->
              <span class="px-2 py-0.5 rounded font-medium border ${pMeta.bg}">
                ${pMeta.label}
              </span>

              <!-- Due Date -->
              ${task.dueDate ? `
                <span class="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  <i class="fa-regular fa-calendar"></i>
                  ${escapeHtml(task.dueDate)}
                </span>
              ` : ''}

              <!-- Assignee badge -->
              ${assignedEmail ? `
                <span class="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  <i class="fa-solid fa-user"></i>
                  ${escapeHtml(assignedEmail)}
                </span>
              ` : ''}

              <!-- Creator or completed by -->
              <span class="text-slate-400">
                ${isCompleted
                  ? `(由 ${escapeHtml(completedByName || '成員')} 完成)`
                  : `由 ${escapeHtml(createdByName)} 新增`}
              </span>
            </div>
          </div>
        </div>

        <!-- Task Action: Delete -->
        <button data-action="delete-task" title="刪除任務" class="text-slate-300 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
  }).join('');

  // Event Delegation for Task actions
  el.tasksList.querySelectorAll('[data-task-id]').forEach(row => {
    const taskId = row.getAttribute('data-task-id');

    // Toggle complete
    const checkbox = row.querySelector('[data-action="toggle-complete"]');
    if (checkbox) {
      checkbox.addEventListener('change', () => toggleTaskComplete(taskId, checkbox.checked));
    }

    // Delete task
    const btnDelete = row.querySelector('[data-action="delete-task"]');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => deleteTask(taskId));
    }
  });
}

/**
 * Add Task
 */
async function handleAddTask(e) {
  e.preventDefault();
  if (!state.activeListId) return;

  const title = el.inputTaskTitle.value.trim();
  if (!title) return;

  const priority = el.selectTaskPriority.value || 'medium';
  const dueDate = el.inputTaskDueDate.value || null;
  const assignedEmail = el.selectTaskAssignee.value || null;

  try {
    const tasksRef = collection(state.db, 'lists', state.activeListId, 'tasks');
    
    // Build createdBy meta matching isValidUserMetaMap
    const createdBy = {
      uid: state.currentUser.uid,
      displayName: state.currentUser.displayName || state.currentUser.email?.split('@')[0] || '使用者',
      email: state.currentUser.email || ''
    };
    if (state.currentUser.photoURL && state.currentUser.photoURL.startsWith('http')) {
      createdBy.photoURL = state.currentUser.photoURL;
    }

    const taskDoc = {
      title,
      completed: false,
      priority,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (dueDate) {
      taskDoc.dueDate = dueDate;
    }

    if (assignedEmail) {
      taskDoc.assignedTo = {
        email: assignedEmail,
        displayName: assignedEmail.split('@')[0]
      };
    }

    await addDoc(tasksRef, taskDoc);

    // Reset Form
    el.inputTaskTitle.value = '';
    el.inputTaskDueDate.value = '';
    el.selectTaskPriority.value = 'medium';
    el.selectTaskAssignee.value = '';
    showToast('任務已新增！', 'success');
  } catch (error) {
    console.error('Error adding task:', error);
    showToast('新增任務失敗: ' + error.message, 'error');
  }
}

/**
 * Toggle Task Complete
 */
async function toggleTaskComplete(taskId, isCompleted) {
  if (!state.activeListId) return;
  try {
    const taskRef = doc(state.db, 'lists', state.activeListId, 'tasks', taskId);
    
    const updateData = {
      completed: isCompleted,
      updatedAt: serverTimestamp()
    };

    if (isCompleted) {
      const completedBy = {
        uid: state.currentUser.uid,
        displayName: state.currentUser.displayName || state.currentUser.email?.split('@')[0] || '使用者',
        email: state.currentUser.email || ''
      };
      if (state.currentUser.photoURL && state.currentUser.photoURL.startsWith('http')) {
        completedBy.photoURL = state.currentUser.photoURL;
      }
      updateData.completedAt = serverTimestamp();
      updateData.completedBy = completedBy;
    } else {
      updateData.completedAt = null;
      updateData.completedBy = null;
    }

    await updateDoc(taskRef, updateData);
  } catch (error) {
    console.error('Error updating task:', error);
    showToast('更新任務狀態失敗: ' + error.message, 'error');
  }
}

/**
 * Delete Task
 */
async function deleteTask(taskId) {
  if (!state.activeListId) return;
  if (!confirm('確定要刪除此待辦任務嗎？')) return;

  try {
    const taskRef = doc(state.db, 'lists', state.activeListId, 'tasks', taskId);
    await deleteDoc(taskRef);
    showToast('任務已刪除', 'info');
  } catch (error) {
    console.error('Error deleting task:', error);
    showToast('刪除失敗: ' + error.message, 'error');
  }
}

/**
 * Create New List
 */
async function handleCreateList(e) {
  e.preventDefault();
  const title = el.inputListTitle.value.trim();
  const desc = el.inputListDesc.value.trim();

  if (!title) return;

  try {
    const userEmail = state.currentUser.email || '';
    const listsRef = collection(state.db, 'lists');
    const docData = {
      title,
      ownerId: state.currentUser.uid,
      ownerEmail: userEmail,
      memberEmails: [userEmail],
      memberUids: [state.currentUser.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (desc) {
      docData.description = desc;
    }

    const newDoc = await addDoc(listsRef, docData);

    closeModals();
    el.formCreateList.reset();
    showToast(`清單「${title}」已建立！`, 'success');
    selectList(newDoc.id);
  } catch (error) {
    console.error('Error creating list:', error);
    showToast('建立清單失敗: ' + error.message, 'error');
  }
}

/**
 * Invite Collaborator
 */
async function handleInviteMember(e) {
  e.preventDefault();
  if (!state.activeListId || !state.activeList) return;

  const email = el.inputInviteEmail.value.trim().toLowerCase();
  if (!email) return;

  const currentMembers = state.activeList.memberEmails || [];
  if (currentMembers.includes(email)) {
    showToast('該成員已在協作名單中', 'warning');
    return;
  }

  try {
    const listRef = doc(state.db, 'lists', state.activeListId);
    await updateDoc(listRef, {
      memberEmails: arrayUnion(email),
      updatedAt: serverTimestamp()
    });

    el.inputInviteEmail.value = '';
    showToast(`已成功邀請 ${email} 加入協作！`, 'success');
    renderInviteModalMembers();
  } catch (error) {
    console.error('Error inviting member:', error);
    showToast('邀請失敗: ' + error.message, 'error');
  }
}

/**
 * Remove Member from List
 */
async function removeMember(email) {
  if (!state.activeListId || !state.activeList) return;
  const isOwner = state.activeList.ownerId === state.currentUser?.uid;

  if (!isOwner && email !== state.currentUser.email.toLowerCase()) {
    showToast('只有擁有者才能移除其他成員', 'warning');
    return;
  }

  if (!confirm(`確定要將 ${email} 從此清單中移除嗎？`)) return;

  try {
    const listRef = doc(state.db, 'lists', state.activeListId);
    await updateDoc(listRef, {
      memberEmails: arrayRemove(email),
      updatedAt: serverTimestamp()
    });

    showToast(`已移除成員 ${email}`, 'info');
    renderInviteModalMembers();
  } catch (error) {
    console.error('Error removing member:', error);
    showToast('移除失敗: ' + error.message, 'error');
  }
}

/**
 * Delete Active List
 */
async function handleDeleteList() {
  if (!state.activeListId || !state.activeList) return;
  if (state.activeList.ownerId !== state.currentUser?.uid) {
    showToast('只有擁有者可刪除清單', 'warning');
    return;
  }

  if (!confirm(`確定要徹底刪除清單「${state.activeList.title}」及其所有任務嗎？此動作無法復原。`)) {
    return;
  }

  try {
    const listRef = doc(state.db, 'lists', state.activeListId);
    await deleteDoc(listRef);
    showToast('清單已刪除', 'info');
  } catch (error) {
    console.error('Error deleting list:', error);
    showToast('刪除清單失敗: ' + error.message, 'error');
  }
}

/**
 * Render Members List inside Invite Modal
 */
function renderInviteModalMembers() {
  if (!state.activeList) return;
  const members = state.activeList.memberEmails || [];
  const ownerEmail = state.activeList.ownerEmail || '';
  const isOwner = state.activeList.ownerId === state.currentUser?.uid;

  el.modalMembersList.innerHTML = members.map(email => {
    const isThisOwner = email === ownerEmail;
    return `
      <div class="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
        <div class="flex items-center space-x-2 truncate">
          <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center justify-center">
            ${email.charAt(0).toUpperCase()}
          </div>
          <span class="font-medium text-slate-700 truncate">${escapeHtml(email)}</span>
          ${isThisOwner ? '<span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">擁有者</span>' : ''}
        </div>
        ${(!isThisOwner && isOwner) ? `
          <button data-remove-email="${escapeHtml(email)}" class="text-slate-400 hover:text-red-600 text-xs p-1">
            <i class="fa-solid fa-user-xmark"></i>
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  el.modalMembersList.querySelectorAll('[data-remove-email]').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-remove-email');
      removeMember(email);
    });
  });
}

/**
 * Modal Controllers
 */
function openCreateListModal() {
  el.modalCreateList.classList.remove('hidden');
  setTimeout(() => el.inputListTitle.focus(), 100);
}

function openInviteModal() {
  if (!state.activeList) return;
  renderInviteModalMembers();
  el.modalInvite.classList.remove('hidden');
  setTimeout(() => el.inputInviteEmail.focus(), 100);
}

function openSettingsModal() {
  const cfg = state.config;
  el.inputCfgApiKey.value = cfg.apiKey || '';
  el.inputCfgProjectId.value = cfg.projectId || 'my-to-do-list-fd68c';
  el.inputCfgAuthDomain.value = cfg.authDomain || 'my-to-do-list-fd68c.firebaseapp.com';
  el.inputCfgAppId.value = cfg.appId || '';
  el.modalSettings.classList.remove('hidden');
}

function closeModals() {
  el.modalCreateList.classList.add('hidden');
  el.modalInvite.classList.add('hidden');
  el.modalSettings.classList.add('hidden');
}

/**
 * Settings Form Handler
 */
function handleSaveSettings(e) {
  e.preventDefault();
  const newConfig = {
    apiKey: el.inputCfgApiKey.value.trim(),
    projectId: el.inputCfgProjectId.value.trim(),
    authDomain: el.inputCfgAuthDomain.value.trim(),
    appId: el.inputCfgAppId.value.trim(),
    storageBucket: `${el.inputCfgProjectId.value.trim()}.firebasestorage.app`
  };

  saveFirebaseConfig(newConfig);
  showToast('Firebase 設定已儲存，正在重新整理...', 'success');
  setTimeout(() => window.location.reload(), 1000);
}

function handleResetSettings() {
  if (confirm('確定要清除設定覆蓋並回復為預設值嗎？')) {
    resetFirebaseConfig();
    showToast('已重設，正在重新整理...', 'info');
    setTimeout(() => window.location.reload(), 1000);
  }
}

/**
 * Bind DOM Event Listeners
 */
function setupEventListeners() {
  // Auth
  el.btnLoginGoogle.addEventListener('click', handleGoogleSignIn);
  el.btnHeroLogin.addEventListener('click', handleGoogleSignIn);
  el.btnLogout.addEventListener('click', handleSignOut);

  // Settings
  el.btnOpenSettings.addEventListener('click', openSettingsModal);
  el.btnBannerSettings.addEventListener('click', openSettingsModal);
  el.formSettings.addEventListener('submit', handleSaveSettings);
  el.btnResetConfig.addEventListener('click', handleResetSettings);

  // Lists
  el.btnOpenCreateList.addEventListener('click', openCreateListModal);
  el.formCreateList.addEventListener('submit', handleCreateList);
  el.btnDeleteList.addEventListener('click', handleDeleteList);

  // Invite
  el.btnOpenInvite.addEventListener('click', openInviteModal);
  el.formInviteMember.addEventListener('submit', handleInviteMember);

  // Tasks Form
  el.formAddTask.addEventListener('submit', handleAddTask);

  // Filters
  document.querySelectorAll('.task-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.task-filter-btn').forEach(b => {
        b.className = 'task-filter-btn px-3 py-1.5 rounded-lg font-medium transition-colors text-slate-600 hover:bg-slate-100';
      });
      btn.className = 'task-filter-btn px-3 py-1.5 rounded-lg font-medium transition-colors bg-brand-50 text-brand-700';
      state.filter = btn.getAttribute('data-filter');
      renderTasks();
    });
  });

  // Search input
  el.inputSearchTasks.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTasks();
  });

  // Modal Close buttons
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeModals);
  });

  // Close modals on clicking backdrop
  window.addEventListener('click', (e) => {
    if (e.target === el.modalCreateList || e.target === el.modalInvite || e.target === el.modalSettings) {
      closeModals();
    }
  });

  // ESC key to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModals();
  });
}

// Start App
setupEventListeners();
initFirebase();
