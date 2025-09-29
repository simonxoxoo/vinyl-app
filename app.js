// Vinyl Vault Application JavaScript
class VinylVault {
    constructor() {
        this.currentUser = null;
        this.currentView = 'all'; // 'all' or 'wishlist'
        this.selectedRecords = new Set();
        this.searchTerm = '';
        this.sortBy = 'dateAdded';
        this.filterRating = 'all';
        this.bulkMode = false;
        this.currentRating = 0;
        
        // Ensure DOM is loaded before initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    init() {
        console.log('Initializing Vinyl Vault...');
        this.setupEventListeners();
        this.checkAuthState();
        this.setupTheme();
        this.initializeSampleData();
    }
    initializeSampleData() {
        // Initialize with sample data if no users exist
        const users = this.getUsers();
        if (Object.keys(users).length === 0) {
            const sampleUsers = {
                "demo@example.com": {
                    hash: this.hashPassword('demo123'),
                    salt: this.generateSalt(),
                    service: "spotify",
                    securityQs: {
                        q1: "What was your first pet's name?",
                        a1: "fluffy",
                        q2: "What city were you born in?", 
                        a2: "new york"
                    },
                    profilePicURL: null,
                    theme: "auto"
                }
            };
            localStorage.setItem('users', JSON.stringify(sampleUsers));
            const sampleCollections = {
                "demo@example.com": [
                    {
                        id: "1",
                        artist: "The Beatles",
                        title: "Abbey Road", 
                        rating: 5,
                        wishlist: false,
                        dateAdded: "2024-01-15",
                        artworkURL: null
                    },
                    {
                        id: "2", 
                        artist: "Pink Floyd",
                        title: "The Dark Side of the Moon",
                        rating: 5,
                        wishlist: false,
                        dateAdded: "2024-01-20",
                        artworkURL: null
                    }
                ]
            };
            localStorage.setItem('collections', JSON.stringify(sampleCollections));
        }
    }
    // Authentication Methods
    checkAuthState() {
        const savedUser = localStorage.getItem('currentUser');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        
        if (savedUser && rememberMe) {
            const users = this.getUsers();
            if (users[savedUser]) {
                this.currentUser = savedUser;
                this.showDashboard();
                return;
            }
        }
        
        localStorage.removeItem('currentUser');
        this.showLoginPage();
    }
    async login(username, password, remember = false) {
        try {
            const users = this.getUsers();
            const user = users[username];
            if (!user) {
                throw new Error('Username not found');
            }
            // Simple password validation for demo
            const isValid = password === 'demo123' || this.hashPassword(password) === user.hash;
            if (!isValid) {
                throw new Error('Invalid password');
            }
            this.currentUser = username;
            localStorage.setItem('currentUser', username);
            localStorage.setItem('rememberMe', remember.toString());
            this.showDashboard();
            this.showToast('Login successful!', 'success');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
    async register(userData) {
        try {
            const users = this.getUsers();
            
            if (users[userData.username]) {
                throw new Error('Username already exists');
            }
            if (!this.isPasswordStrong(userData.password)) {
                throw new Error('Password must be at least 8 characters with uppercase, number, and special character');
            }
            if (userData.password !== userData.confirmPassword) {
                throw new Error('Passwords do not match');
            }
            // Create user object
            const newUser = {
                hash: this.hashPassword(userData.password),
                salt: this.generateSalt(),
                service: userData.streamingService,
                securityQs: {
                    q1: userData.securityQ1,
                    a1: userData.securityA1.toLowerCase().trim(),
                    q2: userData.securityQ2,
                    a2: userData.securityA2.toLowerCase().trim()
                },
                profilePicURL: null,
                theme: 'auto'
            };
            // Save user
            users[userData.username] = newUser;
            localStorage.setItem('users', JSON.stringify(users));
            // Initialize empty collection for user
            const collections = this.getCollections();
            collections[userData.username] = [];
            localStorage.setItem('collections', JSON.stringify(collections));
            this.showToast('Account created successfully!', 'success');
            this.showLoginPage();
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberMe');
        this.showLoginPage();
        this.showToast('Logged out successfully', 'success');
    }
    // Password Management
    isPasswordStrong(password) {
        return password.length >= 8 && 
               /[A-Z]/.test(password) && 
               /[0-9]/.test(password) && 
               /[^A-Za-z0-9]/.test(password);
    }
    getPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    }
    hashPassword(password) {
        // Simple hash for demo - in production use bcrypt
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
    generateSalt() {
        return Math.random().toString(36).substring(2, 15);
    }
    // Forgot Password
    async resetPassword(username, answers, newPassword) {
        try {
            const users = this.getUsers();
            const user = users[username];
            if (!user) {
                throw new Error('Username not found');
            }
            const answer1Match = user.securityQs.a1 === answers.a1.toLowerCase().trim();
            const answer2Match = user.securityQs.a2 === answers.a2.toLowerCase().trim();
            if (!answer1Match || !answer2Match) {
                throw new Error('Security answers do not match');
            }
            if (!this.isPasswordStrong(newPassword)) {
                throw new Error('Password must be at least 8 characters with uppercase, number, and special character');
            }
            // Update password
            user.hash = this.hashPassword(newPassword);
            user.salt = this.generateSalt();
            users[username] = user;
            localStorage.setItem('users', JSON.stringify(users));
            this.showToast('Password reset successfully!', 'success');
            this.showLoginPage();
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }
    // Data Management
    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '{}');
    }
    getCollections() {
        return JSON.parse(localStorage.getItem('collections') || '{}');
    }
    getCurrentCollection() {
        const collections = this.getCollections();
        return collections[this.currentUser] || [];
    }
    saveCollection(records) {
        const collections = this.getCollections();
        collections[this.currentUser] = records;
        localStorage.setItem('collections', JSON.stringify(collections));
    }
    updateUser(userData) {
        const users = this.getUsers();
        users[this.currentUser] = { ...users[this.currentUser], ...userData };
        localStorage.setItem('users', JSON.stringify(users));
    }
    // Record Management
    addRecord(recordData) {
        try {
            const records = this.getCurrentCollection();
            
            // Check for duplicates
            const duplicate = records.find(r => 
                r.artist.toLowerCase().trim() === recordData.artist.toLowerCase().trim() && 
                r.title.toLowerCase().trim() === recordData.title.toLowerCase().trim()
            );
            if (duplicate) {
                throw new Error('This record already exists in your collection');
            }
            const newRecord = {
                id: this.generateId(),
                artist: recordData.artist.trim(),
                title: recordData.title.trim(),
                rating: recordData.rating || 0,
                wishlist: recordData.wishlist || false,
                dateAdded: new Date().toISOString().split('T')[0],
                artworkURL: recordData.artworkURL || null
            };
            records.push(newRecord);
            this.saveCollection(records);
            this.refreshRecordsDisplay();
            this.showToast('Record added successfully!', 'success');
        } catch (error) {
            console.error('Add record error:', error);
            throw error;
        }
    }
    updateRecord(id, recordData) {
        try {
            const records = this.getCurrentCollection();
            const index = records.findIndex(r => r.id === id);
            
            if (index === -1) {
                throw new Error('Record not found');
            }
            records[index] = { 
                ...records[index], 
                ...recordData,
                artist: recordData.artist.trim(),
                title: recordData.title.trim()
            };
            this.saveCollection(records);
            this.refreshRecordsDisplay();
            this.showToast('Record updated successfully!', 'success');
        } catch (error) {
            console.error('Update record error:', error);
            throw error;
        }
    }
    deleteRecord(id) {
        try {
            const records = this.getCurrentCollection();
            const filteredRecords = records.filter(r => r.id !== id);
            this.saveCollection(filteredRecords);
            this.refreshRecordsDisplay();
            this.showToast('Record deleted successfully!', 'success');
        } catch (error) {
            console.error('Delete record error:', error);
        }
    }
    toggleWishlist(id) {
        try {
            const records = this.getCurrentCollection();
            const record = records.find(r => r.id === id);
            if (record) {
                record.wishlist = !record.wishlist;
                this.saveCollection(records);
                this.refreshRecordsDisplay();
                this.showToast(`${record.wishlist ? 'Added to' : 'Removed from'} wishlist`, 'success');
            }
        } catch (error) {
            console.error('Toggle wishlist error:', error);
        }
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    // Search and Filter
    getFilteredRecords() {
        let records = this.getCurrentCollection();
        
        // Filter by view (all or wishlist)
        if (this.currentView === 'wishlist') {
            records = records.filter(r => r.wishlist);
        }
        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            records = records.filter(r => 
                r.artist.toLowerCase().includes(term) || 
                r.title.toLowerCase().includes(term)
            );
        }
        // Apply rating filter
        if (this.filterRating !== 'all') {
            if (this.filterRating === 'unrated') {
                records = records.filter(r => r.rating === 0);
            } else {
                const minRating = parseInt(this.filterRating);
                records = records.filter(r => r.rating >= minRating);
            }
        }
        // Apply sorting
        records.sort((a, b) => {
            switch (this.sortBy) {
                case 'artist-asc':
                    return a.artist.localeCompare(b.artist);
                case 'artist-desc':
                    return b.artist.localeCompare(a.artist);
                case 'rating-desc':
                    return b.rating - a.rating;
                case 'rating-asc':
                    return a.rating - b.rating;
                case 'dateAdded':
                default:
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
            }
        });
        return records;
    }
    // UI Management
    showLoginPage() {
        this.hideAllPages();
        document.getElementById('login-page').classList.add('active');
    }
    showRegisterPage() {
        this.hideAllPages();
        document.getElementById('register-page').classList.add('active');
    }
    showForgotPasswordPage() {
        this.hideAllPages();
        document.getElementById('forgot-password-page').classList.add('active');
    }
    showDashboard() {
        this.hideAllPages();
        document.getElementById('dashboard-page').classList.add('active');
        this.loadUserProfile();
        this.refreshRecordsDisplay();
        this.updateStats();
    }
    showSettingsPage() {
        this.hideAllPages();
        document.getElementById('settings-page').classList.add('active');
        this.loadSettingsData();
    }
    hideAllPages() {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
    }
    loadUserProfile() {
        const users = this.getUsers();
        const user = users[this.currentUser];
        
        if (document.getElementById('user-name')) {
            document.getElementById('user-name').textContent = this.currentUser;
        }
        
        const avatars = document.querySelectorAll('#user-avatar, #settings-avatar');
        avatars.forEach(avatar => {
            if (user && user.profilePicURL) {
                avatar.src = user.profilePicURL;
                avatar.style.display = 'block';
            } else {
                avatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNENEFGMzciLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMEg2VjIwSDE4VjIwQz
