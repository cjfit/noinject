// Simple Authentication Service
// Gets user email via Chrome Identity API

class AuthService {
  constructor() {
    this.user = null;
  }

  // Get user email from Chrome
  async getUserEmail() {
    return new Promise((resolve) => {
      chrome.identity.getProfileUserInfo((userInfo) => {
        if (userInfo.email) {
          this.user = { email: userInfo.email };
          // Save to storage
          chrome.storage.local.set({ user: this.user });
          resolve(userInfo.email);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Check if user is signed in to Chrome
  async isSignedIn() {
    const email = await this.getUserEmail();
    return email !== null;
  }

  // Get cached user
  async getUser() {
    if (this.user) return this.user;
    const { user } = await chrome.storage.local.get(['user']);
    this.user = user || null;
    return this.user;
  }
}

// Export singleton
const authService = new AuthService();
export default authService;
