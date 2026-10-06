/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { SitePage } from "@/types/database";

export function generatePrivacyPolicy(
  appName: string,
  contactEmail: string = "support@example.com"
): string {
  const date = new Date().toISOString().split("T")[0];
  return `# Privacy Policy for ${appName}

**Effective Date:** ${date}  
**Last Updated:** ${date}

Thank you for choosing **${appName}**. We are committed to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, and protect your information when you download and use our mobile application and related services.

---

### 1. Information We Collect

We only collect information necessary to provide and improve the ${appName} experience:

- **Account Information:** If you create an account, we may collect your email address, display name, and authentication credentials.
- **Usage & Diagnostics Data:** In accordance with Apple App Store and Google Play guidelines, we collect anonymized telemetry data (such as app launch times, crash logs, and session durations) to identify bugs and optimize performance.
- **Device Information:** Device model, operating system version, and unique device identifiers necessary for push notifications.

### 2. Device Permissions

Depending on your use of ${appName}, the app may request access to:
- **Notifications:** To deliver important transactional updates, alerts, and feature reminders. You can opt out at any time in device settings.
- **Photos / Storage:** Only requested when you explicitly choose to upload images or export content within the app.

### 3. Third-Party Service Providers

We may employ third-party companies and individuals to facilitate our service:
- Cloud storage and backend authentication
- Crash reporting and performance monitoring
- In-App Purchase and subscription management via Apple App Store or Google Play Store

These third parties have access to your personal information only to perform specific tasks on our behalf and are obligated not to disclose or use it for any other purpose.

### 4. Data Retention & Account Deletion

In accordance with Apple App Store Review Guideline 5.1.1(v) and Google Play policy:
- You have the absolute right to request the deletion of your account and all associated personal data at any time.
- To initiate account deletion, visit our in-app settings or email our data protection team directly at [${contactEmail}](mailto:${contactEmail}). All data will be purged within 30 days of request receipt.

### 5. Children's Privacy

${appName} does not knowingly collect personally identifiable information from children under the age of 13. If you believe your child has provided us with personal information, please contact us immediately.

### 6. Contact Us

If you have questions or suggestions about our Privacy Policy, please contact us at:  
📧 **[${contactEmail}](mailto:${contactEmail})**
`;
}

export function generateTermsOfService(
  appName: string,
  contactEmail: string = "support@example.com"
): string {
  const date = new Date().toISOString().split("T")[0];
  return `# Terms of Service for ${appName}

**Effective Date:** ${date}

Please read these Terms of Service ("Terms") carefully before using the **${appName}** mobile application operated by our team.

---

### 1. Agreement to Terms

By downloading, installing, or accessing ${appName}, you agree to be bound by these Terms. If you disagree with any part of the terms, you must not access the application.

### 2. End User License Agreement (EULA)

We grant you a non-exclusive, non-transferable, revocable license to use ${appName} strictly in accordance with these Terms and applicable App Store or Google Play Terms of Service. This license is for your personal, non-commercial use unless explicitly agreed otherwise.

### 3. Subscriptions and In-App Purchases

- **Billing:** If you choose to purchase an optional subscription or in-app purchase within ${appName}, payment is charged to your Apple ID or Google Play Account at confirmation of purchase.
- **Auto-Renewal:** Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current billing cycle.
- **Management:** You can manage or cancel your subscription at any time through your Apple ID Account Settings or Google Play Subscriptions center. Refunds are handled directly in accordance with Apple and Google standard refund policies.

### 4. Acceptable Use

You agree not to:
- Reverse engineer, decompile, or disassemble the application.
- Use the service for any illegal purpose or in violation of any local, state, national, or international law.
- Interfere with or disrupt the security features or integrity of our servers and networks.

### 5. Disclaimer of Warranties & Limitation of Liability

${appName} is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind. In no event shall the developers or contributors of ${appName} be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the application.

### 6. Contact Information

For questions regarding these Terms of Service, please reach out to:  
📧 **[${contactEmail}](mailto:${contactEmail})**
`;
}

export function generateSupportPage(
  appName: string,
  contactEmail: string = "support@example.com"
): string {
  return `# Support & Help Center for ${appName}

Need help with **${appName}**? We're here to assist you.

---

### Quick Assistance

- 📧 **Direct Email Support:** [${contactEmail}](mailto:${contactEmail})
- ⏱️ **Average Response Time:** Under 24 hours on business days
- 📱 **App Store Support Guideline §1.5:** Functional contact link for all active users

---

### Frequently Asked Questions

#### How do I restore my purchase or subscription?
Open ${appName} on your mobile device, navigate to **Settings > Subscription**, and tap **"Restore Purchases"**. Ensure you are signed in with the same Apple ID or Google Account used for the original purchase.

#### How do I cancel my subscription?
Subscriptions are managed directly by Apple or Google:
- **iOS:** Open device **Settings > [Your Name] > Subscriptions > ${appName} > Cancel Subscription**.
- **Android:** Open **Google Play Store > Profile > Payments & Subscriptions > Subscriptions > ${appName} > Cancel**.

#### How do I request account deletion?
We respect your privacy and provide a seamless way to delete your data. You can initiate instant deletion within the app under **Settings > Privacy > Delete Account**, or email us directly at [${contactEmail}](mailto:${contactEmail}) with the subject line *"Account Deletion Request"*.

#### The app crashed or isn't behaving as expected. What should I do?
1. Ensure you have updated to the latest version of ${appName} from the App Store or Google Play.
2. Force quit the application and relaunch it.
3. If the problem persists, please email [${contactEmail}](mailto:${contactEmail}) with your device model, OS version, and a brief description of the issue.

---

### Submit a Support Ticket

Send your inquiries, bug reports, and feature requests directly to:  
📧 **[${contactEmail}](mailto:${contactEmail})**
`;
}

export function getDefaultSitePages(
  appName: string,
  contactEmail: string = "support@example.com"
): SitePage[] {
  const now = new Date().toISOString();
  return [
    {
      id: "page-home",
      slug: "",
      title: "Home",
      nav_label: "Home",
      show_in_nav: false,
      show_in_footer: false,
      page_type: "home",
      is_system: true,
      is_published: true,
      content_markdown: "",
      updated_at: now,
    },
    {
      id: "page-privacy",
      slug: "privacy",
      title: "Privacy Policy",
      nav_label: "Privacy",
      show_in_nav: true,
      show_in_footer: true,
      page_type: "privacy",
      is_system: true,
      is_published: true,
      content_markdown: generatePrivacyPolicy(appName, contactEmail),
      meta_title: `Privacy Policy - ${appName}`,
      meta_description: `Official Privacy Policy and data safety disclosures for the ${appName} mobile application.`,
      updated_at: now,
    },
    {
      id: "page-terms",
      slug: "terms",
      title: "Terms of Service",
      nav_label: "Terms",
      show_in_nav: true,
      show_in_footer: true,
      page_type: "terms",
      is_system: true,
      is_published: true,
      content_markdown: generateTermsOfService(appName, contactEmail),
      meta_title: `Terms of Service - ${appName}`,
      meta_description: `End User License Agreement (EULA) and Terms of Service for ${appName}.`,
      updated_at: now,
    },
    {
      id: "page-support",
      slug: "support",
      title: "Support & Contact",
      nav_label: "Support",
      show_in_nav: true,
      show_in_footer: true,
      page_type: "support",
      is_system: true,
      is_published: true,
      content_markdown: generateSupportPage(appName, contactEmail),
      meta_title: `Support & Help Center - ${appName}`,
      meta_description: `Get assistance, read troubleshooting FAQs, or contact support for ${appName}.`,
      updated_at: now,
    },
  ];
}
