import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const POLICY_TEXT = `Privacy Policy for Mechanic Setu
Effective Date: [Insert Effective Date]
Last Updated: [Insert Update Date]

1. Introduction
Welcome to Mechanic Setu.
Mechanic Setu (“we”, “our”, “us”, or “Platform”) is a digital platform designed to connect vehicle owners with verified mechanics and service partners for emergency breakdown assistance, scheduled servicing, and vehicle management solutions.
We are committed to protecting your privacy and ensuring transparency in how your personal data is collected, processed, stored, and shared.
This Privacy Policy explains:
What information we collect
Why we collect it
How we use and protect it
Your rights regarding your data
This policy applies to:
Mechanic Setu Mobile Applications
Mechanic Setu Website
Associated APIs and backend services
This Privacy Policy is designed in compliance with:
India’s Digital Personal Data Protection Act, 2023 (DPDP Act)
Information Technology Act, 2000
Google Play Store Developer Policies
Applicable Indian data protection and consumer laws.
By using Mechanic Setu, you agree to the practices described in this Privacy Policy.

2. Definitions
For clarity within this policy:
User / Customer — Individual requesting vehicle services.
Service Partner / Mechanic — Verified mechanic or workshop registered on Mechanic Setu.
Personal Data — Any information that identifies an individual directly or indirectly.
Sensitive Personal Data — Identity documents, location data, and verification records.
Processing — Collection, storage, usage, sharing, or deletion of data.

3. Information We Collect
We collect only the data necessary to operate and improve our services.

3.1 Account Information (Users)
When creating an account, we may collect:
First Name and Last Name
Mobile Number
Email Address
Profile Photo
Authentication identifiers (Google Login ID or OTP verification data)
This information enables secure account creation and communication.

3.2 Mechanic / Service Partner Information (KYC)
To maintain trust and safety on the platform, we verify mechanics through Know Your Customer (KYC) procedures.
We may collect:
Shop Name
Business Address
Contact Information
Aadhaar Card details
Identity verification documents
Workshop images
Banking or payout-related information
Service history and performance data
KYC documents are collected strictly for identity verification and fraud prevention.

3.3 Vehicle & Registration Certificate (RC) Data
To provide accurate vehicle-specific services, we may collect or retrieve:
Vehicle Identifiers
Vehicle Registration Number
Chassis Number
Engine Number
Owner Information (as available via authorized APIs)
Registered Owner Name
Address information
Vehicle classification
Compliance Details
Insurance provider and expiry
Pollution certificate (PUCC)
Tax validity
Permit information
Financer details
This information may be obtained through authorized third-party vehicle data providers.

3.4 Service Request Information
When booking a mechanic:
Vehicle type
Problem description
Emergency details
Service category
Preferred time/date
Uploaded images or notes

3.5 Location Information (Core Platform Requirement)
Location data is essential for Mechanic Setu’s functionality.
Customers
We collect precise GPS location when you:
Request emergency service
Search nearby mechanics
Track mechanic arrival
Mechanics
We may collect:
Shop location coordinates
Live background location during active availability
Real-time location during assigned jobs
Important Disclosure (Google Play Compliance):
Location data may be collected even when the app is running in the background for active service partners to enable:
Job routing
ETA tracking
Safety monitoring
Location tracking occurs only when service availability is enabled.

3.6 Authentication & Technical Data
We automatically collect:
Device type
App version
IP address
Login timestamps
Session tokens
Crash analytics data
This ensures platform security and performance.

4. How We Use Your Information
We process personal data only for legitimate and lawful purposes.

4.1 Service Delivery
Match customers with nearby mechanics
Dispatch emergency assistance
Provide real-time tracking
Maintain service history

4.2 Identity Verification & Trust
Verify mechanics through KYC
Prevent fraudulent activities
Detect misuse or fake accounts

4.3 Authentication & Security
We use:
OTP verification
JWT authentication
Secure session management
Token rotation and blacklisting

4.4 Communication
We may send:
OTP verification messages
Service updates
Booking confirmations
Support responses
Important platform notifications
Communication may occur via email, SMS, or in-app notifications.

4.5 Platform Improvement
We analyze aggregated data to:
Improve matching algorithms
Optimize service response time
Enhance user experience
No personally identifiable data is sold or used for advertising resale.

5. Data Sharing and Disclosure
We do not sell personal data.
We share data only when necessary.

5.1 Between Customers and Mechanics
When a job is accepted:
Customers share:
Name
Contact number
Vehicle details
Location
Mechanics share:
Profile details
Shop information
Live location during service

5.2 Third-Party Service Providers
We may share limited data with trusted providers such as:
Cloud hosting services (e.g., Vercel, Render)
Database infrastructure providers
Email and SMS gateways
OAuth authentication providers
Vehicle data APIs
These providers process data only on our instructions.

5.3 Legal Compliance
We may disclose information if required:
By Indian law enforcement agencies
Under court orders
For fraud investigations
To comply with legal obligations

6. Data Security
We implement industry-standard safeguards.
Encryption
HTTPS/SSL encryption for all communications.
Authentication Security
JWT-based authentication
HTTP-only cookies
Secure SameSite policies
Storage Protection
Secure blob storage for documents
Access-controlled infrastructure
Restricted internal access
Password & OTP Safety
Cryptographic hashing (not stored in plain text)

7. Data Retention
We retain data only as long as necessary.
Data Type
Retention Period
Account Information
Until account deletion
Service History
Operational necessity
KYC Documents
As required by law
Financial Records
As required by tax laws

Inactive or unnecessary data may be periodically removed.

8. Your Rights Under DPDP Act, 2023
You have the right to:
Access
Request a copy of your personal data.
Correction
Update incorrect or outdated information.
Erasure
Request deletion of your account and data.
Withdraw Consent
Disable permissions such as location access anytime.
Grievance Redressal
File complaints regarding data misuse.

9. Children's Privacy
Mechanic Setu services are not intended for individuals under 18 years of age.
We do not knowingly collect data from minors.

10. Cookies and Session Technologies
We use secure cookies to:
Maintain login sessions
Protect authentication tokens
Prevent unauthorized access
Users may disable cookies via browser settings, though functionality may be affected.

11. Google Play Store Compliance Disclosure
Before requesting sensitive permissions, Mechanic Setu provides in-app prominent disclosure explaining:
“Mechanic Setu collects location data to enable mechanic routing, emergency assistance, and live tracking, even when the app is closed or not in use (for active mechanics).”
Permissions are requested only when necessary.

12. International Data Processing
While Mechanic Setu primarily operates in India, data may be processed on secure cloud servers located in other regions complying with applicable security standards.

13. Changes to This Privacy Policy
We may update this policy periodically due to:
Legal updates
Platform improvements
Security enhancements
Users will be notified via:
App notifications
Email communication
Website updates
Continued use signifies acceptance of updates.

14. Contact & Grievance Officer
For privacy concerns, requests, or complaints:
Mechanic Setu – Grievance Officer
Email: mechanicsetu+support@gmail.com
Business Contact: mechanicsetu+business@gmail.com
Address: [Insert Registered Business Address]
We aim to respond within legally required timelines under Indian law.

15. Consent
By creating an account or using Mechanic Setu, you acknowledge that:
You have read this Privacy Policy.
You understand how your data is used.
You consent to data processing as described.
16. Background Location Usage Disclosure
Mechanic Setu may access background location data for active service partners (mechanics) when they enable availability status.
This is necessary to:
Assign nearby service requests accurately
Provide real-time ETA tracking
Ensure customer safety during active jobs
Prevent fake availability or service fraud
Background location tracking stops automatically when:
The mechanic disables availability, or
The service is completed.
Users can disable location permissions anytime through device settings.

17. Automated Matching and Decision Systems
Mechanic Setu uses automated systems to match customers with mechanics based on:
Geographic proximity


Vehicle type compatibility


Mechanic availability


Service history and ratings


These automated processes help ensure faster response times and efficient service delivery.
No automated decision produces legal or similarly significant effects without human oversight.
19. Fraud Prevention and Safety Monitoring
To maintain platform integrity, Mechanic Setu may monitor activity patterns to detect:
Fake accounts


Fraudulent service requests


Unauthorized vehicle claims


Suspicious login behavior


Security monitoring is performed using automated safeguards and internal review processes.
21. Third-Party Services and Links
The Platform may contain integrations or links to third-party services including authentication providers, vehicle data APIs, or payment systems.
Mechanic Setu is not responsible for the privacy practices of external services. Users are encouraged to review their respective privacy policies.
22. Account Suspension and Termination
Mechanic Setu reserves the right to suspend or terminate accounts that violate platform policies or applicable laws.
Upon termination:
Access to services will be revoked.


Personal data will be handled according to our retention and deletion policies.


Legally required records may be retained.
Our Privacy Commitment
Mechanic Setu is built on trust. We design our systems with privacy-first principles, minimizing data collection wherever possible while ensuring safe and reliable vehicle assistance services.
We continuously improve our security, transparency, and user control mechanisms.
`;

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View className="px-4 py-4 flex-row items-center bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Privacy Policy
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 py-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-sm text-slate-700 dark:text-slate-300 leading-6"
          selectable
        >
          {POLICY_TEXT}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
