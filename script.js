// ==================== SUPABASE CLIENT ====================
const SUPABASE_URL = 'https://vikxhiolaoxsmyarrrwm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpa3hoaW9sYW94c215YXJycndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0OTA4OTMsImV4cCI6MjA5MzA2Njg5M30.hOvhm4qBQkE9diNVIFQxYWl8xTtcvyhXtF237yRrqms';

let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase initialized');
} catch (e) {
    console.error('Supabase failed:', e);
    supabaseClient = null;
}

// ==================== STORE ====================
const store = {
    user: null,
    family: null,
    familyMembers: [],
    chores: [],
    pendingCompletions: [],
    shoppingList: [],
    todos: [],
    recipes: [],
    calendarEvents: [],
    leaderboard: [],
    messages: [],
    budgetEntries: [],
    transactions: [],
    notifications: [],
    badges: [],
    storeItems: [],
    loading: {},
    channels: {},
    currentPage: 'login'
};


// ==================== ROOM CONFIGURATION ====================
const ROOMS = [
    'Bathroom', 'Kitchen', 'Living Room', 'Boys Bedroom', 'Girls Bedroom',
    'Playroom', 'Van', 'Truck', 'Outside', 'Random',
    'Zues (Dog)', 'Turbo (Cat)', 'Mom and Dads Room',
    'Dads Game Room', 'Moms Art/Laundry Room'
];

let signupMode = 'create';

function setSignupMode(mode) {
    signupMode = mode;

    const familyName = document.getElementById('familyName');
    const familyCode = document.getElementById('familyCode');

    if (mode === 'create') {
        familyName.style.display = 'block';
        familyCode.style.display = 'none';
    } else {
        familyName.style.display = 'none';
        familyCode.style.display = 'block';
    }
}

function getUserColor(userId) {
    // Handle Supabase joined object: { id, display_name, username }
    if (userId && typeof userId === 'object') {
        const name = (userId.display_name || userId.username || '').toLowerCase();
        if (name.includes('mom')) return 'var(--color-mom)';
        if (name.includes('dad')) return 'var(--color-dad)';
        if (name.includes('jaxon')) return 'var(--color-jaxon)';
        if (name.includes('peyton')) return 'var(--color-peyton)';
        return 'var(--color-default)';
    }
    // Handle raw UUID string
    const member = store.familyMembers.find(m => m.id === userId);
    if (!member) return 'var(--color-default)';
    const name = (member.display_name || member.username || '').toLowerCase();
    if (name.includes('mom')) return 'var(--color-mom)';
    if (name.includes('dad')) return 'var(--color-dad)';
    if (name.includes('jaxon')) return 'var(--color-jaxon)';
    if (name.includes('peyton')) return 'var(--color-peyton)';
    return 'var(--color-default)';
}

function getUserColorHex(userId) {
    // Handle Supabase joined object: { id, display_name, username }
    if (userId && typeof userId === 'object') {
        const name = (userId.display_name || userId.username || '').toLowerCase();
        if (name.includes('mom')) return '#22c55e';
        if (name.includes('dad')) return '#ef4444';
        if (name.includes('jaxon')) return '#3b82f6';
        if (name.includes('peyton')) return '#ec4899';
        return '#6366f1';
    }
    // Handle raw UUID string
    const member = store.familyMembers.find(m => m.id === userId);
    if (!member) return '#6366f1';
    const name = (member.display_name || member.username || '').toLowerCase();
    if (name.includes('mom')) return '#22c55e';
    if (name.includes('dad')) return '#ef4444';
    if (name.includes('jaxon')) return '#3b82f6';
    if (name.includes('peyton')) return '#ec4899';
    return '#6366f1';
}

function getUserName(userId) {
    // Handle Supabase joined object: { id, display_name, username }
    if (userId && typeof userId === 'object') {
        return userId.display_name || userId.username || 'Unknown';
    }
    // Handle raw UUID string
    const member = store.familyMembers.find(m => m.id === userId);
    return member ? (member.display_name || member.username) : 'Unknown';
}

// ==================== NAVIGATION ====================
function navigateTo(page) {
    store.currentPage = page;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    const titles = {
        dashboard: 'Dashboard',
        chores: 'Chore List',
        shopping: 'Shopping List',
        todo: 'To-Do List',
        recipes: 'Recipes',
        store: 'Kid Store',
        calendar: 'Calendar',
        leaderboard: 'Leaderboard',
        messages: 'Messaging',
        budget: 'Budget',
        admin: 'Admin & Profile'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';
    
    // Show/hide add button per page
    const addBtn = document.getElementById('addBtn');
    const noAddPages = ['dashboard', 'leaderboard', 'messages', 'admin'];
    addBtn.style.display = noAddPages.includes(page) ? 'none' : 'inline-flex';
    
    renderPage(page);
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function renderPage(page) {
    const container = document.getElementById('contentArea');
    container.innerHTML = '';
    
    switch(page) {
        case 'dashboard': renderDashboard(container); break;
        case 'chores': renderChores(container); break;
        case 'shopping': renderShopping(container); break;
        case 'todo': renderTodo(container); break;
        case 'recipes': renderRecipes(container); break;
        case 'store': renderStore(container); break;
        case 'calendar': renderCalendar(container); break;
        case 'leaderboard': renderLeaderboard(container); break;
        case 'messages': renderMessages(container); break;
        case 'budget': renderBudget(container); break;
        case 'admin': renderAdmin(container); break;
        default: renderDashboard(container);
    }
}

function refreshData() {
    const btn = event.target;
    btn.textContent = '⏳ Refreshing...';
    loadFamilyData().then(() => {
        renderPage(store.currentPage);
        btn.textContent = '🔄 Refresh';
    });
}

// ==================== MODAL ====================
function showModal(title, html) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `<div class="modal-body">${html}</div>`;
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal(e) {
    if (!e || e.target === document.getElementById('modalOverlay') || e.target.closest('button')) {
        document.getElementById('modalOverlay').classList.add('hidden');
    }
}

function showAddModal() {
    const page = store.currentPage;
    switch(page) {
        case 'todo': showAddTodoModal(); break;
        case 'shopping': showAddShoppingModal(); break;
        case 'chores': showAddChoreModal(); break;
        case 'recipes': showAddRecipeModal(); break;
        case 'calendar': showAddEventModal(); break;
        case 'budget': showAddBudgetModal(); break;
        case 'store': showAddStoreItemModal(); break;
    }
}

// ==================== AUTH ====================
async function initApp() {
    if (!supabaseClient) {
        document.getElementById('contentArea').innerHTML = '<div style="text-align:center;padding:60px;"><h2 style="color:var(--danger)">Connection Error</h2></div>';
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await bootstrapUser(session.user.id);
    } else {
        showLoginScreen();
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        if (event === 'SIGNED_IN' && session) {
            await bootstrapUser(session.user.id);
        }
        if (event === 'SIGNED_OUT') {
            showLoginScreen();
        }
    });
}

async function login(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const btn = e.submitter;
    btn.textContent = 'Logging in...';
    btn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // proceed to app
        showApp();

    } catch (err) {
        alert(err.message);
    } finally {
        btn.textContent = 'Login';
        btn.disabled = false;
    }
}

function setSignupMode(mode) {
    signupMode = mode;
    const nameInput = document.getElementById('familyName');
    const codeInput = document.getElementById('familyCode');
    const btnCreate = document.getElementById('modeCreate');
    const btnJoin = document.getElementById('modeJoin');
    
    if (mode === 'create') {
        nameInput.style.display = 'block';
        nameInput.placeholder = 'Family Name';
        codeInput.style.display = 'none';
        codeInput.value = '';
        btnCreate.className = 'btn btn-primary';
        btnCreate.style.cssText = 'flex:1;justify-content:center;font-size:0.8rem;';
        btnJoin.className = 'btn btn-ghost';
        btnJoin.style.cssText = 'flex:1;justify-content:center;font-size:0.8rem;';
    } else {
        nameInput.style.display = 'none';
        nameInput.value = '';
        codeInput.style.display = 'block';
        btnCreate.className = 'btn btn-ghost';
        btnCreate.style.cssText = 'flex:1;justify-content:center;font-size:0.8rem;';
        btnJoin.className = 'btn btn-primary';
        btnJoin.style.cssText = 'flex:1;justify-content:center;font-size:0.8rem;';
    }
}

async function signup(e) {
    e.preventDefault();

    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const familyName = document.getElementById('familyName').value.trim();
    const familyCode = document.getElementById('familyCode').value.trim();

    const btn = e.submitter;
    btn.textContent = 'Creating...';
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;

        const userId = data.user.id;

        if (signupMode === 'create') {
            const { error } = await supabaseClient.rpc('signup_create_family', {
                p_user_id: userId,
                p_email: email,
                p_family_name: familyName || 'My Family'
            });

            if (error) {
                console.error("CREATE FAMILY ERROR:", error);
                alert(error.message);
                return;
            }

        } else {
            const { error } = await supabaseClient.rpc('signup_join_family', {
                p_user_id: userId,
                p_email: email,
                p_family_code: familyCode.trim().toUpperCase()
            });

            if (error) {
                console.error("JOIN FAMILY ERROR:", error);
                alert(error.message);
                return;
            }
        }

        alert('Account created! Please log in.');

    } catch (err) {
        alert(err.message);
    } finally {
        btn.textContent = 'Sign Up';
        btn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Forms
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    // Tabs
    const showLogin = document.getElementById('showLogin');
    const showSignup = document.getElementById('showSignup');

    // Toggle views
    showLogin.addEventListener('click', () => {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });

    showSignup.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    // Attach handlers
    loginForm.addEventListener('submit', login);
    signupForm.addEventListener('submit', signup);

    // Signup mode toggle
    document.getElementById('modeCreate').addEventListener('click', () => setSignupMode('create'));
    document.getElementById('modeJoin').addEventListener('click', () => setSignupMode('join'));
});
async function bootstrapUser(userId) {

    const profile = await loadUserProfile(userId);

    if (!profile) {
        console.error('Profile missing for user:', userId);

        // DO NOT retry
        // DO NOT loop
        await supabaseClient.auth.signOut();
        showLoginScreen();

        alert('Account setup failed. Please try signing up again.');
        return;
    }

    store.user = profile;
    store.family = null;

    // Load family once (if exists)
    if (profile.family_id) {
        const { data: fam } = await supabaseClient
            .from('families')
            .select('*')
            .eq('id', profile.family_id)
            .maybeSingle();

        if (fam) {
            fam.code = fam.family_code;
            store.family = fam;
        }
    }

    const displayName = profile.display_name || profile.username;

    document.getElementById('userName').textContent = displayName;
    document.getElementById('userAvatar').textContent =
        displayName.substring(0, 2).toUpperCase();

    document.getElementById('userAvatar').style.background =
        getUserColorHex(profile.id);

    document.getElementById('userRole').textContent = profile.role;

    await loadFamilyData();
    setupRealtimeSubscriptions();
    showApp();
    navigateTo('dashboard');
}

async function loadUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*, families(*)')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Profile load error:', error);
        return null;
    }
    
    if (!data) {
        console.log('Profile not found for user:', userId);
        return null;
    }

    // Handle array vs object from Supabase join
    if (data.families) {
        if (Array.isArray(data.families)) {
            data.families = data.families[0] || null;
        }
    }

    // Fallback: fetch family directly if join didn't work
    if (data.family_id && !data.families) {
        const { data: fam, error: famError } = await supabaseClient
            .from('families')
            .select('*')
            .eq('id', data.family_id)
            .maybeSingle();
        if (!famError && fam) {
            data.families = fam;
        }
    }

    // Generate a shareable code if the families table doesn't have a code column
    if (data.families && data.families.id) {
        // Use last 6 chars of UUID as the family code (uppercase, no dashes)
    }

    return data;
}

function showLoginScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.querySelector('.app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.querySelector('.app-container').style.display = 'flex';
}

async function logout() {
    await supabaseClient.auth.signOut();
    store.user = null;
    store.family = null;
    Object.values(store.channels).forEach(ch => ch.unsubscribe());
    store.channels = {};
    location.reload();
}

// ==================== FAMILY DATA LOADING ====================
async function loadFamilyData() {
    if (!store.user?.family_id) return;

    const { data: members } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('family_id', store.user.family_id);
    store.familyMembers = members || [];

    await Promise.all([
        loadChores(),
        loadShoppingList(),
        loadTodos(),
        loadRecipes(),
        loadCalendarEvents(),
        loadMessages(),
        loadBudget(),
        loadLeaderboard(),
        loadStoreItems()
    ]);
}

// ==================== DATA LOADING ====================
async function loadChores() {
    store.loading.chores = true;
    
    // Load active chores
    const { data, error } = await supabaseClient
        .from('chores')
        .select('*, profiles!chores_assigned_to_fkey(id, display_name, username)')
        .eq('family_id', store.user.family_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    
    if (error) { console.error('Error loading chores:', error); store.loading.chores = false; return; }
    const now = new Date();

store.chores = (data || []).filter(chore => {
    if (!chore.last_completed_at) return true;

    const last = new Date(chore.last_completed_at);

    switch (chore.recurrence) {
        case 'daily':
            return last.toDateString() !== now.toDateString();

        case 'weekly':
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            return (now - last) >= oneWeek;

        case 'monthly':
            return (
                last.getMonth() !== now.getMonth() ||
                last.getFullYear() !== now.getFullYear()
            );

        default:
            return true;
    }
});
    
    // Load pending completions
    const { data: completions, error: compError } = await supabaseClient
        .from('chore_completions')
        .select(`*, chore:chores(*)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
    if (compError) {
        console.error('Error loading completions:', compError);
        store.pendingCompletions = [];
    } else {
        store.pendingCompletions = (completions || []).filter(pc => {
            const chore = pc.chore;
            return chore && chore.family_id === store.user.family_id;
        });
    }
    
    store.loading.chores = false;
}

async function loadShoppingList() {
    const { data, error } = await supabaseClient
        .from('shopping_list')
        .select(`*, recipe:recipes(id, name)`)
        .eq('family_id', store.user.family_id)
        .eq('purchased', false)
        .order('created_at', { ascending: false });
    
    if (error) { console.error('Error loading shopping:', error); return; }
    store.shoppingList = data || [];
}

async function loadTodos() {
    const { data, error } = await supabaseClient
        .from('todos')
        .select(`*, assigned_to:profiles!todos_assigned_to_fkey(id, display_name, username)`)
        .eq('family_id', store.user.family_id)
        .eq('completed', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
    
    if (error) { console.error('Error loading todos:', error); return; }
    store.todos = data || [];
}

async function loadRecipes() {
    // Admin family sees all recipes, others see their own + admin recipes
    const adminFamilyId = 'd6090e1c-175e-42a9-8477-b53aed5b3c09'; // Your admin family code
    const { data, error } = await supabaseClient
        .from('recipes')
        .select('*')
        .or(`family_id.eq.${store.user.family_id},family_id.eq.${adminFamilyId}`)
        .order('created_at', { ascending: false });
    
    if (error) { console.error('Error loading recipes:', error); return; }
    store.recipes = data || [];
}

async function loadCalendarEvents() {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    
    const { data, error } = await supabaseClient
        .from('calendar_events')
        .select(`*, assigned_to:profiles!calendar_events_assigned_to_fkey(id, display_name, username)`)
        .eq('family_id', store.user.family_id)
        .or(`start_time.gte.${startOfMonth.toISOString()},start_time.lte.${endOfMonth.toISOString()}`)
        .or(`end_time.gte.${startOfMonth.toISOString()},end_time.is.null`)
        .order('start_time', { ascending: true });
    
    if (error) { console.error('Error loading calendar:', error); return; }
    store.calendarEvents = data || [];
}

async function loadMessages() {
    const { data, error } = await supabaseClient
        .from('messages')
        .select(`*, sender:profiles(id, display_name, username, avatar_url)`)
        .eq('family_id', store.user.family_id)
        .order('created_at', { ascending: true })
        .limit(100);
    
    if (error) { console.error('Error loading messages:', error); return; }
    store.messages = data || [];
}

async function loadBudget() {
    const { data: entries } = await supabaseClient
        .from('budget_entries')
        .select('*')
        .eq('family_id', store.user.family_id)
        .order('due_date', { ascending: true });
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: transactions } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('family_id', store.user.family_id)
        .gte('created_at', startOfMonth.toISOString())
        .not('description', 'ilike', '%store purchase%')
        .not('description', 'ilike', '%kid store%')
        .not('description', 'ilike', '%purchased%')
        .order('created_at', { ascending: false });
    
    store.budgetEntries = entries || [];
    store.transactions = transactions || [];
}

async function loadLeaderboard() {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, display_name, username, points, level, balance, streak_days')
        .eq('family_id', store.user.family_id)
        .order('points', { ascending: false });
    
    if (error) { console.error('Error loading leaderboard:', error); return; }
    store.leaderboard = data || [];
}

async function loadStoreItems() {
    const { data, error } = await supabaseClient
        .from('shop_items')
        .select('*')
        .eq('family_id', store.user.family_id)
        .eq('is_available', true)
        .order('created_at', { ascending: false });
    
    if (error) { console.error('Error loading store:', error); return; }
    store.storeItems = data || [];
}

// ==================== REAL-TIME ====================
function setupRealtimeSubscriptions() {
    const familyId = store.user.family_id;
    const tables = [
        'chores', 'shopping_list', 'todos', 'recipes',
        'calendar_events', 'messages', 'budget_entries', 'shop_items'
    ];
    
    tables.forEach(table => {
        const channel = supabaseClient
            .channel(`${table}-changes`)
            .on('postgres_changes', {
                event: '*', schema: 'public', table: table,
                filter: `family_id=eq.${familyId}`
            }, (payload) => {
                console.log(`${table} changed:`, payload);
                handleRealtimeUpdate(table);
            })
            .subscribe();
        store.channels[table] = channel;
    });
}

function handleRealtimeUpdate(table) {
    switch(table) {
        case 'chores': loadChores().then(() => { if (store.currentPage === 'chores') renderPage('chores'); }); break;
        case 'shopping_list': loadShoppingList().then(() => { if (store.currentPage === 'shopping') renderPage('shopping'); }); break;
        case 'todos': loadTodos().then(() => { if (store.currentPage === 'todo') renderPage('todo'); }); break;
        case 'recipes': loadRecipes().then(() => { if (store.currentPage === 'recipes') renderPage('recipes'); }); break;
        case 'calendar_events': loadCalendarEvents().then(() => { if (store.currentPage === 'calendar') renderPage('calendar'); }); break;
        case 'messages': loadMessages().then(() => { if (store.currentPage === 'messages') renderPage('messages'); }); break;
        case 'budget_entries': loadBudget().then(() => { if (store.currentPage === 'budget') renderPage('budget'); }); break;
        case 'shop_items': loadStoreItems().then(() => { if (store.currentPage === 'store') renderPage('store'); }); break;
    }
}

// ==================== MUTATIONS ====================
async function addTodo(title, description, priority, assignedTo) {
    const { error } = await supabaseClient.from('todos').insert({
        family_id: store.user.family_id,
        title, description, priority,
        assigned_to: assignedTo || null,
        created_by: store.user.id
    }).select();
    if (error) { alert('Error: ' + error.message); return false; }
    await loadTodos();
    renderPage('todo');
    return true;
}

async function toggleTodo(todoId, completed) {
    const { error } = await supabaseClient.from('todos').update({
        completed,
        completed_at: completed ? new Date().toISOString() : null
    }).eq('id', todoId).select();
    if (error) { alert('Error: ' + error.message); return; }
    await loadTodos();
    renderPage('todo');
}

async function deleteTodo(todoId) {
    const isAdmin = store.user?.role === 'admin' || store.user?.role === 'adult';
    if (!isAdmin) { alert('Only adults/admins can delete to-dos.'); return; }
    if (!confirm('Delete this to-do?')) return;
    const { error } = await supabaseClient.from('todos').delete().eq('id', todoId).select();
    if (error) { alert('Error: ' + error.message); return; }
    await loadTodos();
    renderPage('todo');
}

async function addShoppingItem(itemName, quantity, recipeId) {
    const { error } = await supabaseClient.from('shopping_list').insert({
        family_id: store.user.family_id,
        item_name: itemName,
        quantity: quantity || '1',
        recipe_id: recipeId || null,
        created_by: store.user.id
    }).select();
    if (error) { alert('Error: ' + error.message); return false; }
    await loadShoppingList();
    renderPage('shopping');
    return true;
}

async function toggleShoppingItem(itemId, purchased) {
    const { error } = await supabaseClient.from('shopping_list').update({
        purchased,
        purchased_at: purchased ? new Date().toISOString() : null
    }).eq('id', itemId).select();
    if (error) { alert('Error: ' + error.message); return; }
    await loadShoppingList();
    renderPage('shopping');
}

async function deleteShoppingItem(itemId) {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabaseClient.from('shopping_list').delete().eq('id', itemId).select();
    if (error) { alert('Error: ' + error.message); return; }
    await loadShoppingList();
    renderPage('shopping');
}

async function clearPurchasedItems() {
    if (!confirm('Delete all purchased items?')) return;
    const { error } = await supabaseClient
        .from('shopping_list')
        .delete()
        .eq('family_id', store.user.family_id)
        .eq('purchased', true).select();
    if (error) { alert('Error: ' + error.message); return; }
    await loadShoppingList();
    renderPage('shopping');
}

async function addChore(title, description, value, points, category, room, recurrence, assignedTo) {
    const { error } = await supabaseClient.from('chores').insert({
        family_id: store.user.family_id,
        title, description,
        value: value || 0,
        points: points || 0,
        category, room,
        recurrence: recurrence || 'none',
        assigned_to: assignedTo || null,
        created_by: store.user.id
    }).select();
    if (error) { alert('Error: ' + error.message); return false; }
    await loadChores();
    renderPage('chores');
    return true;
}

async function completeChore(choreId) {
    console.log('completeChore:', { choreId, userId: store.user?.id });
    
    const { data, error } = await supabaseClient.from('chore_completions').insert({
        chore_id: choreId,
        completed_by: store.user.id,
        status: 'pending'
    }).select();
    
    console.log('completeChore result:', { data, error });
    
    if (error) { alert('Error: ' + error.message); return; }
    alert('Chore submitted for approval!');
    await loadChores();
    renderPage('chores');
}

async function approveChore(completionId, choreId, userId, points, value) {
    const isAdmin = store.user?.role === 'admin' || store.user?.role === 'adult';
    if (!isAdmin) { alert('Only parents/admins can approve chores.'); return; }
    
    // Step 1: Update completion status
    const { error: updateError } = await supabaseClient
        .from('chore_completions')
        .update({ 
            status: 'approved', 
            approved_by: store.user.id, 
            approved_at: new Date().toISOString() 
        })
        .eq('id', completionId)
        .select();
        
    if (updateError) { 
        alert('Error approving: ' + updateError.message); 
        return; 
    }
    
    // Step 2: Award points and money with level multiplier
    const member = store.familyMembers.find(m => m.id === userId);
    const level = member?.level || 1;
    const multiplier = parseFloat(getLevelMultiplier(level));
    const finalPoints = Math.round((points || 0) * multiplier);
    const finalValue = parseFloat((value || 0) * multiplier);
    
    const newPoints = (member?.points || 0) + finalPoints;
    const newBalance = (member?.balance || 0) + finalValue;
    const newLevel = getLevelFromPoints(newPoints);
    
    const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
            points: newPoints,
            balance: newBalance,
            level: newLevel
        })
        .eq('id', userId)
        .select();
    
    if (profileError) {
        alert('Error awarding points: ' + profileError.message);
        return;
    }
    
    // Step 3: Update last completed time on the chore
    await supabaseClient
        .from('chores')
        .update({ last_completed_at: new Date().toISOString() })
        .eq('id', choreId);

    alert('Chore approved! ' + finalPoints + ' pts and $' + finalValue.toFixed(2) + ' awarded.');

    await loadFamilyData();
    await loadChores();
    renderPage('chores');
}

async function rejectChore(completionId) {
    const isAdmin = store.user?.role === 'admin' || store.user?.role === 'adult';
    if (!isAdmin) { alert('Only parents/admins can reject chores.'); return; }
    
    const { error } = await supabaseClient
        .from('chore_completions')
        .update({ 
            status: 'rejected', 
            reviewed_by: store.user.id, 
            reviewed_at: new Date().toISOString() 
        })
        .eq('id', completionId)
        .select();
    
    if (error) { alert('Error: ' + error.message); return; }
    alert('Chore rejected.');
    await loadChores();
    renderPage('chores');
}

async function addRecipe(name, description, ingredients, instructions, foodType) {
    const { error } = await supabaseClient.from('recipes').insert({
        family_id: store.user.family_id,
        name, description, ingredients, instructions,
        food_type: foodType,
        created_by: store.user.id
    }).select();
    if (error) { alert('Error: ' + error.message); return false; }
    await loadRecipes();
    renderPage('recipes');
    return true;
}

async function addCalendarEvent(title, description, startTime, endTime, eventType, location, assignedTo, recurrence) {
    const payload = {
        family_id: store.user.family_id,
        title, 
        description,
        start_time: startTime,
        end_time: endTime || null,
        event_type: eventType,
        location: location || null,
        assigned_to: assignedTo || null,
        recurrence: recurrence || 'none',
        created_by: store.user.id
    };
    
    console.log('Calendar insert payload:', payload);
    
    const { data, error } = await supabaseClient.from('calendar_events').insert(payload).select();
    
    console.log('Calendar insert result:', { data, error });
    
    if (error) { 
        alert('Error: ' + error.message); 
        console.error('Calendar insert error details:', error);
        return false; 
    }
    await loadCalendarEvents();
    renderPage('calendar');
    return true;
}

async function sendMessage(text) {
    const { error } = await supabaseClient.from('messages').insert({
        family_id: store.user.family_id,
        sender_id: store.user.id,
        message: text
    }).select();
    if (error) { alert('Error: ' + error.message); return; }
    document.getElementById('messageInput').value = '';
    await loadMessages();
    renderPage('messages');
}

async function addBudgetEntry(title, amount, entryType, category, dueDate, isRecurring, recurrenceType) {
    const { error } = await supabaseClient.from('budget_entries').insert({
        family_id: store.user.family_id,
        title, amount: parseFloat(amount),
        entry_type: entryType,
        category: category || null,
        due_date: dueDate || null,
        is_recurring: isRecurring || false,
        recurrence_type: recurrenceType || 'none',
        created_by: store.user.id
    }).select();
    if (error) { alert('Error: ' + error.message); return false; }
    await loadBudget();
    renderPage('budget');
    return true;
}

async function addStoreItem(name, description, price) {
    const { error } = await supabaseClient.from('shop_items').insert({
        family_id: store.user.family_id,
        name, description,
        price: parseFloat(price),
        created_by: store.user.id
    }).select();
    if (error) { alert('Error: ' + error.message); return false; }
    await loadStoreItems();
    renderPage('store');
    return true;
}

async function purchaseStoreItem(itemId, price) {
    if (store.user.balance < price) {
        alert('Not enough balance!');
        return;
    }
    const { error } = await supabaseClient.rpc('purchase_shop_item', {
        p_user_id: store.user.id,
        p_item_id: itemId
    }).select();
    if (error) { alert('Error: ' + error.message); return; }
    alert('Purchased!');
    await loadFamilyData();
    renderPage('store');
}

// ==================== RENDER: DASHBOARD ====================
function renderDashboard(container) {
    const totalIncome = store.budgetEntries
        .filter(e => e.entry_type === 'income')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalExpenses = store.budgetEntries
        .filter(e => e.entry_type === 'expense')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balance = totalIncome - totalExpenses;

    container.innerHTML = `
        <div class="fade-in">
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-title" style="color:var(--primary);">⭐ Points</div>
                    <div class="stat-value" style="color:var(--primary);">${store.user?.points || 0}</div>
                    <div class="stat-label">Your total points</div>
                </div>
                <div class="card">
                    <div class="card-title" style="color:var(--success);">💰 Balance</div>
                    <div class="stat-value" style="color:var(--success);">$${(store.user?.balance || 0).toFixed(2)}</div>
                    <div class="stat-label">Your chore earnings</div>
                </div>
                <div class="card">
                    <div class="card-title" style="color:var(--warning);">🏆 Level ${store.user?.level || 1}</div>
                    <div class="stat-value" style="color:var(--warning);">${getLevelMultiplier(store.user?.level || 1)}x</div>
                    <div class="stat-label">Point & money multiplier</div>
                </div>
                <div class="card">
                    <div class="card-title" style="color:var(--secondary);">📋 To-Dos</div>
                    <div class="stat-value" style="color:var(--secondary);">${store.todos.length}</div>
                    <div class="stat-label">Pending tasks</div>
                </div>
                <div class="card">
                    <div class="card-title" style="color:var(--danger);">🧹 Chores</div>
                    <div class="stat-value" style="color:var(--danger);">${store.chores.length}</div>
                    <div class="stat-label">Available chores</div>
                </div>
                <div class="card">
                    <div class="card-title" style="color:var(--text-muted);">💵 Budget</div>
                    <div class="stat-value" style="color:${balance >= 0 ? 'var(--success)' : 'var(--danger)'};">$${balance.toFixed(2)}</div>
                    <div class="stat-label">Monthly balance</div>
                </div>
            </div>
            
            <div class="card" style="margin-top:20px;">
                <div class="card-header">
                    <div class="card-title">👥 Family Members</div>
                </div>
                <div style="display:flex;gap:16px;flex-wrap:wrap;">
                    ${store.familyMembers.map(m => `
                        <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:var(--bg);border-radius:8px;">
                            <div class="user-badge" style="background:${getUserColorHex(m.id)};"></div>
                            <span>${m.display_name || m.username}</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);text-transform:capitalize;">${m.role}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function getLevelMultiplier(level) {
    if (!level || level <= 1) return '1.0';
    if (level >= 20) return '2.9';
    return (1.0 + (level - 1) * 0.1).toFixed(1);
}

// ==================== RENDER: TO-DO LIST ====================
function renderTodo(container) {
    if (store.loading.todos) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Loading...</div>';
        return;
    }

    const myTodos = store.todos.filter(t => t.assigned_to === store.user.id || !t.assigned_to);
    const familyTodos = store.todos.filter(t => t.assigned_to && t.assigned_to !== store.user.id);

    container.innerHTML = `
        <div class="fade-in">
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                <button class="btn btn-primary" onclick="showAddTodoModal()">+ Add To-Do</button>
            </div>
            
            ${renderTodoSection('My To-Dos', myTodos, true)}
            ${renderTodoSection('Family To-Dos', familyTodos, false)}
        </div>
    `;
}

function renderTodoSection(title, todos, canToggle) {
    if (todos.length === 0) return '';
    
    return `
        <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
                <div class="card-title">${title}</div>
            </div>
            <div class="list-container">
                ${todos.map(todo => {
                    const color = getUserColorHex(todo.assigned_to);
                    const priorityClass = `priority-${todo.priority}`;
                    return `
                        <div class="list-item">
                            ${canToggle ? `
                                <div class="checkbox ${todo.completed ? 'checked' : ''}" 
                                     onclick="toggleTodo('${todo.id}', ${!todo.completed})">
                                    ${todo.completed ? '✓' : ''}
                                </div>
                            ` : '<div style="width:22px;"></div>'}
                            <div class="user-badge" style="background:${color};"></div>
                            <div class="list-content">
                                <div class="list-title ${todo.completed ? 'completed' : ''}">${todo.title}</div>
                                <div class="list-meta">
                                    <span class="${priorityClass}">● ${todo.priority}</span>
                                    ${todo.room ? `<span>📍 ${todo.room}</span>` : ''}
                                    <span>👤 ${getUserName(todo.assigned_to)}</span>
                                </div>
                            </div>
                            ${canToggle && (store.user?.role === 'admin' || store.user?.role === 'parent') ? `
                                <button class="btn btn-ghost btn-sm" onclick="deleteTodo('${todo.id}')">🗑️</button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function showAddTodoModal() {
    const memberOptions = store.familyMembers.map(m => 
        `<option value="${m.id}">${m.display_name || m.username}</option>`
    ).join('');
    
    showModal('Add To-Do', `
        <div class="form-group">
            <label class="form-label">Title *</label>
            <input type="text" class="form-input" id="todoTitle" placeholder="What needs to be done?">
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="todoDescription" placeholder="Details..."></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" id="todoPriority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Assigned To</label>
                <select class="form-select" id="todoAssignedTo">
                    <option value="">Unassigned</option>
                    ${memberOptions}
                </select>
            </div>
        </div>
            <div class="form-group">
                <label class="form-label">Room/Location</label>
                <select class="form-select" id="todoRoom">
                    ${ROOMS.map(room => `<option value="${room}">${room}</option>`).join('')}
                </select>
            </div>
        <button class="btn btn-primary w-full" onclick="submitTodo()">Add To-Do</button>
    `);
}

async function submitTodo() {
    const title = document.getElementById('todoTitle').value.trim();
    const description = document.getElementById('todoDescription').value.trim();
    const priority = document.getElementById('todoPriority').value;
    const assignedTo = document.getElementById('todoAssignedTo').value;
    const room = document.getElementById('todoRoom').value;
    
    if (!title) { alert('Title is required'); return; }
    
    const success = await addTodo(title, description, priority, assignedTo || null);
    if (success) closeModal();
}

// ==================== RENDER: SHOPPING LIST ====================
function renderShopping(container) {
    if (store.loading.shopping) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Loading...</div>';
        return;
    }

    const pending = store.shoppingList.filter(s => !s.purchased);
    const purchased = store.shoppingList.filter(s => s.purchased);

    container.innerHTML = `
        <div class="fade-in">
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                <button class="btn btn-primary" onclick="showAddShoppingModal()">+ Add Item</button>
                ${purchased.length > 0 ? `
                    <button class="btn btn-danger" onclick="clearPurchasedItems()">🗑️ Clear Purchased</button>
                ` : ''}
            </div>
            
            ${pending.length === 0 && purchased.length === 0 ? emptyState('🛒', 'Shopping List Empty', 'Add items you need to buy') : ''}
            
            ${pending.length > 0 ? `
                <div class="card" style="margin-bottom:16px;">
                    <div class="card-header">
                        <div class="card-title">📝 Need to Buy (${pending.length})</div>
                    </div>
                    <div class="list-container">
                        ${pending.map(item => `
                            <div class="list-item">
                                <div class="checkbox" onclick="toggleShoppingItem('${item.id}', true)"></div>
                                <div class="list-content">
                                    <div class="list-title">${item.item_name}</div>
                                    <div class="list-meta">
                                        <span>📦 ${item.quantity || '1'}</span>
                                        ${item.recipe ? `<span>🍳 ${item.recipe.name}</span>` : ''}
                                    </div>
                                </div>
                                <button class="btn btn-ghost btn-sm" onclick="deleteShoppingItem('${item.id}')">🗑️</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${purchased.length > 0 ? `
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">✅ Purchased (${purchased.length})</div>
                    </div>
                    <div class="list-container">
                        ${purchased.map(item => `
                            <div class="list-item completed">
                                <div class="checkbox checked" onclick="toggleShoppingItem('${item.id}', false)">✓</div>
                                <div class="list-content">
                                    <div class="list-title">${item.item_name}</div>
                                    <div class="list-meta">
                                        <span>📦 ${item.quantity || '1'}</span>
                                    </div>
                                </div>
                                <button class="btn btn-ghost btn-sm" onclick="deleteShoppingItem('${item.id}')">🗑️</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function showAddShoppingModal() {
    showModal('Add Shopping Item', `
        <div class="form-group">
            <label class="form-label">Item Name *</label>
            <input type="text" class="form-input" id="shopItemName" placeholder="e.g., Milk">
        </div>
        <div class="form-group">
            <label class="form-label">Quantity</label>
            <input type="text" class="form-input" id="shopQuantity" placeholder="e.g., 1 gallon">
        </div>
        <button class="btn btn-primary w-full" onclick="submitShoppingItem()">Add Item</button>
    `);
}

async function submitShoppingItem() {
    const itemName = document.getElementById('shopItemName').value.trim();
    const quantity = document.getElementById('shopQuantity').value.trim();
    if (!itemName) { alert('Item name is required'); return; }
    
    const success = await addShoppingItem(itemName, quantity);
    if (success) closeModal();
}

function emptyState(icon, title, subtitle) {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3>${title}</h3>
            <p style="color:var(--text-muted);margin-bottom:20px;">${subtitle}</p>
        </div>
    `;
}

// ==================== RENDER: CHORES ====================
function renderChores(container) {
    if (store.loading.chores) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Loading...</div>';
        return;
    }

    const isAdmin = store.user?.role === 'admin' || store.user?.role === 'parent';
    const isChild = !isAdmin;

    // Filter chores based on role
    const myChores = store.chores.filter(c => {
    const assignedId = c.assigned_to?.id || c.assigned_to;
    return assignedId === store.user?.id;
});
    const otherChores = store.chores.filter(c => {
    const assignedId = c.assigned_to?.id || c.assigned_to;
    return assignedId !== store.user?.id;
});

    // Group by room helper
    const groupByRoom = (choreList) => {
        const grouped = {};
        ROOMS.forEach(room => grouped[room] = []);
        grouped['Other'] = [];
        
        choreList.forEach(chore => {
            const room = chore.room || 'Other';
            if (grouped[room]) grouped[room].push(chore);
            else grouped['Other'].push(chore);
        });
        
        return grouped;
    };

    // Build room tabs HTML
    const buildRoomTabs = (choreMap, sectionId) => {
        const roomsWithChores = Object.keys(choreMap).filter(r => choreMap[r].length > 0);
        if (roomsWithChores.length === 0) return '';
        
        return `
            <div class="room-tabs" id="tabs-${sectionId}">
                ${roomsWithChores.map((room, idx) => `
                    <button class="room-tab ${idx === 0 ? 'active' : ''}" 
                            onclick="switchRoomTab('${sectionId}', '${room}')"
                            data-room="${room}">
                        ${room}
                        <span class="room-count">${choreMap[room].length}</span>
                    </button>
                `).join('')}
            </div>
            <div class="room-panels" id="panels-${sectionId}">
                ${roomsWithChores.map((room, idx) => `
                    <div class="room-panel ${idx === 0 ? 'active' : ''}" data-room="${room}">
                        ${renderChoreList(choreMap[room])}
                    </div>
                `).join('')}
            </div>
        `;
    };

    // Render a flat list of chores
    const renderChoreList = (choreList) => {
        if (choreList.length === 0) return '<div class="empty-state-small">No chores here</div>';
        
        return `
            <div class="list-container">
                ${choreList.map(chore => {
                    const color = getUserColorHex(chore.assigned_to);
                    const assignedName = getUserName(chore.assigned_to);
                    const points = chore.points || 0;
                    const value = chore.value || 0;
                    const isPending = store.pendingCompletions?.some(pc => 
                        pc.chore_id === chore.id && pc.completed_by === store.user?.id && pc.status === 'pending'
                    );
                    
                    return `
                        <div class="list-item">
                            <div class="user-badge" style="background:${color};"></div>
                            <div class="list-content">
                                <div class="list-title">${chore.title}</div>
                                <div class="list-meta">
                                    <span>👤 ${assignedName}</span>
                                    <span>🏷️ ${chore.category || 'General'}</span>
                                    <span>⭐ ${points} pts</span>
                                    <span>💰 $${value.toFixed(2)}</span>
                                    ${chore.recurrence && chore.recurrence !== 'none' ? `<span>🔄 ${chore.recurrence}</span>` : ''}
                                </div>
                                ${chore.description ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">${chore.description}</div>` : ''}
                            </div>
                            ${!isPending ? `
                                <button class="btn btn-primary btn-sm" onclick="completeChore('${chore.id}')">Complete</button>
                            ` : '<span style="font-size:0.75rem;color:var(--warning);">⏳ Pending</span>'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    // Start building the page
    let html = `<div class="fade-in">`;
    
    // Add button (admins only)
    if (isAdmin) {
        html += `
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                <button class="btn btn-primary" onclick="showAddChoreModal()">+ Add Chore</button>
            </div>
        `;
    }

    // Pending Approvals (admins only, at top)
    if (isAdmin && store.pendingCompletions?.length > 0) {
        html += `
            <div class="card" style="margin-bottom:16px;border:2px solid var(--warning);">
                <div class="card-header">
                    <div class="card-title" style="color:var(--warning);">⏳ Pending Approvals (${store.pendingCompletions.length})</div>
                </div>
                <div class="list-container">
                    ${store.pendingCompletions.map(pc => {
                        const color = getUserColorHex(pc.completed_by);
                        const chore = pc.chore;
                        return `
                            <div class="list-item" style="background:rgba(245, 158, 11, 0.05);">
                                <div class="user-badge" style="background:${color};"></div>
                                <div class="list-content">
                                    <div class="list-title">${chore?.title || 'Unknown Chore'}</div>
                                    <div class="list-meta">
                                        <span>👤 ${getUserName(pc.completed_by)}</span>
                                        <span>⭐ ${chore?.points || 0} pts</span>
                                        <span>💰 $${(chore?.value || 0).toFixed(2)}</span>
                                        <span>⏰ ${new Date(pc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <button class="btn btn-primary btn-sm" onclick="approveChore('${pc.id}', '${pc.chore_id}', '${pc.completed_by}', ${chore?.points || 0}, ${chore?.value || 0})">✓ Approve</button>
                                    <button class="btn btn-danger btn-sm" onclick="rejectChore('${pc.id}')">✕ Reject</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // CHILD VIEW: Only their chores, grouped by room
    if (isChild) {
        if (myChores.length === 0) {
            html += emptyState('🧹', 'No Chores Assigned', 'You have no chores right now. Enjoy your free time!');
        } else {
            const myChoresByRoom = groupByRoom(myChores);
            html += `
                <div class="card" style="margin-bottom:16px;">
                    <div class="card-header">
                        <div class="card-title">🧹 My Chores</div>
                    </div>
                    ${buildRoomTabs(myChoresByRoom, 'my-chores')}
                </div>
            `;
        }
    }

        // ADMIN VIEW: My Chores + Overview with toggle tabs
        if (isAdmin) {
            html += `
                <div class="card" style="margin-bottom:16px;padding:0;">
                    <div class="view-tabs">
                        <button class="view-tab active" onclick="switchAdminView('my-chores')" id="view-tab-my-chores">
                            🧹 My Chores
                            ${myChores.length > 0 ? `<span class="view-count">${myChores.length}</span>` : ''}
                        </button>
                        <button class="view-tab" onclick="switchAdminView('overview')" id="view-tab-overview">
                            👨‍👩‍👧‍👦 Family Overview
                            ${store.chores.length > 0 ? `<span class="view-count">${store.chores.length}</span>` : ''}
                        </button>
                    </div>
                </div>
                
                <div id="admin-view-my-chores" class="admin-view-panel active">
                    ${myChores.length === 0 ? 
                        emptyState('🧹', 'No Chores Assigned', 'You have no personal chores. Add some or check the Family Overview.') : 
                        `<div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary);">
                            <div class="card-header">
                                <div class="card-title">🧹 My Chores</div>
                            </div>
                            ${buildRoomTabs(groupByRoom(myChores), 'admin-my')}
                        </div>`
                    }
                </div>
                
                <div id="admin-view-overview" class="admin-view-panel">
                    ${store.chores.length === 0 ? 
                        emptyState('👨‍👩‍👧‍👦', 'No Family Chores', 'Add chores to see them here.') : 
                        `<div class="card" style="margin-bottom:16px;">
                            <div class="card-header">
                                <div class="card-title">👨‍👩‍👧‍👦 Family Overview</div>
                            </div>
                            ${buildRoomTabs(groupByRoom(store.chores), 'admin-overview')}
                        </div>`
                    }
                </div>
            `;
        }

    html += `</div>`;
    container.innerHTML = html;
}

// ==================== ROOM TAB SWITCHING ====================
function switchRoomTab(sectionId, roomName) {
    const tabsContainer = document.getElementById(`tabs-${sectionId}`);
    if (tabsContainer) {
        tabsContainer.querySelectorAll('.room-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.room === roomName);
        });
    }
    
    const panelsContainer = document.getElementById(`panels-${sectionId}`);
    if (panelsContainer) {
        panelsContainer.querySelectorAll('.room-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.room === roomName);
        });
    }
}

// ==================== ADMIN VIEW SWITCHING ====================
function switchAdminView(viewName) {
    // Update tab buttons
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.getElementById(`view-tab-${viewName}`);
    if (activeTab) activeTab.classList.add('active');
    
    // Update panels
    document.querySelectorAll('.admin-view-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activePanel = document.getElementById(`admin-view-${viewName}`);
    if (activePanel) activePanel.classList.add('active');
}


function showAddChoreModal() {
    const memberOptions = store.familyMembers.map(m => 
        `<option value="${m.id}">${m.display_name || m.username}</option>`
    ).join('');
    
    showModal('Add Chore', `
        <div class="form-group">
            <label class="form-label">Title *</label>
            <input type="text" class="form-input" id="choreTitle" placeholder="What needs to be done?">
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="choreDescription" placeholder="Details..."></textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Points</label>
                <input type="number" class="form-input" id="chorePoints" value="1" min="0">
            </div>
            <div class="form-group">
                <label class="form-label">Value ($)</label>
                <input type="number" class="form-input" id="choreValue" value="0.50" min="0" step="0.01">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="choreCategory">
                    <option value="Cleaning">Cleaning</option>
                    <option value="Organizing">Organizing</option>
                    <option value="Yard Work">Yard Work</option>
                    <option value="Pet Care">Pet Care</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Room/Location</label>
                <select class="form-select" id="choreRoom">
                    ${ROOMS.map(room => `<option value="${room}">${room}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Recurrence</label>
                <select class="form-select" id="choreRecurrence">
                    <option value="none">One Time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Assigned To</label>
                <select class="form-select" id="choreAssignedTo">
                    <option value="">Unassigned</option>
                    ${memberOptions}
                </select>
            </div>
        </div>
        <button class="btn btn-primary w-full" onclick="submitChore()">Add Chore</button>
    `);
}

async function submitChore() {
    const title = document.getElementById('choreTitle').value.trim();
    const description = document.getElementById('choreDescription').value.trim();
    const points = parseInt(document.getElementById('chorePoints').value) || 0;
    const value = parseFloat(document.getElementById('choreValue').value) || 0;
    const category = document.getElementById('choreCategory').value;
    const room = document.getElementById('choreRoom').value;
    const recurrence = document.getElementById('choreRecurrence').value;
    const assignedTo = document.getElementById('choreAssignedTo').value;
    
    if (!title) { alert('Title is required'); return; }
    
    const success = await addChore(title, description, value, points, category, room, recurrence, assignedTo || null);
    if (success) closeModal();
}

// ==================== RENDER: RECIPES ====================
function renderRecipes(container) {
    if (store.loading.recipes) {
        container.innerHTML = '<div class="text-center" style="padding:40px;">Loading...</div>';
        return;
    }

    const drinks = store.recipes.filter(r => r.food_type === 'Drink');
    const appetizers = store.recipes.filter(r => r.food_type === 'Appetizer');
    const entrees = store.recipes.filter(r => r.food_type === 'Entree');
    const snacks = store.recipes.filter(r => r.food_type === 'Snack');
    const uncategorized = store.recipes.filter(r => !r.food_type || !['Drink','Appetizer','Entree','Snack'].includes(r.food_type));

    container.innerHTML = `
        <div class="fade-in">
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                <button class="btn btn-primary" onclick="showAddRecipeModal()">+ Add Recipe</button>
            </div>
            
            ${renderRecipeSection('🥤 Drinks', drinks)}
            ${renderRecipeSection('🥟 Appetizers', appetizers)}
            ${renderRecipeSection('🍽️ Entrees', entrees)}
            ${renderRecipeSection('🍿 Snacks', snacks)}
            ${renderRecipeSection('📋 Other', uncategorized)}
        </div>
    `;
}

function renderRecipeSection(title, recipes) {
    if (recipes.length === 0) return '';
    
    return `
        <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
                <div class="card-title">${title}</div>
            </div>
            <div class="list-container">
                ${recipes.map(recipe => {
                    const ingredients = parseIngredients(recipe.ingredients);
                    return `
                        <div class="list-item" style="flex-direction:column;align-items:flex-start;">
                            <div style="display:flex;align-items:center;gap:12px;width:100%;">
                                <div class="list-content" style="flex:1;">
                                    <div class="list-title">${recipe.name}</div>
                                    <div class="list-meta">
                                        <span>🍳 ${recipe.food_type || 'Uncategorized'}</span>
                                        ${recipe.description ? `<span>${recipe.description}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            ${ingredients.length > 0 ? `
                                <div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;width:100%;">
                                    <div style="font-weight:600;margin-bottom:8px;font-size:0.875rem;">Ingredients:</div>
                                    ${ingredients.map(ing => `
                                        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--surface-light);">
                                            <span>${ing.name}</span>
                                            <span style="color:var(--text-muted);">${ing.amount}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${recipe.instructions ? `
                                <div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;width:100%;">
                                    <div style="font-weight:600;margin-bottom:8px;font-size:0.875rem;">Instructions:</div>
                                    <div style="white-space:pre-wrap;font-size:0.875rem;">${recipe.instructions}</div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function parseIngredients(ingredientsJson) {
    if (!ingredientsJson) return [];
    try {
        return JSON.parse(ingredientsJson);
    } catch(e) {
        return [];
    }
}

function showAddRecipeModal() {
    showModal('Add Recipe', `
        <div class="form-group">
            <label class="form-label">Food Name *</label>
            <input type="text" class="form-input" id="recipeName" placeholder="e.g., Tacos">
        </div>
        <div class="form-group">
            <label class="form-label">Food Type</label>
            <select class="form-select" id="recipeFoodType">
                <option value="Drink">Drink</option>
                <option value="Appetizer">Appetizer</option>
                <option value="Entree" selected>Entree</option>
                <option value="Snack">Snack</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="recipeDescription" placeholder="Brief description..."></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Ingredients</label>
            <div id="ingredientsList">
                <div class="form-row" style="margin-bottom:8px;">
                    <input type="text" class="form-input" placeholder="Item name" class="ing-name">
                    <input type="text" class="form-input" placeholder="Amount" class="ing-amount">
                </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="addIngredientRow()">+ Add Item</button>
        </div>
        <div class="form-group">
            <label class="form-label">Instructions</label>
            <textarea class="form-textarea" id="recipeInstructions" placeholder="Step by step instructions..."></textarea>
        </div>
        <button class="btn btn-primary w-full" onclick="submitRecipe()">Add Recipe</button>
    `);
}

function addIngredientRow() {
    const list = document.getElementById('ingredientsList');
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginBottom = '8px';
    row.innerHTML = `
        <input type="text" class="form-input" placeholder="Item name" class="ing-name">
        <input type="text" class="form-input" placeholder="Amount" class="ing-amount">
    `;
    list.appendChild(row);
}

async function submitRecipe() {
    const name = document.getElementById('recipeName').value.trim();
    const foodType = document.getElementById('recipeFoodType').value;
    const description = document.getElementById('recipeDescription').value.trim();
    const instructions = document.getElementById('recipeInstructions').value.trim();
    
    if (!name) { alert('Food name is required'); return; }
    
    // Collect ingredients
    const rows = document.querySelectorAll('#ingredientsList .form-row');
    const ingredients = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs[0].value.trim()) {
            ingredients.push({
                name: inputs[0].value.trim(),
                amount: inputs[1].value.trim() || '1'
            });
        }
    });
    
    const success = await addRecipe(name, description, JSON.stringify(ingredients), instructions, foodType);
    if (success) closeModal();
}

// ==================== RENDER: CALENDAR ====================
let calendarCurrentDate = new Date();

function renderCalendar(container) {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    
    // Filter events for this month
    const monthEvents = store.calendarEvents.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });

    let daysHtml = '';
    
    // Padding days
    for (let i = 0; i < startPadding; i++) {
        daysHtml += `<div class="calendar-day" style="background:var(--bg);opacity:0.3;"></div>`;
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
        const dayEvents = monthEvents.filter(e => {
            const eventDate = new Date(e.start_time);
            return eventDate.getDate() === day;
        });
        
        daysHtml += `
            <div class="calendar-day ${isToday ? 'today' : ''}" onclick="showDayEvents('${dateStr}')">
                <div class="calendar-day-number">${day}</div>
                ${dayEvents.map(e => {
                    const color = getUserColorHex(e.assigned_to);
                    return `<div class="calendar-event" style="background:${color}33;color:${color};border-left:2px solid ${color};">${e.title}</div>`;
                }).join('')}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="fade-in">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-ghost" onclick="changeCalendarMonth(-1)">← Prev</button>
                    <button class="btn btn-ghost" onclick="changeCalendarMonth(1)">Next →</button>
                </div>
                <h2 style="font-size:1.5rem;font-weight:700;">${monthNames[month]} ${year}</h2>
                <button class="btn btn-primary" onclick="showAddEventModal()">+ Add Event</button>
            </div>
            
            <div class="calendar-grid">
                <div class="calendar-header">Sun</div>
                <div class="calendar-header">Mon</div>
                <div class="calendar-header">Tue</div>
                <div class="calendar-header">Wed</div>
                <div class="calendar-header">Thu</div>
                <div class="calendar-header">Fri</div>
                <div class="calendar-header">Sat</div>
                ${daysHtml}
            </div>
            
            <div class="card" style="margin-top:20px;">
                <div class="card-header">
                    <div class="card-title">📅 Upcoming Events</div>
                </div>
                <div class="list-container">
                    ${store.calendarEvents.slice(0, 10).map(event => {
                        const color = getUserColorHex(event.assigned_to);
                        const startDate = new Date(event.start_time);
                        return `
                            <div class="list-item">
                                <div class="user-badge" style="background:${color};"></div>
                                <div class="list-content">
                                    <div class="list-title">${event.title}</div>
                                    <div class="list-meta">
                                        <span>📅 ${startDate.toLocaleDateString()}</span>
                                        <span>🕐 ${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        <span>🏷️ ${event.event_type || 'Event'}</span>
                                        ${event.location ? `<span>📍 ${event.location}</span>` : ''}
                                        <span>👤 ${getUserName(event.assigned_to) || 'Whole Family'}</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') || '<div class="list-item"><div class="text-center" style="width:100%;color:var(--text-muted);">No upcoming events</div></div>'}
                </div>
            </div>
        </div>
    `;
}

function changeCalendarMonth(delta) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + delta);
    renderCalendar(document.getElementById('contentArea'));
}

function showDayEvents(dateStr) {
    const dayEvents = store.calendarEvents.filter(e => {
        const eventDate = new Date(e.start_time);
        return eventDate.toISOString().split('T')[0] === dateStr;
    });
    
    if (dayEvents.length === 0) {
        showAddEventModal(dateStr);
        return;
    }
    
    showModal(`Events for ${dateStr}`, `
        <div class="list-container" style="margin-bottom:16px;">
            ${dayEvents.map(e => `
                <div class="list-item">
                    <div class="list-content">
                        <div class="list-title">${e.title}</div>
                        <div class="list-meta">
                            <span>🕐 ${new Date(e.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span>🏷️ ${e.event_type}</span>
                            ${e.location ? `<span>📍 ${e.location}</span>` : ''}
                        </div>
                        ${e.description ? `<div style="margin-top:8px;font-size:0.875rem;">${e.description}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        <button class="btn btn-primary w-full" onclick="closeModal(); showAddEventModal('${dateStr}')">+ Add Event</button>
    `);
}

function showAddEventModal(prefillDate = null) {
    const memberOptions = store.familyMembers.map(m => 
        `<option value="${m.id}">${m.display_name || m.username}</option>`
    ).join('');
    
    const now = prefillDate ? new Date(prefillDate) : new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = '09:00';
    
    showModal('Add Event', `
        <div class="form-group">
            <label class="form-label">Event Title *</label>
            <input type="text" class="form-input" id="eventTitle" placeholder="What's happening?">
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="eventDescription" placeholder="Details..."></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Event Type *</label>
            <select class="form-select" id="eventType">
                <option value="chore">Chore</option>
                <option value="event">Event</option>
                <option value="work">Work</option>
                <option value="reminder">Reminder</option>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="appointment">Appointment</option>
            </select>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Start Date & Time *</label>
                <input type="datetime-local" class="form-input" id="eventStart" value="${dateStr}T${timeStr}">
            </div>
            <div class="form-group">
                <label class="form-label">End Date & Time</label>
                <input type="datetime-local" class="form-input" id="eventEnd">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" class="form-input" id="eventLocation" placeholder="Where?">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Assigned To</label>
                <select class="form-select" id="eventAssignedTo">
                    <option value="">Whole Family</option>
                    ${memberOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Repeat</label>
                <select class="form-select" id="eventRecurrence">
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>
        </div>
        <button class="btn btn-primary w-full" onclick="submitEvent()">Add Event</button>
    `);
}

async function submitEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const eventType = document.getElementById('eventType').value;
    const startTime = document.getElementById('eventStart').value;
    const endTime = document.getElementById('eventEnd').value;
    const location = document.getElementById('eventLocation').value.trim();
    const assignedTo = document.getElementById('eventAssignedTo').value;
    const recurrence = document.getElementById('eventRecurrence').value;
    
    if (!title || !startTime) { alert('Title and start time are required'); return; }
    
    const success = await addCalendarEvent(title, description, startTime, endTime || null, eventType, location || null, assignedTo || null, recurrence || 'none');
    if (success) closeModal();
}

// ==================== RENDER: MESSAGES ====================
function renderMessages(container) {
    container.innerHTML = `
        <div class="fade-in" style="height:100%;">
            <div class="chat-container">
                <div class="chat-sidebar">
                    <div style="padding:16px;border-bottom:1px solid var(--surface-light);">
                        <div class="card-title">👥 Family Members</div>
                    </div>
                    ${store.familyMembers.map(m => `
                        <div style="padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--surface-light);">
                            <div class="avatar" style="background:${getUserColorHex(m.id)};width:32px;height:32px;font-size:0.75rem;">
                                ${(m.display_name || m.username).substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:500;font-size:0.875rem;">${m.display_name || m.username}</div>
                                <div style="font-size:0.75rem;color:var(--text-muted);text-transform:capitalize;">${m.role}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="chat-main">
                    <div class="chat-messages" id="chatMessages">
                        ${store.messages.map(msg => {
                            const isMe = msg.sender_id === store.user.id;
                            const color = getUserColorHex(msg.sender_id);
                            return `
                                <div class="message ${isMe ? 'sent' : 'received'}">
                                    <div style="font-size:0.75rem;font-weight:600;margin-bottom:4px;${isMe ? 'color:rgba(255,255,255,0.8);' : 'color:' + color + ';'}">
                                        ${isMe ? 'You' : (msg.sender?.display_name || msg.sender?.username || 'Unknown')}
                                    </div>
                                    <div>${msg.message}</div>
                                    <div class="message-time">${new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div style="padding:16px;border-top:1px solid var(--surface-light);display:flex;gap:8px;">
                        <input type="text" class="form-input" id="messageInput" placeholder="Type a message..." style="flex:1;" 
                               onkeypress="if(event.key==='Enter') submitMessage()">
                        <button class="btn btn-primary" onclick="submitMessage()">Send</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Scroll to bottom
    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

async function submitMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    
    await sendMessage(text);
}

// ==================== RENDER: LEADERBOARD ====================
function renderLeaderboard(container) {
    const sorted = [...store.leaderboard].sort((a, b) => (b.points || 0) - (a.points || 0));
    
    container.innerHTML = `
        <div class="fade-in">
            <div class="card" style="margin-bottom:20px;">
                <div class="card-header">
                    <div class="card-title">🏆 Family Leaderboard</div>
                </div>
                <div style="padding:0 20px 20px;">
                    ${sorted.map((member, index) => {
                        const rank = index + 1;
                        const rankClass = rank <= 3 ? `rank-${rank}` : '';
                        const color = getUserColorHex(member.id);
                        const level = member.level || 1;
                        const points = member.points || 0;
                        const streak = member.streak_days || 0;
                        const multiplier = getLevelMultiplier(level);
                        
                        return `
                            <div class="leaderboard-item">
                                <div class="rank ${rankClass}">${rank}</div>
                                <div class="avatar" style="background:${color};">${(member.display_name || member.username).substring(0, 2).toUpperCase()}</div>
                                <div style="flex:1;">
                                    <div style="font-weight:600;">${member.display_name || member.username}</div>
                                    <div style="font-size:0.75rem;color:var(--text-muted);">
                                        Level ${level} • ${multiplier}x • ${streak} day streak
                                    </div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:1.25rem;font-weight:700;color:var(--primary);">${points} pts</div>
                                    <div style="font-size:0.875rem;color:var(--success);">$${(member.balance || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

// ==================== RENDER: BUDGET ====================
function renderBudget(container) {
    const totalIncome = store.budgetEntries
        .filter(e => e.entry_type === 'income')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalExpenses = store.budgetEntries
        .filter(e => e.entry_type === 'expense')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const balance = totalIncome - totalExpenses;

    container.innerHTML = `
        <div class="fade-in">
            <div class="budget-summary">
                <div class="card">
                    <div class="card-title" style="color:var(--success);">💰 Total Income</div>
                    <div class="budget-amount positive">$${totalIncome.toFixed(2)}</div>
                </div>
                <div class="card">
                    <div class="card-title" style="color:var(--danger);">💸 Total Expenses</div>
                    <div class="budget-amount negative">$${totalExpenses.toFixed(2)}</div>
                </div>
                <div class="card">
                    <div class="card-title" style="color:var(--primary);">💵 Balance</div>
                    <div class="budget-amount ${balance >= 0 ? 'positive' : 'negative'}">$${balance.toFixed(2)}</div>
                </div>
            </div>
            
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                <button class="btn btn-primary" onclick="showAddBudgetModal()">+ Add Entry</button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="card-title">📋 Budget Entries</div>
                </div>
                <div class="list-container">
                    ${store.budgetEntries.map(entry => {
                        const isIncome = entry.entry_type === 'income';
                        return `
                            <div class="list-item">
                                <div class="list-content">
                                    <div class="list-title">${entry.title}</div>
                                    <div class="list-meta">
                                        <span style="color:${isIncome ? 'var(--success)' : 'var(--danger)'};">
                                            ${isIncome ? '+' : '-'}$${parseFloat(entry.amount).toFixed(2)}
                                        </span>
                                        <span>🏷️ ${entry.category || 'Uncategorized'}</span>
                                        ${entry.due_date ? `<span>📅 ${new Date(entry.due_date).toLocaleDateString()}</span>` : ''}
                                        ${entry.is_recurring ? '<span>🔄 Recurring</span>' : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') || '<div class="list-item"><div class="text-center" style="width:100%;color:var(--text-muted);">No budget entries</div></div>'}
                </div>
            </div>
            
            <div class="card" style="margin-top:16px;">
                <div class="card-header">
                    <div class="card-title">📝 Recent Transactions</div>
                </div>
                <div class="list-container">
                    ${store.transactions.map(t => `
                        <div class="list-item">
                            <div class="list-content">
                                <div class="list-title">${t.description || 'Transaction'}</div>
                                <div class="list-meta">
                                    <span style="color:${t.amount > 0 ? 'var(--success)' : 'var(--danger)'};">
                                        ${t.amount > 0 ? '+' : ''}$${parseFloat(t.amount).toFixed(2)}
                                    </span>
                                    <span>📅 ${new Date(t.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    `).join('') || '<div class="list-item"><div class="text-center" style="width:100%;color:var(--text-muted);">No transactions</div></div>'}
                </div>
            </div>
        </div>
    `;
}

function showAddBudgetModal() {
    showModal('Add Budget Entry', `
        <div class="form-group">
            <label class="form-label">Title *</label>
            <input type="text" class="form-input" id="budgetTitle" placeholder="e.g., Electric Bill">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Amount *</label>
                <input type="number" class="form-input" id="budgetAmount" placeholder="0.00" step="0.01">
            </div>
            <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" id="budgetType">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="budgetCategory">
                    <option value="Bills">Bills</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Random">Random</option>
                    <option value="Recurring">Recurring</option>
                    <option value="Savings">Savings</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" class="form-input" id="budgetDueDate">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">
                <input type="checkbox" id="budgetRecurring" style="margin-right:8px;"> Recurring
            </label>
        </div>
        <div class="form-group" id="recurrenceTypeGroup" style="display:none;">
            <label class="form-label">Recurrence Type</label>
            <select class="form-select" id="budgetRecurrenceType">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly" selected>Monthly</option>
                <option value="yearly">Yearly</option>
            </select>
        </div>
        <button class="btn btn-primary w-full" onclick="submitBudget()">Add Entry</button>
    `);
    
    document.getElementById('budgetRecurring').addEventListener('change', (e) => {
        document.getElementById('recurrenceTypeGroup').style.display = e.target.checked ? 'block' : 'none';
    });
}

async function submitBudget() {
    const title = document.getElementById('budgetTitle').value.trim();
    const amount = document.getElementById('budgetAmount').value;
    const entryType = document.getElementById('budgetType').value;
    const category = document.getElementById('budgetCategory').value;
    const dueDate = document.getElementById('budgetDueDate').value;
    const isRecurring = document.getElementById('budgetRecurring').checked;
    const recurrenceType = document.getElementById('budgetRecurrenceType').value;
    
    if (!title || !amount) { alert('Title and amount are required'); return; }
    
    const success = await addBudgetEntry(title, amount, entryType, category, dueDate || null, isRecurring, isRecurring ? recurrenceType : 'none');
    if (success) closeModal();
}

// ==================== RENDER: STORE ====================
function renderStore(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <div>
                    <div style="font-size:1.25rem;font-weight:700;">🛍️ Kid Store</div>
                    <div style="color:var(--text-muted);font-size:0.875rem;">Your Balance: <span style="color:var(--success);font-weight:600;">$${(store.user?.balance || 0).toFixed(2)}</span></div>
                </div>
                <button class="btn btn-primary" onclick="showAddStoreItemModal()">+ Add Item</button>
            </div>
            
            <div class="store-grid">
                ${store.storeItems.map(item => `
                    <div class="store-item">
                        <div style="font-size:2rem;margin-bottom:8px;">🎁</div>
                        <div style="font-weight:600;font-size:1.125rem;margin-bottom:4px;">${item.name}</div>
                        <div style="color:var(--text-muted);font-size:0.875rem;margin-bottom:12px;">${item.description || ''}</div>
                        <div class="store-price">$${parseFloat(item.price).toFixed(2)}</div>
                        <button class="btn btn-primary w-full" 
                                onclick="purchaseStoreItem('${item.id}', ${item.price})"
                                ${(store.user?.balance || 0) < item.price ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                            ${(store.user?.balance || 0) < item.price ? 'Not Enough $' : 'Purchase'}
                        </button>
                    </div>
                `).join('') || emptyState('🏪', 'Store Empty', 'Add items for kids to purchase')}
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signupForm');
    if (form) {
        form.addEventListener('submit', signup);
    }
});
function showAddStoreItemModal() {
    showModal('Add Store Item', `
        <div class="form-group">
            <label class="form-label">Item Name *</label>
            <input type="text" class="form-input" id="storeItemName" placeholder="e.g., Extra Screen Time">
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="storeItemDescription" placeholder="What is this item?"></textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Price ($) *</label>
            <input type="number" class="form-input" id="storeItemPrice" placeholder="0.00" step="0.01" min="0">
        </div>
        <button class="btn btn-primary w-full" onclick="submitStoreItem()">Add Item</button>
    `);
}

async function submitStoreItem() {
    const name = document.getElementById('storeItemName').value.trim();
    const description = document.getElementById('storeItemDescription').value.trim();
    const price = document.getElementById('storeItemPrice').value;
    
    if (!name || !price) { alert('Name and price are required'); return; }
    
    const success = await addStoreItem(name, description, price);
    if (success) closeModal();
}

// ==================== RENDER: ADMIN ====================
function renderAdmin(container) {
    const isAdmin = store.user?.role === 'admin' || store.user?.role === 'parent';
    
    container.innerHTML = `
        <div class="fade-in">
            <div class="dashboard-grid" style="grid-template-columns:repeat(auto-fill, minmax(350px, 1fr));">
                <!-- Profile Card -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">👤 Your Profile</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
                        <div class="avatar" style="background:${getUserColorHex(store.user?.id)};width:64px;height:64px;font-size:1.5rem;">
                            ${(store.user?.display_name || store.user?.username || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-size:1.25rem;font-weight:700;">${store.user?.display_name || store.user?.username}</div>
                            <div style="color:var(--text-muted);text-transform:capitalize;">${store.user?.role || 'User'}</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Display Name</label>
                        <input type="text" class="form-input" id="adminDisplayName" value="${store.user?.display_name || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-input" value="${store.user?.username || ''}" disabled style="opacity:0.5;">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role</label>
                        <input type="text" class="form-input" value="${store.user?.role || 'User'}" disabled style="opacity:0.5;text-transform:capitalize;">
                    </div>
                    <button class="btn btn-primary w-full" onclick="updateProfile()">Update Profile</button>
                </div>
                
                <!-- Family Card -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">👨‍👩‍👧‍👦 Family</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Family Name</label>
                        <input type="text" class="form-input" id="familyNameInput" value="${store.family?.name || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Family Code</label>
                        <div style="display:flex;gap:8px;">
                            <input type="text" class="form-input" value="${store.family?.family_code || store.family?.code || (store.family?.id ? store.family.id.replace(/-/g, '').slice(-8).toUpperCase() : 'N/A')}" disabled style="opacity:0.5;flex:1;">
                            <button class="btn btn-ghost" onclick="copyFamilyCode()">📋</button>
                        </div>
                    </div>
                    ${isAdmin ? `<button class="btn btn-primary w-full" onclick="updateFamily()">Update Family</button>` : ''}
                </div>
                
                <!-- Users Card -->
                <div class="card" style="grid-column:1 / -1;">
                    <div class="card-header">
                        <div class="card-title">👥 Family Members</div>
                    </div>
                    <div class="list-container">
                        ${store.familyMembers.map(m => `
                            <div class="list-item">
                                <div class="avatar" style="background:${getUserColorHex(m.id)};width:40px;height:40px;">
                                    ${(m.display_name || m.username).substring(0, 2).toUpperCase()}
                                </div>
                                <div class="list-content">
                                    <div class="list-title">${m.display_name || m.username}</div>
                                    <div class="list-meta">
                                        <span style="text-transform:capitalize;">${m.role}</span>
                                        <span>⭐ ${m.points || 0} pts</span>
                                        <span>💰 $${(m.balance || 0).toFixed(2)}</span>
                                        <span>🏆 Level ${m.level || 1}</span>
                                    </div>
                                </div>
                                ${isAdmin && m.id !== store.user?.id ? `
                                    <select class="form-select" style="width:auto;" onchange="changeUserRole('${m.id}', this.value)">
                                        <option value="user" ${m.role === 'user' ? 'selected' : ''}>User</option>
                                        <option value="parent" ${m.role === 'parent' ? 'selected' : ''}>Parent</option>
                                        <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    </select>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div style="margin-top:20px;text-align:center;">
                <button class="btn btn-danger" onclick="logout()">🚪 Log Out</button>
            </div>
        </div>
    `;
}

async function updateProfile() {
    const displayName = document.getElementById('adminDisplayName').value.trim();
    if (!displayName) { alert('Display name is required'); return; }
    
    const { error } = await supabaseClient
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', store.user.id);
    
    if (error) { alert('Error: ' + error.message); return; }
    
    store.user.display_name = displayName;
    document.getElementById('userName').textContent = displayName;
    document.getElementById('userAvatar').textContent = displayName.substring(0, 2).toUpperCase();
    alert('Profile updated!');
}

async function updateFamily() {
    const name = document.getElementById('familyNameInput').value.trim();
    if (!name) { alert('Family name is required'); return; }
    
    const { error } = await supabaseClient
        .from('families')
        .update({ name })
        .eq('id', store.user.family_id);
    
    if (error) { alert('Error: ' + error.message); return; }
    
    store.family.name = name;
    alert('Family updated!');
}

function copyFamilyCode() {
    const code = store.family?.family_code || store.family?.code || (store.family?.id ? store.family.id.replace(/-/g, '').slice(-8).toUpperCase() : '');
    if (!code) { alert('No family code available'); return; }
    navigator.clipboard.writeText(code).then(() => alert('Family code copied: ' + code));
}

async function changeUserRole(userId, newRole) {
    const { error } = await supabaseClient
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
    
    if (error) { alert('Error: ' + error.message); return; }
    
    await loadFamilyData();
    renderPage('admin');
}

// ==================== LEVEL SYSTEM ====================
function getPointsForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    let needed = 100;
    for (let i = 2; i <= level; i++) {
        total += needed;
        needed = Math.ceil(needed * 1.1);
    }
    return total;
}

function getLevelFromPoints(points) {
    let level = 1;
    let total = 0;
    let needed = 100;
    while (total + needed <= points && level < 20) {
        total += needed;
        needed = Math.ceil(needed * 1.1);
        level++;
    }
    return level;
}

function getPointsToNextLevel(currentPoints) {
    const currentLevel = getLevelFromPoints(currentPoints);
    if (currentLevel >= 20) return 0;
    const nextLevelPoints = getPointsForLevel(currentLevel + 1);
    return nextLevelPoints - currentPoints;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', initApp);