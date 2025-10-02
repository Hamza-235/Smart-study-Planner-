

/* Storage */
const Storage = {
    STORAGE_KEY: 'AceTrack.v1',
    
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : this.getDefaultData();
        } catch (error) {
            console.error('Error loading data:', error);
            return this.getDefaultData();
        }
    },
    
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    },
    
    getDefaultData() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        return {
            version: '1',
            settings: { notificationsAllowed: false },
            goals: [
                {
                    id: 'g1',
                    title: 'Mathematics Exam Prep',
                    description: 'Prepare for Calculus and Algebra finals',
                    color: '#ff8a65',
                    tags: ['exam', 'math'],
                    priority: 5,
                    tasks: ['t1', 't2'],
                    timelineStart: now.toISOString().split('T')[0],
                    timelineEnd: nextWeek.toISOString().split('T')[0],
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString()
                }
            ],
            tasks: [
                {
                    id: 't1',
                    goalId: 'g1',
                    title: 'Review Integration Techniques',
                    notes: 'Focus on integration by parts',
                    estimatedMinutes: 120,
                    dueDate: tomorrow.toISOString(),
                    completed: false,
                    priority: 5,
                    tags: ['calculus'],
                    reminder: {
                        enabled: true,
                        at: new Date(tomorrow.getTime() - 3600000).toISOString(),
                        repeat: 'none'
                    },
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString()
                },
                {
                    id: 't2',
                    goalId: 'g1',
                    title: 'Practice Algebra Problems',
                    notes: 'Chapter 5 exercises',
                    estimatedMinutes: 90,
                    dueDate: tomorrow.toISOString(),
                    completed: false,
                    priority: 4,
                    tags: ['algebra'],
                    reminder: { enabled: false, at: null, repeat: 'none' },
                    createdAt: now.toISOString(),
                    updatedAt: now.toISOString()
                }
            ]
        };
    },
    
    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-planner-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    import(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.version && Array.isArray(data.goals) && Array.isArray(data.tasks)) {
                        this.save(data);
                        resolve(data);
                    } else {
                        reject(new Error('Invalid data format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }
};

// ===========================
// Data Manager
// ===========================
const DataManager = {
    data: null,
    
    init() {
        this.data = Storage.load();
    },
    
    save() {
        Storage.save(this.data);
    },
    
    getGoals() { return this.data.goals; },
    getGoal(id) { return this.data.goals.find(g => g.id === id); },
    
    addGoal(goal) {
        goal.id = 'g' + Date.now();
        goal.createdAt = new Date().toISOString();
        goal.updatedAt = new Date().toISOString();
        goal.tasks = [];
        this.data.goals.push(goal);
        this.save();
        return goal;
    },
    
    updateGoal(id, updates) {
        const goal = this.getGoal(id);
        if (goal) {
            Object.assign(goal, updates);
            goal.updatedAt = new Date().toISOString();
            this.save();
        }
        return goal;
    },
    
    deleteGoal(id) {
        this.data.tasks = this.data.tasks.filter(t => t.goalId !== id);
        this.data.goals = this.data.goals.filter(g => g.id !== id);
        this.save();
    },
    
    getTasks() { return this.data.tasks; },
    getTask(id) { return this.data.tasks.find(t => t.id === id); },
    getTasksByGoal(goalId) { return this.data.tasks.filter(t => t.goalId === goalId); },
    
    addTask(task) {
        task.id = 't' + Date.now();
        task.createdAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();
        this.data.tasks.push(task);
        
        if (task.goalId) {
            const goal = this.getGoal(task.goalId);
            if (goal && !goal.tasks.includes(task.id)) {
                goal.tasks.push(task.id);
            }
        }
        this.save();
        return task;
    },
    
    updateTask(id, updates) {
        const task = this.getTask(id);
        if (task) {
            const oldGoalId = task.goalId;
            Object.assign(task, updates);
            task.updatedAt = new Date().toISOString();
            
            if (oldGoalId !== task.goalId) {
                if (oldGoalId) {
                    const oldGoal = this.getGoal(oldGoalId);
                    if (oldGoal) oldGoal.tasks = oldGoal.tasks.filter(tid => tid !== id);
                }
                if (task.goalId) {
                    const newGoal = this.getGoal(task.goalId);
                    if (newGoal && !newGoal.tasks.includes(id)) newGoal.tasks.push(id);
                }
            }
            this.save();
        }
        return task;
    },
    
    deleteTask(id) {
        const task = this.getTask(id);
        if (task && task.goalId) {
            const goal = this.getGoal(task.goalId);
            if (goal) goal.tasks = goal.tasks.filter(tid => tid !== id);
        }
        this.data.tasks = this.data.tasks.filter(t => t.id !== id);
        this.save();
    },
    
    toggleTaskComplete(id) {
        const task = this.getTask(id);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            this.save();
        }
        return task;
    },
    
    getTodayTasks() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return this.data.tasks.filter(t => {
            const dueDate = new Date(t.dueDate);
            return dueDate >= today && dueDate < tomorrow && !t.completed;
        });
    },
    
    getUpcomingReminders() {
        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        return this.data.tasks.filter(t => {
            if (!t.reminder || !t.reminder.enabled || t.completed) return false;
            const reminderTime = new Date(t.reminder.at);
            return reminderTime >= now && reminderTime <= next24h;
        }).sort((a, b) => new Date(a.reminder.at) - new Date(b.reminder.at));
    },
    
    getCompletionRate() {
        const total = this.data.tasks.length;
        if (total === 0) return 0;
        const completed = this.data.tasks.filter(t => t.completed).length;
        return Math.round((completed / total) * 100);
    },
    
    getTotalMinutes() {
        return this.data.tasks.filter(t => !t.completed)
            .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
    },
    
    updateSettings(settings) {
        Object.assign(this.data.settings, settings);
        this.save();
    },
    
    getSettings() {
        return this.data.settings;
    }
};

// ===========================
// Notification Manager
// ===========================
const NotificationManager = {
    checkInterval: null,
    notifiedReminders: new Set(),
    
    init() {
        this.startChecking();
    },
    
    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            DataManager.updateSettings({ notificationsAllowed: permission === 'granted' });
            UI.showToast(
                permission === 'granted' ? 'Notifications enabled!' : 'Notifications denied',
                permission === 'granted' ? 'success' : 'error'
            );
        }
    },
    
    startChecking() {
        this.checkInterval = setInterval(() => this.checkReminders(), 60000);
        this.checkReminders();
    },
    
    checkReminders() {
        const reminders = DataManager.getUpcomingReminders();
        const now = new Date();
        
        reminders.forEach(task => {
            const reminderTime = new Date(task.reminder.at);
            const diff = reminderTime - now;
            
            if (diff <= 60000 && diff >= 0 && !this.notifiedReminders.has(task.id)) {
                this.showNotification(task);
                this.notifiedReminders.add(task.id);
                
                if (task.reminder.repeat !== 'none') {
                    this.scheduleNextReminder(task);
                }
            }
        });
        
        UI.updateReminderBadge();
    },
    
    showNotification(task) {
        const settings = DataManager.getSettings();
        
        if (settings.notificationsAllowed && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Study Reminder', {
                body: task.title,
                icon: '📚',
                tag: task.id
            });
        } else {
            UI.showToast(`Reminder: ${task.title}`, 'info');
        }
    },
    
    scheduleNextReminder(task) {
        const current = new Date(task.reminder.at);
        let next;
        
        switch (task.reminder.repeat) {
            case 'daily':
                next = new Date(current);
                next.setDate(next.getDate() + 1);
                break;
            case 'weekly':
                next = new Date(current);
                next.setDate(next.getDate() + 7);
                break;
            case 'monthly':
                next = new Date(current);
                next.setMonth(next.getMonth() + 1);
                break;
        }
        
        if (next) {
            DataManager.updateTask(task.id, {
                reminder: { ...task.reminder, at: next.toISOString() }
            });
            this.notifiedReminders.delete(task.id);
        }
    },
    
    snoozeReminder(taskId, minutes) {
        const task = DataManager.getTask(taskId);
        if (task) {
            const newTime = new Date(Date.now() + minutes * 60000);
            DataManager.updateTask(taskId, {
                reminder: { ...task.reminder, at: newTime.toISOString() }
            });
            this.notifiedReminders.delete(taskId);
            UI.showToast(`Reminder snoozed for ${minutes} minutes`, 'success');
            UI.render();
        }
    }
};

// ===========================
// UI Manager
// ===========================
const UI = {
    currentView: 'dashboard',
    currentMonth: new Date(),
    
    init() {
        this.setupNavigation();
        this.setupModals();
        this.setupForms();
        this.setupKeyboardShortcuts();
        this.setupButtons();
        this.render();
    },
    
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
    },
    
    switchView(viewName) {
        this.currentView = viewName;
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(viewName + 'View').classList.add('active');
        
        this.renderCurrentView();
    },
    
    renderCurrentView() {
        switch (this.currentView) {
            case 'dashboard': this.renderDashboard(); break;
            case 'goals': this.renderGoals(); break;
            case 'tasks': this.renderTasks(); break;
            case 'timeline': this.renderTimeline(); break;
            case 'calendar': this.renderCalendar(); break;
            case 'reminders': this.renderReminders(); break;
        }
    },
    
    render() {
        this.renderCurrentView();
        this.updateReminderBadge();
    },
    
    renderDashboard() {
        const todayTasks = DataManager.getTodayTasks();
        const upcomingReminders = DataManager.getUpcomingReminders();
        
        document.getElementById('todayTasksCount').textContent = todayTasks.length;
        document.getElementById('upcomingReminders').textContent = upcomingReminders.length;
        document.getElementById('completionRate').textContent = DataManager.getCompletionRate() + '%';
        document.getElementById('totalMinutes').textContent = DataManager.getTotalMinutes();
        
        const todayList = document.getElementById('todayTasksList');
        todayList.innerHTML = todayTasks.length === 0 
            ? '<div class="empty-state"><p>No tasks due today! 🎉</p></div>'
            : todayTasks.map(task => `
                <div class="task-compact">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="app.toggleTask('${task.id}')">
                    <span>${this.escapeHtml(task.title)}</span>
                </div>
            `).join('');
        
        const activeGoals = DataManager.getGoals().slice(0, 5);
        const goalsList = document.getElementById('activeGoalsList');
        goalsList.innerHTML = activeGoals.length === 0
            ? '<div class="empty-state"><p>No goals yet</p></div>'
            : activeGoals.map(goal => {
                const tasks = DataManager.getTasksByGoal(goal.id);
                const completed = tasks.filter(t => t.completed).length;
                const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                
                return `
                    <div class="goal-compact" style="border-left: 4px solid ${goal.color}">
                        <strong>${this.escapeHtml(goal.title)}</strong>
                        <div class="progress-bar" style="margin-top: 0.5rem;">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <small style="color: var(--gray);">${completed}/${tasks.length} tasks</small>
                    </div>
                `;
            }).join('');
    },
    
    renderGoals() {
        const goals = DataManager.getGoals();
        const container = document.getElementById('goalsList');
        
        if (goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <p>No goals yet — click 'New Goal' to begin.</p>
                </div>
            `;
        } else {
            container.innerHTML = goals.map(goal => {
                const tasks = DataManager.getTasksByGoal(goal.id);
                const completed = tasks.filter(t => t.completed).length;
                const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                
                return `
                    <div class="goal-card" style="border-left-color: ${goal.color}">
                        <div class="goal-header">
                            <h3 class="goal-title">${this.escapeHtml(goal.title)}</h3>
                            <div class="goal-actions">
                                <button onclick="app.editGoal('${goal.id}')">✏️</button>
                                <button onclick="app.deleteGoal('${goal.id}')">🗑️</button>
                            </div>
                        </div>
                        ${goal.description ? `<p class="goal-description">${this.escapeHtml(goal.description)}</p>` : ''}
                        <div class="goal-meta">
                            ${goal.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                            <span class="priority-badge priority-${goal.priority}">P${goal.priority}</span>
                        </div>
                        ${goal.timelineStart && goal.timelineEnd ? `
                            <div style="font-size: 0.85rem; color: var(--gray); margin: 0.5rem 0;">
                                📅 ${this.formatDate(goal.timelineStart)} - ${this.formatDate(goal.timelineEnd)}
                            </div>
                        ` : ''}
                        <div style="margin-top: 1rem;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--gray); margin-bottom: 0.5rem;">
                                <span>${completed}/${tasks.length} tasks</span>
                                <span>${progress}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },
    
    renderTasks() {
        let tasks = DataManager.getTasks();
        
        const searchTerm = document.getElementById('taskSearch').value.toLowerCase();
        const priorityFilter = document.getElementById('filterPriority').value;
        const goalFilter = document.getElementById('filterGoal').value;
        const sortBy = document.getElementById('sortTasks').value;
        
        if (searchTerm) {
            tasks = tasks.filter(t => 
                t.title.toLowerCase().includes(searchTerm) ||
                (t.notes && t.notes.toLowerCase().includes(searchTerm))
            );
        }
        
        if (priorityFilter) tasks = tasks.filter(t => t.priority === parseInt(priorityFilter));
        if (goalFilter) tasks = tasks.filter(t => t.goalId === goalFilter);
        
        tasks.sort((a, b) => {
            switch (sortBy) {
                case 'dueDate': return new Date(a.dueDate) - new Date(b.dueDate);
                case 'priority': return b.priority - a.priority;
                case 'createdAt': return new Date(b.createdAt) - new Date(a.createdAt);
                default: return 0;
            }
        });
        
        const goalFilterSelect = document.getElementById('filterGoal');
        const goals = DataManager.getGoals();
        goalFilterSelect.innerHTML = '<option value="">All Goals</option>' +
            goals.map(g => `<option value="${g.id}">${this.escapeHtml(g.title)}</option>`).join('');
        
        const container = document.getElementById('tasksList');
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✓</div>
                    <p>No tasks found</p>
                </div>
            `;
        } else {
            container.innerHTML = tasks.map(task => {
                const goal = task.goalId ? DataManager.getGoal(task.goalId) : null;
                const dueDate = new Date(task.dueDate);
                const isOverdue = dueDate < new Date() && !task.completed;
                
                return `
                    <div class="task-item ${task.completed ? 'completed' : ''}">
                        <div class="task-header">
                            <div class="task-title-row">
                                <input type="checkbox" class="task-checkbox" 
                                       ${task.completed ? 'checked' : ''}
                                       onchange="app.toggleTask('${task.id}')">
                                <span class="task-title">${this.escapeHtml(task.title)}</span>
                            </div>
                            <div class="task-actions">
                                <button onclick="app.editTask('${task.id}')">✏️</button>
                                <button onclick="app.deleteTask('${task.id}')">🗑️</button>
                            </div>
                        </div>
                        <div class="task-meta">
                            ${goal ? `<span>🎯 ${this.escapeHtml(goal.title)}</span>` : ''}
                            <span>📅 ${this.formatDateTime(task.dueDate)} ${isOverdue ? '⚠️' : ''}</span>
                            <span>⏱️ ${task.estimatedMinutes}min</span>
                            <span class="priority-badge priority-${task.priority}">P${task.priority}</span>
                        </div>
                        ${task.tags.length > 0 ? `
                            <div class="goal-meta">
                                ${task.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${task.notes ? `<div style="color: var(--gray); margin-top: 0.5rem; font-size: 0.95rem;">📝 ${this.escapeHtml(task.notes)}</div>` : ''}
                        ${task.reminder && task.reminder.enabled ? `
                            <div style="font-size: 0.85rem; color: var(--warning); margin-top: 0.5rem;">
                                ⏰ ${this.formatDateTime(task.reminder.at)}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }
    },
    
    renderTimeline() {
        const container = document.getElementById('timelineContainer');
        const goals = DataManager.getGoals().filter(g => g.timelineStart && g.timelineEnd);
        
        if (goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <p>No timeline data. Add goals with dates to see them here.</p>
                </div>
            `;
            return;
        }
        
        const allDates = [];
        goals.forEach(g => {
            allDates.push(new Date(g.timelineStart), new Date(g.timelineEnd));
        });
        
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
        
        container.innerHTML = goals.map(goal => {
            const start = new Date(goal.timelineStart);
            const end = new Date(goal.timelineEnd);
            const startOffset = Math.floor((start - minDate) / (1000 * 60 * 60 * 24));
            const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (duration / totalDays) * 100;
            
            return `
                <div class="timeline-row">
                    <div class="timeline-label">${this.escapeHtml(goal.title)}</div>
                    <div class="timeline-track">
                        <div class="timeline-bar" 
                             style="left: ${leftPercent}%; width: ${widthPercent}%; background: ${goal.color};"
                             title="${this.escapeHtml(goal.title)}">
                            ${this.escapeHtml(goal.title)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    renderCalendar() {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const container = document.getElementById('calendarContainer');
        const tasks = DataManager.getTasks();
        
        let html = '<div class="calendar-grid">';
        
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });
        
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month"><div class="calendar-day-number">${daysInPrevMonth - i}</div></div>`;
        }
        
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = date.toDateString() === today.toDateString();
            const dayTasks = tasks.filter(t => {
                const taskDate = new Date(t.dueDate);
                return taskDate.toDateString() === date.toDateString();
            });
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="calendar-day-number">${day}</div>
                    <div class="calendar-tasks">
                        ${dayTasks.slice(0, 3).map(t => 
                            `<div class="calendar-task-dot" style="background: ${t.goalId ? (DataManager.getGoal(t.goalId)?.color || 'var(--primary)') : 'var(--primary)'}"></div>`
                        ).join('')}
                        ${dayTasks.length > 3 ? `<small style="color: var(--gray);">+${dayTasks.length - 3} more</small>` : ''}
                    </div>
                </div>
            `;
        }
        
        const remainingDays = 42 - (firstDay + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    renderReminders() {
        const reminders = DataManager.getUpcomingReminders();
        const container = document.getElementById('remindersList');
        
        if (reminders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⏰</div>
                    <p>No upcoming reminders in the next 24 hours</p>
                </div>
            `;
        } else {
            container.innerHTML = reminders.map(task => `
                <div class="reminder-item">
                    <div class="reminder-info">
                        <div class="reminder-title">${this.escapeHtml(task.title)}</div>
                        <div class="reminder-time">⏰ ${this.formatDateTime(task.reminder.at)}</div>
                    </div>
                    <div class="reminder-actions">
                        <button class="snooze-btn" onclick="app.snoozeReminder('${task.id}', 15)" 
                                style="background: var(--warning); color: white;">
                            Snooze 15min
                        </button>
                        <button class="done-btn" onclick="app.completeTask('${task.id}')"
                                style="background: var(--success); color: white;">
                            Mark Done
                        </button>
                    </div>
                </div>
            `).join('');
        }
    },
    
    updateReminderBadge() {
        const reminders = DataManager.getUpcomingReminders();
        const badge = document.getElementById('reminderBadge');
        if (reminders.length > 0) {
            badge.textContent = reminders.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },
    
    setupModals() {
        document.getElementById('reminderEnabled').addEventListener('change', (e) => {
            document.getElementById('reminderOptions').classList.toggle('hidden', !e.target.checked);
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    },
    
    setupForms() {
        document.getElementById('goalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGoal();
        });
        
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });
        
        document.getElementById('taskSearch').addEventListener('input', () => this.renderTasks());
        document.getElementById('filterPriority').addEventListener('change', () => this.renderTasks());
        document.getElementById('filterGoal').addEventListener('change', () => this.renderTasks());
        document.getElementById('sortTasks').addEventListener('change', () => this.renderTasks());
    },
    
    setupButtons() {
        document.getElementById('newGoalBtn').addEventListener('click', () => this.openGoalModal());
        document.getElementById('newTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('notificationBtn').addEventListener('click', () => NotificationManager.requestPermission());
        document.getElementById('exportBtn').addEventListener('click', () => {
            Storage.export();
            this.showToast('Data exported successfully!', 'success');
        });
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                try {
                    await Storage.import(e.target.files[0]);
                    DataManager.init();
                    this.render();
                    this.showToast('Data imported successfully!', 'success');
                } catch (error) {
                    this.showToast('Import failed: ' + error.message, 'error');
                }
            }
        });
        document.getElementById('helpBtn').addEventListener('click', () => this.openHelpModal());
        
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.renderCalendar();
        });
        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.renderCalendar();
        });
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.currentMonth = new Date();
            this.renderCalendar();
        });
    },
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
            }
            if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                document.getElementById('taskSearch').focus();
            }
            if (e.altKey && e.key === 'n') {
                e.preventDefault();
                this.openTaskModal();
            }
            if (e.altKey && e.key === 'g') {
                e.preventDefault();
                this.openGoalModal();
            }
        });
    },
    
    openGoalModal(goalId = null) {
        const modal = document.getElementById('goalModal');
        const form = document.getElementById('goalForm');
        form.reset();
        
        if (goalId) {
            const goal = DataManager.getGoal(goalId);
            document.getElementById('goalModalTitle').textContent = 'Edit Goal';
            document.getElementById('goalId').value = goal.id;
            document.getElementById('goalTitle').value = goal.title;
            document.getElementById('goalDescription').value = goal.description || '';
            document.getElementById('goalColor').value = goal.color;
            document.getElementById('goalPriority').value = goal.priority;
            document.getElementById('goalTimelineStart').value = goal.timelineStart || '';
            document.getElementById('goalTimelineEnd').value = goal.timelineEnd || '';
            document.getElementById('goalTags').value = goal.tags.join(', ');
        } else {
            document.getElementById('goalModalTitle').textContent = 'New Goal';
            document.getElementById('goalId').value = '';
        }
        
        modal.classList.add('active');
    },
    
    closeGoalModal() {
        document.getElementById('goalModal').classList.remove('active');
    },
    
    saveGoal() {
        const id = document.getElementById('goalId').value;
        const goalData = {
            title: document.getElementById('goalTitle').value,
            description: document.getElementById('goalDescription').value,
            color: document.getElementById('goalColor').value,
            priority: parseInt(document.getElementById('goalPriority').value),
            timelineStart: document.getElementById('goalTimelineStart').value || null,
            timelineEnd: document.getElementById('goalTimelineEnd').value || null,
            tags: document.getElementById('goalTags').value.split(',').map(t => t.trim()).filter(t => t)
        };
        
        if (id) {
            DataManager.updateGoal(id, goalData);
            this.showToast('Goal updated!', 'success');
        } else {
            DataManager.addGoal(goalData);
            this.showToast('Goal created!', 'success');
        }
        
        this.closeGoalModal();
        this.render();
    },
    
    openTaskModal(taskId = null) {
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        form.reset();
        
        const goals = DataManager.getGoals();
        document.getElementById('taskGoal').innerHTML = '<option value="">No Goal</option>' +
            goals.map(g => `<option value="${g.id}">${this.escapeHtml(g.title)}</option>`).join('');
        
        if (taskId) {
            const task = DataManager.getTask(taskId);
            document.getElementById('taskModalTitle').textContent = 'Edit Task';
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskGoal').value = task.goalId || '';
            document.getElementById('taskNotes').value = task.notes || '';
            document.getElementById('taskEstimatedMinutes').value = task.estimatedMinutes;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskDueDate').value = this.toLocalDateTime(task.dueDate);
            document.getElementById('taskTags').value = task.tags.join(', ');
            
            if (task.reminder && task.reminder.enabled) {
                document.getElementById('reminderEnabled').checked = true;
                document.getElementById('reminderOptions').classList.remove('hidden');
                document.getElementById('reminderAt').value = this.toLocalDateTime(task.reminder.at);
                document.getElementById('reminderRepeat').value = task.reminder.repeat;
            }
        } else {
            document.getElementById('taskModalTitle').textContent = 'New Task';
            document.getElementById('taskId').value = '';
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('taskDueDate').value = this.toLocalDateTime(tomorrow.toISOString());
        }
        
        modal.classList.add('active');
    },
    
    closeTaskModal() {
        document.getElementById('taskModal').classList.remove('active');
    },
    
    saveTask() {
        const id = document.getElementById('taskId').value;
        const taskData = {
            title: document.getElementById('taskTitle').value,
            goalId: document.getElementById('taskGoal').value || null,
            notes: document.getElementById('taskNotes').value,
            estimatedMinutes: parseInt(document.getElementById('taskEstimatedMinutes').value),
            priority: parseInt(document.getElementById('taskPriority').value),
            dueDate: new Date(document.getElementById('taskDueDate').value).toISOString(),
            tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t),
            reminder: {
                enabled: document.getElementById('reminderEnabled').checked,
                at: document.getElementById('reminderEnabled').checked ? 
                    new Date(document.getElementById('reminderAt').value).toISOString() : null,
                repeat: document.getElementById('reminderRepeat').value
            }
        };
        
        if (id) {
            taskData.completed = DataManager.getTask(id).completed;
            DataManager.updateTask(id, taskData);
            this.showToast('Task updated!', 'success');
        } else {
            taskData.completed = false;
            DataManager.addTask(taskData);
            this.showToast('Task created!', 'success');
        }
        
        this.closeTaskModal();
        this.render();
    },
    
    openHelpModal() {
        document.getElementById('helpModal').classList.add('active');
    },
    
    closeHelpModal() {
        document.getElementById('helpModal').classList.remove('active');
    },
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    },
    
    formatDateTime(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit' 
        });
    },
    
    toLocalDateTime(isoString) {
        const date = new Date(isoString);
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60000);
        return localDate.toISOString().slice(0, 16);
    }
};

// ===========================
// Application Controller
// ===========================
const app = {
    init() {
        DataManager.init();
        UI.init();
        NotificationManager.init();
    },
    
    toggleTask(id) {
        DataManager.toggleTaskComplete(id);
        UI.render();
    },
    
    editGoal(id) {
        UI.openGoalModal(id);
    },
    
    deleteGoal(id) {
        if (confirm('Delete this goal and all its tasks?')) {
            DataManager.deleteGoal(id);
            UI.showToast('Goal deleted', 'success');
            UI.render();
        }
    },
    
    editTask(id) {
        UI.openTaskModal(id);
    },
    
    deleteTask(id) {
        if (confirm('Delete this task?')) {
            DataManager.deleteTask(id);
            UI.showToast('Task deleted', 'success');
            UI.render();
        }
    },
    
    completeTask(id) {
        const task = DataManager.getTask(id);
        if (task && !task.completed) {
            DataManager.toggleTaskComplete(id);
            UI.showToast('Task completed!', 'success');
            UI.render();
        }
    },
    
    snoozeReminder(id, minutes) {
        NotificationManager.snoozeReminder(id, minutes);
    },
    
    closeGoalModal() {
        UI.closeGoalModal();
    },
    
    closeTaskModal() {
        UI.closeTaskModal();
    },
    
    closeHelpModal() {
        UI.closeHelpModal();
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}