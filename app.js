class VinylApp {
    constructor() {
        this.currentUser = null;
        this.records = [];
        this.initializeApp();
    }

    initializeApp() {
        // Page navigation event listeners
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('register-page');
        });

        document.getElementById('show-forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('forgot-password-page');
        });

        document.getElementById('back-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('login-page');
        });

        document.getElementById('back-to-login-forgot')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('login-page');
        });
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show the requested page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    }

    getUsers() {
        // Mock user data for testing
        return {
            'testuser': {
                password: 'password123',
                securityQs: {
                    q1: 'What was your first pet\'s name?',
                    a1: 'fluffy',
                    q2: 'What city were you born in?',
                    a2: 'paris'
                }
            }
        };
    }

    showToast(message, type) {
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    async resetPassword(username, securityAnswers, newPassword) {
        console.log('Password reset would be performed here');
        this.showToast('Password reset successfully!', 'success');
        this.showPage('login-page');
    }

    // Forgot password form
    initializeForgotPasswordForm() {
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            let currentUsername = ''; // Store username outside event handler
            
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const step = forgotForm.dataset.step || 'username';
                console.log('=== FORGOT PASSWORD DEBUG ===');
                console.log('Current step:', step);
                console.log('Form dataset.step:', forgotForm.dataset.step);
                console.log('Current username stored:', currentUsername);
                
                if (step === 'username') {
                    console.log('Executing USERNAME step');
                    // Verify username and show security questions
                    const username = document.getElementById('forgot-username')?.value?.trim();
                    console.log('Username input value:', username);
                    console.log('Username element found:', !!document.getElementById('forgot-username'));
                    currentUsername = username; // Store for later steps
                    const users = this.getUsers();
                    console.log('Users retrieved:', Object.keys(users));
                    if (users[username]) {
                        console.log('User found in database:', username);
                        const user = users[username];
                        console.log('User security questions:', user.securityQs);
                        document.getElementById('security-q1-label').textContent = user.securityQs.q1;
                        document.getElementById('security-q2-label').textContent = user.securityQs.q2;
                        document.getElementById('security-questions').classList.remove('hidden');
                        document.getElementById('forgot-password-btn').textContent = 'Verify Answers';
                        forgotForm.dataset.step = 'security';
                        console.log('Updated step to security, dataset.step now:', forgotForm.dataset.step);
                    } else {
                        console.log('User NOT found in database:', username);
                        this.showToast('Username not found', 'error');
                    }
                } else if (step === 'security') {
                    console.log('Executing SECURITY step');
                    // Verify security questions and show password reset
                    const a1 = document.getElementById('security-a1-input')?.value?.toLowerCase()?.trim();
                    const a2 = document.getElementById('security-a2-input')?.value?.toLowerCase()?.trim();
                    console.log('Security answer 1:', a1);
                    console.log('Security answer 2:', a2);
                    console.log('Security input elements found:', {
                        a1Element: !!document.getElementById('security-a1-input'),
                        a2Element: !!document.getElementById('security-a2-input')
                    });
                    
                    const users = this.getUsers();
                    const user = users[currentUsername]; // Use stored username
                    console.log('Using stored username:', currentUsername);
                    console.log('User found for security check:', !!user);
                    
                    if (user && user.securityQs.a1 === a1 && user.securityQs.a2 === a2) {
                        console.log('Security answers match! Expected:', user.securityQs);
                        document.getElementById('new-password-section').classList.remove('hidden');
                        document.getElementById('forgot-password-btn').textContent = 'Reset Password';
                        forgotForm.dataset.step = 'newpassword';
                        console.log('Updated step to newpassword, dataset.step now:', forgotForm.dataset.step);
                    } else {
                        console.log('Security answers do NOT match. Expected:', user?.securityQs, 'Got:', {a1, a2});
                        this.showToast('Security answers do not match', 'error');
                    }
                } else if (step === 'newpassword') {
                    console.log('Executing NEWPASSWORD step');
                    // Reset password
                    const newPassword = document.getElementById('new-password')?.value;
                    const confirmPassword = document.getElementById('confirm-new-password')?.value;
                    console.log('New password length:', newPassword?.length);
                    console.log('Confirm password length:', confirmPassword?.length);
                    console.log('Password elements found:', {
                        newPasswordElement: !!document.getElementById('new-password'),
                        confirmPasswordElement: !!document.getElementById('confirm-new-password')
                    });
                    
                    if (newPassword !== confirmPassword) {
                        console.log('Passwords do not match');
                        this.showToast('Passwords do not match', 'error');
                        return;
                    }
                    
                    try {
                        const a1 = document.getElementById('security-a1-input')?.value?.toLowerCase()?.trim();
                        const a2 = document.getElementById('security-a2-input')?.value?.toLowerCase()?.trim();
                        console.log('Attempting password reset for user:', currentUsername);
                        await this.resetPassword(currentUsername, { a1, a2 }, newPassword);
                        
                        console.log('Password reset successful, resetting form');
                        // Reset form after successful password reset
                        forgotForm.reset();
                        forgotForm.dataset.step = 'username';
                        document.getElementById('security-questions').classList.add('hidden');
                        document.getElementById('new-password-section').classList.add('hidden');
                        document.getElementById('forgot-password-btn').textContent = 'Continue';
                        currentUsername = '';
                        console.log('Form reset complete');
                    } catch (error) {
                        console.log('Password reset error:', error.message);
                        this.showToast(error.message, 'error');
                    }
                }
                console.log('=== END FORGOT PASSWORD DEBUG ===\n');
            });
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new VinylApp();
    app.initializeForgotPasswordForm();
});
