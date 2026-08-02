# Bug Bounty Report

Bug Bounty Report is a private, browser-based workspace for turning authorized security findings into clear, evidence-backed bug-bounty reports. It helps independent researchers and security teams document a finding from first observation through submission, triage, remediation, and retesting.

The application is designed to make reports easier for triage teams to verify: each report captures the affected asset, severity, CVSS context, expected and observed behavior, reproducible steps, evidence, impact, and recommended remediation. It supports workflows commonly used with HackerOne, Bugcrowd, Intigriti, YesWeHack, private programs, and direct disclosure.

## What it helps you do

- Create structured reports from a blank draft, a reusable template, or a knowledge-base entry.
- Document findings with numbered reproduction steps, prerequisites, expected results, actual results, references, and disclosure timelines.
- Attach and organize evidence, including images, URLs, notes, and HTTP-transcript context.
- Use built-in reporting guidance and safe fictional examples for common web, API, mobile, configuration, and business-logic finding types.
- Calculate or record CVSS, assess report quality, check likely duplicate/similar reports, and validate scope against saved program assets and rules.
- Prepare a submission checklist and track platform, report ID, analyst communication, outcome, bounty, and follow-up dates.
- Track the finding lifecycle, group related finding families, compare remediation with retest evidence, and record regressions.
- Export report content as Markdown and create deliberately sanitized Markdown, text, HTML, ZIP, or professional PDF copies for sharing.
- Create metadata, full-evidence, and encrypted backup packages, and restore workspace data when needed.

## How to use it for bug bounty work

1. Start with **Settings** to add your researcher profile and choose your preferred report defaults. Add each authorized program and its in-scope assets under **Programs** before documenting findings.
2. In **Templates** or **Knowledge Base**, select a suitable vulnerability type to begin with structured prompts and evidence checklists. Alternatively, create a blank report from **Reports**.
3. Record the finding precisely: name the program, target and affected asset; describe the expected security control and observed behavior; then add concise, repeatable steps. Attach only evidence necessary to verify the issue.
4. Describe impact based on what your evidence shows, not on assumptions. Use the CVSS calculator when it helps communicate severity, and include practical remediation advice.
5. Before submission, run the report-quality check, review scope validation and similarity candidates, and use the sensitive-data scan to identify text that may need redaction. Check every screenshot and attachment manually as well.
6. Open **Submission** to complete the checklist and log the target platform, submission reference, status, communications, and any requests for more information. The workspace prepares and tracks reports; submit them through the program's official disclosure channel yourself.
7. When the program responds, update the lifecycle, preserve the discussion in **Communications**, and use **Retests** to compare the original behavior with the remediated result. Archive resolved work while keeping the report history available.

## Privacy and data handling

Workspace records are kept in the browser: report data and settings use browser storage, while evidence files use IndexedDB. This makes the tool suitable for a personal local workflow, but it also means browser-profile loss or clearing site data can remove your workspace. Export backups regularly, and use encrypted backups for sensitive material.

The optional workspace lock discourages casual access while the application is open; it does not encrypt existing browser storage. Sanitized exports require deliberate review: original image binaries are excluded unless you explicitly select a redacted replacement, and sensitive values should always be checked before sharing.

## Responsible use

Use this project only for systems and programs you are explicitly authorized to test. Follow each program's scope, rules, safe-harbor terms, rate limits, and disclosure policy. Do not include live credentials, personal data, payment information, session tokens, or unnecessary exploit details in a report or export.

## Built with

React, TypeScript, Vite, Tailwind CSS, and browser-native storage, with PDF export powered by `@react-pdf/renderer`.


https://bug-bounty-report.vercel.app/
