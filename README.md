# GoalPulse | Secure Offline-First Financial Ledger

![Architecture](https://img.shields.io/badge/Architecture-Edge_Computing-blue)
![Security](https://img.shields.io/badge/Security-Biometric_Encrypted-green)
![Privacy](https://img.shields.io/badge/Data-Local_Sovereignty-orange)

## ◼️ Executive Summary
GoalPulse is a **privacy-centric financial architecture** designed to solve the latency and security vulnerabilities found in cloud-based banking apps.

By utilizing an **Edge-AI (On-Device)** approach, the system performs Optical Character Recognition (OCR) and financial forecasting locally on the user's device. This ensures **Zero-Knowledge Privacy**—financial data never leaves the encrypted local sandbox, eliminating the risk of cloud database breaches.

## 🏗 System Architecture
The application follows a **"Local-First"** architectural pattern, prioritizing data availability and partition tolerance (AP) in the CAP theorem.

### Core Components
* **Edge Intelligence Engine:** Integrated **Google ML Kit** for on-device receipt parsing. This decouples the app from expensive cloud APIs and allows for sub-100ms processing times even in offline environments.
* **Encrypted Persistence Layer:** utilized **Expo SQLite** with a custom abstraction layer to handle relational financial data.
* **Biometric Sentinel:** Implemented hardware-level authentication (FaceID/Fingerprint) via the `LocalAuthentication` API to secure the application state at the OS level.

### Tech Stack Strategy
| Component | Technology | Architectural Decision |
| :--- | :--- | :--- |
| **Framework** | React Native (Expo) | Cross-platform code sharing for rapid deployment. |
| **Routing** | Expo Router | File-based routing for intuitive deep-linking structure. |
| **ML/OCR** | ML Kit (On-Device) | Removed dependency on cloud APIs to ensure 100% privacy. |
| **Database** | SQLite | chosen for ACID compliance and complex relational queries. |

## 🚀 Key Capabilities
* **Autonomous Receipt Ingestion:** Users scan physical receipts; the Edge-AI extracts Vendor, Date, and Total automatically.
* **Dynamic Algorithmic Savings:** A randomized daily target algorithm that gamifies the savings process to meet monthly liquidity goals.
* **Zero-Latency Sync:** Since the "Source of Truth" is local, the UI is instantly responsive, unaffected by network conditions.

## 🔒 Security & Compliance
* **Data Sovereignty:** No PII (Personally Identifiable Information) is transmitted to external servers.
* **Ephemeral Processing:** Receipt images are processed in volatile memory and permanently purged after data extraction.

---
*© 2026 GoalPulse Financial Systems. Proprietary Architecture.*
