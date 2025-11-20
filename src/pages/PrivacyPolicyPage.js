/**
 * PrivacyPolicyPage - Privacy policy information
 */
import BasePage from './BasePage.js';

class PrivacyPolicyPage extends BasePage {
    constructor(container, props = {}) {
        super(container, props);
        this.setTitle('Privacy Policy');
    }

    onCreate() {
        // No state subscriptions needed for static page
    }

    onMount() {
        // No additional setup needed
    }

    render() {
        return `
            <div class="page-container">
                <div class="privacy-container">
                    <div class="privacy-header">
                        <h1 class="privacy-title">Privacy Policy</h1>
                        <p class="privacy-updated">Last updated: November 20, 2025</p>
                    </div>

                    <div class="privacy-highlight">
                        <strong>Your data stays yours.</strong> TeamBalance is designed with privacy at its core. Everything runs in your browser, and your data never leaves your device unless you explicitly choose to export it.
                    </div>

                    <div class="privacy-section">
                        <h2>Overview</h2>
                        <p>
                            TeamBalance ("we", "our", or "the app") is a client-side web application for creating balanced teams. This privacy policy explains how we handle your information.
                        </p>
                    </div>

                    <div class="privacy-section">
                        <h2>Information We Collect</h2>

                        <h3>Local Data Storage</h3>
                        <p>
                            All your data (player names, ratings, teams, activity configurations) is stored locally in your browser using:
                        </p>
                        <ul>
                            <li><strong>LocalStorage:</strong> For persistent data storage</li>
                            <li><strong>SessionStorage:</strong> For temporary session data</li>
                        </ul>
                        <p>
                            This data never leaves your device and is not transmitted to any server operated by us.
                        </p>

                        <h3>No Analytics or Tracking</h3>
                        <p>
                            We do not use analytics tools, tracking pixels, cookies, or any other mechanisms to collect information about your usage of the application.
                        </p>
                    </div>

                    <div class="privacy-section">
                        <h2>Third-Party Services</h2>

                        <h3>Google Sheets Integration (Optional)</h3>
                        <p>
                            TeamBalance offers an optional integration with Google Sheets that allows you to export your player data. This integration:
                        </p>
                        <ul>
                            <li>Requires explicit user consent through Google's OAuth 2.0 authorization flow</li>
                            <li>Only requests access to create and modify Google Sheets files that you explicitly authorize</li>
                            <li>Uses the Google Sheets API solely to write data you choose to export</li>
                            <li>Does not store your Google credentials or access tokens on our servers</li>
                            <li>Tokens are stored only in your browser's local storage</li>
                        </ul>

                        <h3>Google OAuth Permissions</h3>
                        <p>
                            When you use the Google Sheets export feature, we request the following permissions:
                        </p>
                        <ul>
                            <li><strong>View and manage Google Sheets files:</strong> To create new spreadsheets and write your player data</li>
                        </ul>
                        <p>
                            You can revoke these permissions at any time through your
                            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account permissions page</a>.
                        </p>

                        <h3>GitHub Pages Hosting</h3>
                        <p>
                            TeamBalance is hosted on GitHub Pages. GitHub may collect technical information as described in their
                            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer">Privacy Statement</a>.
                        </p>
                    </div>

                    <div class="privacy-section">
                        <h2>Data Security</h2>
                        <p>
                            Your data security is ensured by:
                        </p>
                        <ul>
                            <li><strong>Client-side processing:</strong> All computations happen in your browser</li>
                            <li><strong>No server storage:</strong> We don't operate servers that store your data</li>
                            <li><strong>HTTPS encryption:</strong> The application is served over HTTPS</li>
                            <li><strong>Browser security:</strong> Data is protected by your browser's security features</li>
                        </ul>
                    </div>

                    <div class="privacy-section">
                        <h2>Data Retention</h2>
                        <p>
                            Your data remains in your browser's local storage until you:
                        </p>
                        <ul>
                            <li>Clear your browser's local storage</li>
                            <li>Uninstall your browser</li>
                            <li>Manually delete the data through the application or browser settings</li>
                        </ul>
                    </div>

                    <div class="privacy-section">
                        <h2>Your Rights</h2>
                        <p>
                            You have complete control over your data:
                        </p>
                        <ul>
                            <li><strong>Access:</strong> All your data is accessible through the application interface</li>
                            <li><strong>Export:</strong> You can export your data to CSV or Google Sheets</li>
                            <li><strong>Delete:</strong> You can clear all data through your browser settings</li>
                            <li><strong>Portability:</strong> You can export and transfer your data at any time</li>
                        </ul>
                    </div>

                    <div class="privacy-section">
                        <h2>Children's Privacy</h2>
                        <p>
                            TeamBalance does not knowingly collect any personal information from children. The application does not require registration or personal information to use.
                        </p>
                    </div>

                    <div class="privacy-section">
                        <h2>Changes to This Policy</h2>
                        <p>
                            We may update this privacy policy from time to time. The "Last updated" date at the top of this page will reflect when changes were made. We encourage you to review this policy periodically.
                        </p>
                    </div>

                    <div class="privacy-section">
                        <h2>Open Source</h2>
                        <p>
                            TeamBalance is open source software. You can review our code and verify our privacy practices at:
                            <a href="https://github.com/avpv/team-balance" target="_blank" rel="noopener noreferrer">https://github.com/avpv/team-balance</a>
                        </p>
                    </div>

                    <div class="privacy-section">
                        <h2>Contact</h2>
                        <p>
                            For questions about this privacy policy or our privacy practices, please open an issue on our
                            <a href="https://github.com/avpv/team-balance/issues" target="_blank" rel="noopener noreferrer">GitHub repository</a>.
                        </p>
                    </div>

                    <div class="privacy-footer">
                        <p>This privacy policy is effective as of November 20, 2025.</p>
                        <a href="/" class="back-link" data-route="/">← Back to TeamBalance</a>
                    </div>
                </div>
            </div>
        `;
    }
}

export default PrivacyPolicyPage;
