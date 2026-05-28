const API_BASE = "http://localhost:5000";
const SESSION_KEY = "riwiflow_user";

const STATUSES = [
  { id: "todo", label: "Todo" },
  { id: "in-progress", label: "In Progress" },
  { id: "in-review", label: "In Review" },
  { id: "done", label: "Done" },
];

const state = {
  users: [],
  tasks: [],
  currentUser: null,
  currentView: "board",
  editingTaskId: null,
  editingUserId: null,
};

const $ = (selector) => document.querySelector(selector);

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) return null;

  return response.json();
}

async function loadData() {
  const [users, tasks] = await Promise.all([
    apiFetch("/users"),
    apiFetch("/tasks"),
  ]);

  state.users = users;
  state.tasks = tasks;
}

function normalizeId(id) {
  return String(id);
}

function isAdmin() {
  return state.currentUser?.role === "admin";
}

function canEditTask(task) {
  return isAdmin() || normalizeId(task.userId) === normalizeId(state.currentUser?.id);
}

function getUser(userId) {
  return state.users.find((user) => normalizeId(user.id) === normalizeId(userId));
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  state.currentUser = user;
}

function loadSession() {
  const session = localStorage.getItem(SESSION_KEY);

  if (!session) {
    showLogin();
    return;
  }

  const storedUser = JSON.parse(session);
  const freshUser = state.users.find((user) => normalizeId(user.id) === normalizeId(storedUser.id));

  if (!freshUser) {
    logout();
    return;
  }

  state.currentUser = freshUser;
  showApp();
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  state.currentUser = null;
  state.currentView = "board";
  showLogin();
}

function showLogin() {
  $("#view-login").classList.remove("view-hidden");
  $("#view-app").classList.add("view-hidden");
}

function showApp() {
  if (state.currentView === "users" && !isAdmin()) {
    state.currentView = "board";
    history.replaceState(null, "", "#/board");
  }

  $("#view-login").classList.add("view-hidden");
  $("#view-app").classList.remove("view-hidden");
  renderCurrentUser();
  renderNavigation();
  renderView();
}

function renderCurrentUser() {
  $("#currentUserName").textContent = state.currentUser.name;
  $("#currentUserEmail").textContent = state.currentUser.email;
  $("#currentUserRole").textContent = state.currentUser.role;
  $("#currentUserInitial").textContent = state.currentUser.name.charAt(0).toUpperCase();
  $("#openTaskModalBtn").classList.toggle("hidden", !isAdmin());
}

function renderNavigation() {
  document.querySelectorAll("[data-view-link]").forEach((button) => {
    const isActive = button.dataset.viewLink === state.currentView;
    button.classList.toggle("bg-primary-fixed", isActive);
    button.classList.toggle("text-on-primary-fixed-variant", isActive);
    button.classList.toggle("text-secondary", !isActive);
  });

  $("#usersNav").classList.toggle("hidden", !isAdmin());
}

function renderView() {
  $("#boardView").classList.toggle("view-hidden", state.currentView !== "board");
  $("#usersView").classList.toggle("view-hidden", state.currentView !== "users");

  if (state.currentView === "users") {
    renderUsers();
  } else {
    renderTasks();
  }
}

function setupLogin() {
  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const email = $("#email").value.trim();
    const password = $("#password").value;
    const user = state.users.find((item) => item.email === email && item.password === password);

    if (!user) {
      $("#loginError").textContent = "Invalid email or password.";
      return;
    }

    $("#loginError").textContent = "";
    saveSession(user);
    showApp();
  });
}

function setupNavigation() {
  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.viewLink === "users" && !isAdmin()) return;
      state.currentView = button.dataset.viewLink;
      history.pushState(null, "", `#/${state.currentView}`);
      renderNavigation();
      renderView();
    });
  });

  window.addEventListener("popstate", () => {
    const route = location.hash.replace("#/", "") || "board";
    state.currentView = route === "users" && !isAdmin() ? "board" : route;
    renderNavigation();
    renderView();
  });
}

function setupForms() {
  $("#logoutBtn").addEventListener("click", logout);
  $("#openTaskModalBtn").addEventListener("click", () => openTaskModal());
  $("#closeTaskModalBtn").addEventListener("click", closeTaskModal);
  $("#cancelTaskBtn").addEventListener("click", closeTaskModal);
  $("#taskForm").addEventListener("submit", saveTask);

  $("#openUserModalBtn").addEventListener("click", () => openUserModal());
  $("#closeUserModalBtn").addEventListener("click", closeUserModal);
  $("#cancelUserBtn").addEventListener("click", closeUserModal);
  $("#userForm").addEventListener("submit", saveUser);
}

function createTaskCard(task) {
  const card = document.createElement("article");
  const assignedUser = getUser(task.userId);
  const editable = canEditTask(task);

  card.className = "task-card bg-white border border-outline-variant rounded-xl p-4 shadow-sm";
  card.draggable = editable;
  card.dataset.id = task.id;

  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <h4 class="font-bold text-base text-on-surface">${task.title}</h4>
      <span class="text-xs text-outline">${STATUSES.find((status) => status.id === task.status)?.label || task.status}</span>
    </div>
    <p class="text-sm text-on-surface-variant mt-2">${task.description}</p>
    <div class="flex items-center justify-between gap-3 mt-4">
      <span class="text-xs bg-secondary-container text-on-secondary-container px-2 py-1 rounded-full">
        ${assignedUser?.name || "Unassigned"}
      </span>
      <div class="flex gap-2">
        ${
          editable
            ? `<button class="task-edit-btn text-primary text-sm font-semibold" type="button">Edit</button>`
            : `<span class="text-xs text-outline">Read only</span>`
        }
        ${
          isAdmin()
            ? `<button class="task-delete-btn text-error text-sm font-semibold" type="button">Delete</button>`
            : ""
        }
      </div>
    </div>
  `;

  if (editable) {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", task.id);
    });

    card.querySelector(".task-edit-btn").addEventListener("click", () => openTaskModal(task));
  }

  if (isAdmin()) {
    card.querySelector(".task-delete-btn").addEventListener("click", () => deleteTask(task));
  }

  return card;
}

function setupDropZones(columns) {
  Object.entries(columns).forEach(([status, column]) => {
    column.ondragover = (event) => {
      event.preventDefault();
      column.classList.add("ring-2", "ring-primary");
    };

    column.ondragleave = () => {
      column.classList.remove("ring-2", "ring-primary");
    };

    column.ondrop = async (event) => {
      event.preventDefault();
      column.classList.remove("ring-2", "ring-primary");

      const taskId = event.dataTransfer.getData("text/plain");
      const task = state.tasks.find((item) => normalizeId(item.id) === normalizeId(taskId));

      if (!task || task.status === status) return;

      if (!canEditTask(task)) {
        alert("You can only move tasks assigned to you.");
        return;
      }

      task.status = status;
      column.appendChild(document.querySelector(`[data-id="${task.id}"]`));

      try {
        await apiFetch(`/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
      } catch (error) {
        await loadData();
        renderTasks();
        alert("The task could not be moved. Please try again.");
      }
    };
  });
}

function renderTasks() {
  const columns = {
    todo: $("#todo-column"),
    "in-progress": $("#progress-column"),
    "in-review": $("#review-column"),
    done: $("#done-column"),
  };

  Object.values(columns).forEach((column) => {
    column.innerHTML = "";
  });

  state.tasks.forEach((task) => {
    columns[task.status]?.appendChild(createTaskCard(task));
  });

  setupDropZones(columns);
}

function fillUserSelect(selectedId) {
  $("#taskUser").innerHTML = state.users
    .filter((user) => user.role === "coder")
    .map((user) => `<option value="${user.id}" ${normalizeId(user.id) === normalizeId(selectedId) ? "selected" : ""}>${user.name}</option>`)
    .join("");
}

function openTaskModal(task = null) {
  state.editingTaskId = task?.id ?? null;
  const coderCanEdit = task && !isAdmin();

  $("#taskModalTitle").textContent = task ? "Edit task" : "Create task";
  $("#taskTitle").value = task?.title || "";
  $("#taskDescription").value = task?.description || "";
  $("#taskStatus").value = task?.status || "todo";
  fillUserSelect(task?.userId);

  $("#taskTitle").disabled = coderCanEdit;
  $("#taskUser").disabled = coderCanEdit;
  $("#taskModal").classList.remove("view-hidden");
}

function closeTaskModal() {
  $("#taskModal").classList.add("view-hidden");
  $("#taskForm").reset();
  state.editingTaskId = null;
}

async function saveTask(event) {
  event.preventDefault();

  const existingTask = state.tasks.find((task) => normalizeId(task.id) === normalizeId(state.editingTaskId));
  const payload = {
    title: $("#taskTitle").value.trim(),
    description: $("#taskDescription").value.trim(),
    status: $("#taskStatus").value,
    userId: $("#taskUser").value,
  };

  if (existingTask && !isAdmin()) {
    if (!canEditTask(existingTask)) {
      alert("You can only edit tasks assigned to you.");
      return;
    }

    delete payload.title;
    delete payload.userId;
  }

  try {
    if (existingTask) {
      const updatedTask = await apiFetch(`/tasks/${existingTask.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      state.tasks = state.tasks.map((task) => (normalizeId(task.id) === normalizeId(updatedTask.id) ? updatedTask : task));
    } else if (isAdmin()) {
      const newTask = await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ ...payload, status: payload.status || "todo" }),
      });
      state.tasks.push(newTask);
    }

    closeTaskModal();
    renderTasks();
  } catch (error) {
    alert("The task could not be saved.");
  }
}

async function deleteTask(task) {
  if (!confirm(`Delete "${task.title}"?`)) return;

  await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
  state.tasks = state.tasks.filter((item) => normalizeId(item.id) !== normalizeId(task.id));
  renderTasks();
}

function renderUsers() {
  $("#usersTableBody").innerHTML = state.users
    .map(
      (user) => `
        <tr class="border-b border-outline-variant">
          <td class="py-3 px-4 font-medium">${user.name}</td>
          <td class="py-3 px-4">${user.email}</td>
          <td class="py-3 px-4"><span class="text-xs bg-primary-fixed text-on-primary-fixed-variant px-2 py-1 rounded-full">${user.role}</span></td>
          <td class="py-3 px-4 text-right">
            <button class="user-edit-btn text-primary font-semibold mr-3" data-id="${user.id}" type="button">Edit</button>
            <button class="user-delete-btn text-error font-semibold" data-id="${user.id}" type="button" ${normalizeId(user.id) === normalizeId(state.currentUser.id) ? "disabled" : ""}>Delete</button>
          </td>
        </tr>
      `
    )
    .join("");

  document.querySelectorAll(".user-edit-btn").forEach((button) => {
    button.addEventListener("click", () => openUserModal(state.users.find((user) => normalizeId(user.id) === normalizeId(button.dataset.id))));
  });

  document.querySelectorAll(".user-delete-btn").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.id));
  });
}

function openUserModal(user = null) {
  state.editingUserId = user?.id ?? null;
  $("#userModalTitle").textContent = user ? "Edit user" : "Create user";
  $("#userName").value = user?.name || "";
  $("#userEmail").value = user?.email || "";
  $("#userPassword").value = user?.password || "";
  $("#userRole").value = user?.role || "coder";
  $("#userModal").classList.remove("view-hidden");
}

function closeUserModal() {
  $("#userModal").classList.add("view-hidden");
  $("#userForm").reset();
  state.editingUserId = null;
}

async function saveUser(event) {
  event.preventDefault();

  if (!isAdmin()) return;

  const payload = {
    name: $("#userName").value.trim(),
    email: $("#userEmail").value.trim(),
    password: $("#userPassword").value,
    role: $("#userRole").value,
  };

  try {
    if (state.editingUserId) {
      const updatedUser = await apiFetch(`/users/${state.editingUserId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      state.users = state.users.map((user) => (normalizeId(user.id) === normalizeId(updatedUser.id) ? updatedUser : user));

      if (normalizeId(updatedUser.id) === normalizeId(state.currentUser.id)) {
        saveSession(updatedUser);
        renderCurrentUser();
      }
    } else {
      const newUser = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      state.users.push(newUser);
    }

    closeUserModal();
    renderUsers();
    renderTasks();
  } catch (error) {
    alert("The user could not be saved.");
  }
}

async function deleteUser(userId) {
  const assignedTasks = state.tasks.some((task) => normalizeId(task.userId) === normalizeId(userId));

  if (assignedTasks) {
    alert("This user has assigned tasks. Reassign or delete those tasks first.");
    return;
  }

  if (!confirm("Delete this user?")) return;

  await apiFetch(`/users/${userId}`, { method: "DELETE" });
  state.users = state.users.filter((user) => normalizeId(user.id) !== normalizeId(userId));
  renderUsers();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    setupLogin();
    setupNavigation();
    setupForms();
    state.currentView = location.hash.replace("#/", "") || "board";
    loadSession();
  } catch (error) {
    $("#loginError").textContent = "Could not connect to JSON Server on port 5000.";
  }
});
