        // Forgot password form
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            let currentUsername = ''; // Store username outside event handler
            
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const step = forgotForm.dataset.step || 'username';
                
                if (step === 'username') {
                    // Verify username and show security questions
                    const username = document.getElementById('forgot-username')?.value?.trim();
                    currentUsername = username; // Store for later steps
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
                    const user = users[currentUsername]; // Use stored username
                    
                    if (user && user.securityQs.a1 === a1 && user.securityQs.a2 === a2) {
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
                        const a1 = document.getElementById('security-a1-input')?.value?.toLowerCase()?.trim();
                        const a2 = document.getElementById('security-a2-input')?.value?.toLowerCase()?.trim();
                        await this.resetPassword(currentUsername, { a1, a2 }, newPassword);
                        
                        // Reset form after successful password reset
                        forgotForm.reset();
                        forgotForm.dataset.step = 'username';
                        document.getElementById('security-questions').classList.add('hidden');
                        document.getElementById('new-password-section').classList.add('hidden');
                        document.getElementById('forgot-password-btn').textContent = 'Continue';
                        currentUsername = '';
                    } catch (error) {
                        this.showToast(error.message, 'error');
                    }
                }
            });
        }
