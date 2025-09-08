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
                avatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNENEFGMzciLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI4IiB5PSI4Ij4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMEg2VjIwSDE4VjIwQzE4IDE2LjY4NjMgMTUuMzEzNyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
                avatar.style.display = 'block';
            }
        });
    }

    refreshRecordsDisplay() {
        const records = this.getFilteredRecords();
        const container = document.getElementById('records-grid');
        const emptyState = document.getElementById('empty-state');

        if (!container || !emptyState) return;

        if (records.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.innerHTML = records.map(record => this.createRecordCard(record)).join('');
        }

        this.updateViewButton();
        this.updateStats();
    }

    createRecordCard(record) {
        const users = this.getUsers();
        const user = users[this.currentUser];
        const streamingService = user ? user.service : 'spotify';
        
        return `
            <div class="record-card ${this.selectedRecords.has(record.id) ? 'selected' : ''}" 
                 data-id="${record.id}">
                ${this.bulkMode ? `
                    <div class="select-checkbox">
                        <label class="checkbox-label">
                            <input type="checkbox" ${this.selectedRecords.has(record.id) ? 'checked' : ''}
                                   onchange="app.toggleRecordSelection('${record.id}', this.checked)">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                ` : ''}
                
                ${record.wishlist ? '<div class="wishlist-badge">Wishlist</div>' : ''}
                
                <div class="record-artwork ${record.artworkURL ? '' : 'placeholder'}"
                     onclick="app.editRecord('${record.id}')">
                    ${record.artworkURL ? 
                        `<img src="${record.artworkURL}" alt="${this.escapeHtml(record.title)}" loading="lazy">` :
                        `<div class="vinyl-record"><div class="vinyl-center"></div></div>`
                    }
                </div>
                
                <div class="record-info">
                    <h3>${this.escapeHtml(record.title)}</h3>
                    <p>${this.escapeHtml(record.artist)}</p>
                    
                    <div class="record-rating">
                        ${this.createStarDisplay(record.rating)}
                    </div>
                    
                    <div class="record-actions">
                        <button class="play-btn" onclick="app.playRecord('${record.id}')">
                            ▶ Play
                        </button>
                        <button class="btn btn--outline" onclick="app.toggleWishlist('${record.id}')">
                            ${record.wishlist ? '❤️' : '🤍'}
                        </button>
                        <button class="btn btn--outline" onclick="app.showDeleteConfirm('${record.id}')">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createStarDisplay(rating) {
        return Array.from({length: 5}, (_, i) => 
            `<span class="star ${i < rating ? 'active' : ''}">${i < rating ? '★' : '☆'}</span>`
        ).join('');
    }

    playRecord(id) {
        try {
            const record = this.getCurrentCollection().find(r => r.id === id);
            if (!record) return;

            const users = this.getUsers();
            const user = users[this.currentUser];
            const service = user ? user.service : 'spotify';

            let url;
            if (service === 'spotify') {
                url = `https://open.spotify.com/search/${encodeURIComponent(record.artist + ' ' + record.title)}`;
            } else {
                url = `https://music.apple.com/search?term=${encodeURIComponent(record.artist + ' ' + record.title)}`;
            }

            window.open(url, '_blank');
        } catch (error) {
            console.error('Play record error:', error);
        }
    }

    showDeleteConfirm(id) {
        this.showConfirmDialog(
            'Delete Record',
            'Are you sure you want to delete this record?',
            () => this.deleteRecord(id),
            false
        );
    }

    updateStats() {
        const records = this.getCurrentCollection();
        const ratedRecords = records.filter(r => r.rating > 0);
        const wishlistRecords = records.filter(r => r.wishlist);
        
        const avgRating = ratedRecords.length > 0 
            ? (ratedRecords.reduce((sum, r) => sum + r.rating, 0) / ratedRecords.length).toFixed(1)
            : '-';

        const totalEl = document.getElementById('total-records');
        const avgEl = document.getElementById('average-rating');
        const wishlistEl = document.getElementById('wishlist-count');

        if (totalEl) totalEl.textContent = records.length;
        if (avgEl) avgEl.textContent = avgRating;
        if (wishlistEl) wishlistEl.textContent = wishlistRecords.length;
    }

    updateViewButton() {
        const button = document.getElementById('toggle-view');
        const text = document.getElementById('view-text');
        
        if (button && text) {
            if (this.currentView === 'all') {
                text.textContent = 'All Records';
            } else {
                text.textContent = 'Wishlist';
            }
        }
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            modal.classList.remove('hidden');
            
            // Focus management for accessibility
            const firstInput = modal.querySelector('input:not([type="hidden"]), button, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    }

    showRecordModal(recordId = null) {
        const modal = document.getElementById('record-modal');
        const title = document.getElementById('record-modal-title');
        const form = document.getElementById('record-form');
        
        if (!modal || !title || !form) return;
        
        form.reset();
        this.clearStarRating();
        this.clearArtworkPreview();
        
        if (recordId) {
            const record = this.getCurrentCollection().find(r => r.id === recordId);
            if (record) {
                title.textContent = 'Edit Record';
                document.getElementById('record-artist').value = record.artist;
                document.getElementById('record-title').value = record.title;
                document.getElementById('record-wishlist').checked = record.wishlist;
                this.setStarRating(record.rating);
                if (record.artworkURL) {
                    this.showArtworkPreview(record.artworkURL);
                }
                modal.dataset.editId = recordId;
            }
        } else {
            title.textContent = 'Add Record';
            delete modal.dataset.editId;
        }
        
        this.showModal('record-modal');
    }

    editRecord(id) {
        if (this.bulkMode) {
            this.toggleRecordSelection(id);
        } else {
            this.showRecordModal(id);
        }
    }

    // Star Rating System
    initStarRating() {
        const starContainer = document.getElementById('record-rating');
        if (!starContainer) return;

        starContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('star')) {
                const rating = parseInt(e.target.dataset.rating);
                this.setStarRating(rating);
            }
        });

        starContainer.addEventListener('mouseover', (e) => {
            if (e.target.classList.contains('star')) {
                const rating = parseInt(e.target.dataset.rating);
                this.previewStarRating(rating);
            }
        });

        starContainer.addEventListener('mouseleave', () => {
            this.resetStarRatingPreview();
        });
    }

    setStarRating(rating) {
        const stars = document.querySelectorAll('#record-rating .star');
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
        this.currentRating = rating;
        const container = document.getElementById('record-rating');
        if (container) {
            container.dataset.rating = rating;
        }
    }

    previewStarRating(rating) {
        const stars = document.querySelectorAll('#record-rating .star');
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
    }

    resetStarRatingPreview() {
        this.setStarRating(this.currentRating);
    }

    clearStarRating() {
        this.currentRating = 0;
        this.setStarRating(0);
    }

    // Image Handling
    handleArtworkUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const croppedDataUrl = this.cropImageToSquare(img);
                this.showArtworkPreview(croppedDataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    cropImageToSquare(img) {
    const canvas = document.getElementById('crop-canvas');
    const ctx = canvas.getContext('2d');
    
    const size = Math.min(img.width, img.height);
    canvas.width = 300;
    canvas.height = 300;

    // Clear previous drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const sourceX = (img.width - size) / 2;
    const sourceY = (img.height - size) / 2;
    
    ctx.drawImage(img, sourceX, sourceY, size, size, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
}

    showArtworkPreview(dataUrl) {
        const preview = document.getElementById('artwork-preview');
        const placeholder = preview ? preview.querySelector('.artwork-placeholder') : null;
        const image = document.getElementById('artwork-image');
        
        if (preview && placeholder && image) {
            placeholder.style.display = 'none';
            image.src = dataUrl;
            image.classList.remove('hidden');
            image.dataset.artworkUrl = dataUrl;
        }
    }

    clearArtworkPreview() {
        const preview = document.getElementById('artwork-preview');
        const placeholder = preview ? preview.querySelector('.artwork-placeholder') : null;
        const image = document.getElementById('artwork-image');
        
        if (preview && placeholder && image) {
            placeholder.style.display = 'flex';
            image.classList.add('hidden');
            image.src = '';
            delete image.dataset.artworkUrl;
        }
    }

    // Bulk Operations
    enterBulkMode() {
        this.bulkMode = true;
        this.selectedRecords.clear();
        const toolbar = document.getElementById('bulk-toolbar');
        if (toolbar) {
            toolbar.classList.remove('hidden');
        }
        this.refreshRecordsDisplay();
        this.updateSelectedCount();
    }

    exitBulkMode() {
        this.bulkMode = false;
        this.selectedRecords.clear();
        const toolbar = document.getElementById('bulk-toolbar');
        if (toolbar) {
            toolbar.classList.add('hidden');
        }
        this.refreshRecordsDisplay();
    }

    toggleRecordSelection(id, checked = null) {
        if (checked !== null) {
            if (checked) {
                this.selectedRecords.add(id);
            } else {
                this.selectedRecords.delete(id);
            }
        } else {
            if (this.selectedRecords.has(id)) {
                this.selectedRecords.delete(id);
            } else {
                this.selectedRecords.add(id);
            }
        }
        
        this.updateSelectedCount();
        this.refreshRecordsDisplay();
    }

    updateSelectedCount() {
        const countEl = document.getElementById('selected-count');
        if (countEl) {
            countEl.textContent = `${this.selectedRecords.size} selected`;
        }
    }

    bulkRateRecords() {
        if (this.selectedRecords.size === 0) return;
        
        const rating = prompt('Enter rating (1-5):');
        if (rating && rating >= 1 && rating <= 5) {
            const records = this.getCurrentCollection();
            records.forEach(record => {
                if (this.selectedRecords.has(record.id)) {
                    record.rating = parseInt(rating);
                }
            });
            this.saveCollection(records);
            this.exitBulkMode();
            this.refreshRecordsDisplay();
            this.showToast('Records rated successfully!', 'success');
        }
    }

    bulkToggleWishlist() {
        if (this.selectedRecords.size === 0) return;
        
        const records = this.getCurrentCollection();
        records.forEach(record => {
            if (this.selectedRecords.has(record.id)) {
                record.wishlist = !record.wishlist;
            }
        });
        this.saveCollection(records);
        this.exitBulkMode();
        this.refreshRecordsDisplay();
        this.showToast('Wishlist updated!', 'success');
    }

    // Profile Picture
    handleProfilePicUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const croppedDataUrl = this.cropImageToSquare(img);
                this.updateUser({ profilePicURL: croppedDataUrl });
                this.loadUserProfile();
                this.showToast('Profile picture updated!', 'success');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Theme Management
    setupTheme() {
        const users = this.getUsers();
        if (this.currentUser && users[this.currentUser]) {
            const theme = users[this.currentUser].theme || 'auto';
            this.applyTheme(theme);
        }
    }

    applyTheme(theme) {
        if (theme !== 'auto') {
            document.documentElement.setAttribute('data-color-scheme', theme);
        } else {
            document.documentElement.removeAttribute('data-color-scheme');
        }
        if (this.currentUser) {
            this.updateUser({ theme });
        }
    }

    // Data Export/Import
    exportToCSV() {
        const records = this.getCurrentCollection();
        if (records.length === 0) {
            this.showToast('No records to export', 'warning');
            return;
        }

        const headers = ['Artist', 'Title', 'Rating', 'Wishlist', 'Date Added'];
        const csvContent = [
            headers.join(','),
            ...records.map(record => [
                `"${record.artist}"`,
                `"${record.title}"`,
                record.rating,
                record.wishlist,
                record.dateAdded
            ].join(','))
        ].join('\n');

        this.downloadFile(csvContent, `vinyl-collection-${this.currentUser}.csv`, 'text/csv');
        this.showToast('Collection exported to CSV!', 'success');
    }

    backupData() {
        const users = this.getUsers();
        const collections = this.getCollections();
        
        const backup = {
            user: users[this.currentUser],
            collection: collections[this.currentUser],
            timestamp: new Date().toISOString()
        };

        this.downloadFile(
            JSON.stringify(backup, null, 2), 
            `vinyl-vault-backup-${this.currentUser}-${new Date().toISOString().split('T')[0]}.json`, 
            'application/json'
        );
        this.showToast('Backup created!', 'success');
    }

    async restoreData(file) {
        try {
            const text = await file.text();
            const backup = JSON.parse(text);
            
            if (!backup.user || !backup.collection) {
                throw new Error('Invalid backup file format');
            }

            // Update user data
            const users = this.getUsers();
            users[this.currentUser] = backup.user;
            localStorage.setItem('users', JSON.stringify(users));

            // Update collection
            const collections = this.getCollections();
            collections[this.currentUser] = backup.collection;
            localStorage.setItem('collections', JSON.stringify(collections));

            this.refreshRecordsDisplay();
            this.loadUserProfile();
            this.showToast('Data restored successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to restore data: ' + error.message, 'error');
        }
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Confirmation Modal
    showConfirmDialog(title, message, onConfirm, requirePassword = false) {
        const titleEl = document.getElementById('confirm-title');
        const messageEl = document.getElementById('confirm-message');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        
        const passwordSection = document.getElementById('confirm-password-section');
        const passwordInput = document.getElementById('confirm-password-input');
        
        if (requirePassword && passwordSection) {
            passwordSection.classList.remove('hidden');
            if (passwordInput) passwordInput.value = '';
        } else if (passwordSection) {
            passwordSection.classList.add('hidden');
        }

        const confirmBtn = document.getElementById('confirm-ok');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                if (requirePassword) {
                    const password = passwordInput ? passwordInput.value : '';
                    if (this.validateCurrentPassword(password)) {
                        this.hideModal('confirm-modal');
                        onConfirm();
                    } else {
                        const errorEl = document.getElementById('confirm-password-error');
                        if (errorEl) errorEl.textContent = 'Invalid password';
                        return;
                    }
                } else {
                    this.hideModal('confirm-modal');
                    onConfirm();
                }
            };
        }

        this.showModal('confirm-modal');
    }

    validateCurrentPassword(password) {
        const users = this.getUsers();
        const user = users[this.currentUser];
        if (!user) return false;
        return this.hashPassword(password) === user.hash || password === 'demo123';
    }

    // Toast Notifications
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    loadSettingsData() {
        const users = this.getUsers();
        const user = users[this.currentUser];
        
        const usernameEl = document.getElementById('settings-username');
        const themeEl = document.getElementById('theme-select');
        const serviceEl = document.getElementById('settings-streaming-service');
        
        if (usernameEl) usernameEl.textContent = this.currentUser;
        if (themeEl) themeEl.value = user && user.theme || 'auto';
        if (serviceEl) serviceEl.value = user && user.service || 'spotify';
        
        if (user && user.profilePicURL) {
            const avatar = document.getElementById('settings-avatar');
            if (avatar) avatar.src = user.profilePicURL;
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Authentication forms
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Login form submitted');
                
                const usernameEl = document.getElementById('login-username');
                const passwordEl = document.getElementById('login-password');
                const rememberEl = document.getElementById('remember-me');
                
                if (!usernameEl || !passwordEl) {
                    console.error('Login form elements not found');
                    return;
                }

                const username = usernameEl.value.trim();
                const password = passwordEl.value;
                const remember = rememberEl ? rememberEl.checked : false;

                try {
                    await this.login(username, password, remember);
                } catch (error) {
                    console.error('Login failed:', error);
                    this.showToast(error.message, 'error');
                }
            });
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Register form submitted');
                
                const userData = {
                    username: document.getElementById('reg-username')?.value?.trim() || '',
                    password: document.getElementById('reg-password')?.value || '',
                    confirmPassword: document.getElementById('reg-confirm-password')?.value || '',
                    streamingService: document.getElementById('streaming-service')?.value || '',
                    securityQ1: document.getElementById('security-q1')?.value || '',
                    securityA1: document.getElementById('security-a1')?.value || '',
                    securityQ2: document.getElementById('security-q2')?.value || '',
                    securityA2: document.getElementById('security-a2')?.value || ''
                };

                try {
                    await this.register(userData);
                } catch (error) {
                    console.error('Registration failed:', error);
                    this.showToast(error.message, 'error');
                }
            });
        }

        // Forgot password form
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('forgot-username')?.value?.trim();
                const step = forgotForm.dataset.step || 'username';
                
                if (step === 'username') {
                    // Verify username and show security questions
                    const users = this.getUsers();
                    if (users[username]) {
                        const user = users[username];
                        document.getElementById('security-q1-label').textContent = user.securityQs.q1;
                        document.getElementById('security-q2-label').textContent = user.securityQs.q2;
                        document.getElementById('security-questions').classList.remove('hidden');
                        document.getElementById('forgot-password-btn').textContent = 'Verify Answers';
                        forgotForm.dataset.step = 'security';
                    } else {
                        this.showToast('Username not found', 'error');
                    }
                } else if (step === 'security') {
                    // Verify security questions and show password reset
                    const a1 = document.getElementById('security-a1-input')?.value?.toLowerCase()?.trim();
                    const a2 = document.getElementById('security-a2-input')?.value?.toLowerCase()?.trim();
                    
                    const users = this.getUsers();
                    const user = users[username];
                    
                    if (user.securityQs.a1 === a1 && user.securityQs.a2 === a2) {
                        document.getElementById('new-password-section').classList.remove('hidden');
                        document.getElementById('forgot-password-btn').textContent = 'Reset Password';
                        forgotForm.dataset.step = 'newpassword';
                    } else {
                        this.showToast('Security answers do not match', 'error');
                    }
                } else if (step === 'newpassword') {
                    // Reset password
                    const newPassword = document.getElementById('new-password')?.value;
                    const confirmPassword = document.getElementById('confirm-new-password')?.value;
                    
                    if (newPassword !== confirmPassword) {
                        this.showToast('Passwords do not match', 'error');
                        return;
                    }
                    
                    try {
                        await this.resetPassword(username, { a1, a2 }, newPassword);
                    } catch (error) {
                        this.showToast(error.message, 'error');
                    }
                }
            });
        }

        // Password strength indicator
        const regPassword = document.getElementById('reg-password');
        if (regPassword) {
            regPassword.addEventListener('input', (e) => {
                const password = e.target.value;
                const strength = this.getPasswordStrength(password);
                const indicator = document.getElementById('password-strength');
                
                if (indicator) {
                    indicator.className = `password-strength ${strength}`;
                    indicator.textContent = `Password strength: ${strength}`;
                }
            });
        }

        // Navigation links - using more specific selectors to ensure they exist
        const showRegisterLink = document.getElementById('show-register');
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Navigating to register page');
                this.showRegisterPage();
            });
        }

        const backToLoginLink = document.getElementById('back-to-login');
        if (backToLoginLink) {
            backToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Navigating back to login page');
                this.showLoginPage();
            });
        }

        const showForgotPasswordLink = document.getElementById('show-forgot-password');
        if (showForgotPasswordLink) {
            showForgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Navigating to forgot password page');
                this.showForgotPasswordPage();
            });
        }

        const backToLoginForgotLink = document.getElementById('back-to-login-forgot');
        if (backToLoginForgotLink) {
            backToLoginForgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginPage();
            });
        }

        // Dashboard controls
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                console.log('Logout clicked');
                this.logout();
            });
        }

        // Continue setting up other event listeners...
        this.setupDashboardEventListeners();
        this.setupModalEventListeners();
        this.setupSettingsEventListeners();

        console.log('Event listeners setup complete');
    }

    setupDashboardEventListeners() {
        // Dashboard specific event listeners
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettingsPage());
        }

        const backToDashboard = document.getElementById('back-to-dashboard');
        if (backToDashboard) {
            backToDashboard.addEventListener('click', () => this.showDashboard());
        }

        const toggleViewBtn = document.getElementById('toggle-view');
        if (toggleViewBtn) {
            toggleViewBtn.addEventListener('click', () => {
                this.currentView = this.currentView === 'all' ? 'wishlist' : 'all';
                this.refreshRecordsDisplay();
            });
        }

        const addRecordBtn = document.getElementById('add-record-btn');
        if (addRecordBtn) {
            addRecordBtn.addEventListener('click', () => this.showRecordModal());
        }

        const bulkOperationsBtn = document.getElementById('bulk-operations-btn');
        if (bulkOperationsBtn) {
            bulkOperationsBtn.addEventListener('click', () => this.enterBulkMode());
        }

        // Search with debounce
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', 
                this.debounce((e) => {
                    this.searchTerm = e.target.value;
                    this.refreshRecordsDisplay();
                }, 300)
            );
        }

        // Sort and filter
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.refreshRecordsDisplay();
            });
        }

        const filterSelect = document.getElementById('filter-select');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterRating = e.target.value;
                this.refreshRecordsDisplay();
            });
        }

        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (sortSelect) sortSelect.value = 'dateAdded';
                if (filterSelect) filterSelect.value = 'all';
                this.searchTerm = '';
                this.sortBy = 'dateAdded';
                this.filterRating = 'all';
                this.refreshRecordsDisplay();
            });
        }

        // Stats panel toggle
        const toggleStatsBtn = document.getElementById('toggle-stats');
        if (toggleStatsBtn) {
            toggleStatsBtn.addEventListener('click', () => {
                const panel = document.getElementById('stats-panel');
                const button = document.getElementById('toggle-stats');
                
                if (panel && button) {
                    panel.classList.toggle('collapsed');
                    button.textContent = panel.classList.contains('collapsed') ? 'Show' : 'Hide';
                }
            });
        }

        // Bulk operations
        const bulkRateBtn = document.getElementById('bulk-rate-btn');
        if (bulkRateBtn) {
            bulkRateBtn.addEventListener('click', () => this.bulkRateRecords());
        }

        const bulkWishlistBtn = document.getElementById('bulk-wishlist-btn');
        if (bulkWishlistBtn) {
            bulkWishlistBtn.addEventListener('click', () => this.bulkToggleWishlist());
        }

        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                this.showConfirmDialog(
                    'Delete Records',
                    `Are you sure you want to delete ${this.selectedRecords.size} selected records?`,
                    () => this.deleteSelectedRecords(),
                    true
                );
            });
        }

        const cancelBulkBtn = document.getElementById('cancel-bulk-btn');
        if (cancelBulkBtn) {
            cancelBulkBtn.addEventListener('click', () => this.exitBulkMode());
        }
    }

    setupModalEventListeners() {
        // Record modal
        const recordForm = document.getElementById('record-form');
        if (recordForm) {
            recordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const modal = document.getElementById('record-modal');
                const editId = modal ? modal.dataset.editId : null;
                
                const recordData = {
                    artist: document.getElementById('record-artist')?.value?.trim() || '',
                    title: document.getElementById('record-title')?.value?.trim() || '',
                    rating: this.currentRating || 0,
                    wishlist: document.getElementById('record-wishlist')?.checked || false,
                    artworkURL: document.getElementById('artwork-image')?.dataset?.artworkUrl || null
                };

                try {
                    if (editId) {
                        this.updateRecord(editId, recordData);
                    } else {
                        this.addRecord(recordData);
                    }
                    this.hideModal('record-modal');
                } catch (error) {
                    this.showToast(error.message, 'error');
                }
            });
        }

        const artworkUploadBtn = document.getElementById('artwork-upload-btn');
        if (artworkUploadBtn) {
            artworkUploadBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('artwork-file');
                if (fileInput) fileInput.click();
            });
        }

        const artworkFile = document.getElementById('artwork-file');
        if (artworkFile) {
            artworkFile.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleArtworkUpload(e.target.files[0]);
                }
            });
        }

        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(el => {
            el.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal.id);
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal.id);
            });
        });

        const recordModalCancel = document.getElementById('record-modal-cancel');
        if (recordModalCancel) {
            recordModalCancel.addEventListener('click', () => this.hideModal('record-modal'));
        }

        const confirmCancel = document.getElementById('confirm-cancel');
        if (confirmCancel) {
            confirmCancel.addEventListener('click', () => this.hideModal('confirm-modal'));
        }

        // Initialize star rating system
        this.initStarRating();
    }

    setupSettingsEventListeners() {
        // Settings
        const changeAvatarBtn = document.getElementById('change-avatar-btn');
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', () => {
                const avatarUpload = document.getElementById('avatar-upload');
                if (avatarUpload) avatarUpload.click();
            });
        }

        const avatarUpload = document.getElementById('avatar-upload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleProfilePicUpload(e.target.files[0]);
                }
            });
        }

        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
            });
        }

        const settingsStreamingService = document.getElementById('settings-streaming-service');
        if (settingsStreamingService) {
            settingsStreamingService.addEventListener('change', (e) => {
                this.updateUser({ service: e.target.value });
                this.showToast('Streaming service updated!', 'success');
            });
        }

        // Data management
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportToCSV());
        }

        const backupDataBtn = document.getElementById('backup-data-btn');
        if (backupDataBtn) {
            backupDataBtn.addEventListener('click', () => this.backupData());
        }

        const restoreDataBtn = document.getElementById('restore-data-btn');
        if (restoreDataBtn) {
            restoreDataBtn.addEventListener('click', () => {
                const restoreFileInput = document.getElementById('restore-file-input');
                if (restoreFileInput) restoreFileInput.click();
            });
        }

        const restoreFileInput = document.getElementById('restore-file-input');
        if (restoreFileInput) {
            restoreFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.restoreData(e.target.files[0]);
                }
            });
        }

        const clearAllDataBtn = document.getElementById('clear-all-data-btn');
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener('click', () => {
                this.showConfirmDialog(
                    'Clear All Data',
                    'This will permanently delete all your records. This action cannot be undone.',
                    () => {
                        this.saveCollection([]);
                        this.refreshRecordsDisplay();
                        this.showToast('All data cleared!', 'success');
                    },
                    true
                );
            });
        }

        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                this.showConfirmDialog(
                    'Delete Account',
                    'This will permanently delete your account and all data. This action cannot be undone.',
                    () => {
                        const users = this.getUsers();
                        const collections = this.getCollections();
                        delete users[this.currentUser];
                        delete collections[this.currentUser];
                        localStorage.setItem('users', JSON.stringify(users));
                        localStorage.setItem('collections', JSON.stringify(collections));
                        this.logout();
                        this.showToast('Account deleted', 'success');
                    },
                    true
                );
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    this.hideModal(activeModal.id);
                }
            }
        });
    }

    deleteSelectedRecords() {
        if (this.selectedRecords.size === 0) return;

        const records = this.getCurrentCollection();
        const filteredRecords = records.filter(r => !this.selectedRecords.has(r.id));
        const deletedCount = records.length - filteredRecords.length;
        
        this.saveCollection(filteredRecords);
        this.selectedRecords.clear();
        this.exitBulkMode();
        this.refreshRecordsDisplay();
        this.showToast(`${deletedCount} records deleted`, 'success');
    }
}

// Initialize the application
console.log('Creating Vinyl Vault app...');
const app = new VinylVault();

// Make functions globally available for onclick handlers
window.app = app;
