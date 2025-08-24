# Trading Log App Product Requirements Document (PRD)

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| August 12, 2025 | 1.0 | Initial PRD draft | John, Product Manager |

## 1. Goals and Background Context

### Goals
- To create an indispensable trading journal that serves as a "discipline partner" for a serious retail trader.
- The primary goal of the MVP is to achieve three consecutive months of consistent personal use, validating its core utility.
- To provide an active tool that helps a trader improve their adherence to risk management rules and learn from their past performance.

### Background Context
Most retail traders fail due to a lack of discipline in managing their mindset, methods, and money. Existing logging tools are often passive spreadsheets or simple note apps that don't actively reinforce the principles needed for success.

This application will solve this problem by being an active partner in the trader's journey. It directly integrates the core "Three M's" (Mind, Method, Money Management) from Dr. Alexander Elder's "Come Into My Trading Room," providing real-time risk management feedback, structured trade analysis, and integrated psychological journaling.

## 2. Requirements

### Functional Requirements
- **FR1:** The system shall allow a user to manually set and update their total cash equity.
- **FR2:** The system shall provide a form to log new trades, capturing entry price, trade size, and stop-loss price.
- **FR3:** The system must calculate the monetary risk of any new trade and display a prominent visual warning if that risk exceeds 2% of the user's total equity.
- **FR4:** The system must calculate and display the total combined risk of all active trades on a dashboard widget, with a visual warning if the total exceeds 6% of equity.
- **FR5:** The system shall allow a user to log their trade analysis across three timeframes using pre-defined menus for indicators/signals and a free-text field for notes.
- **FR6:** The system shall allow a user to attach pre-defined psychological state "tags" to each trade record.
- **FR7:** The system must provide a function to "close" an active trade, which prompts the user for an exit price, calculates the realized profit/loss, and updates the total equity.
- **FR8:** The system must provide a review screen where a user can filter their trade history by criteria including outcome (win/loss), indicator used, and signal observed.
- **FR9:** The system must calculate and display key performance statistics (Win/Loss Ratio, Average Profit, Average Loss) for any filtered set of trades.

### Non-Functional Requirements
- **NFR1:** The system shall be a responsive web application, fully functional on modern desktop and mobile browsers.
- **NFR2:** The system must fetch near-real-time market data from a third-party API to calculate a live equity curve on the user's dashboard.
- **NFR3:** The user interface must be fast and responsive, with no noticeable lag during data entry or filtering operations.
- **NFR4:** All trade data for the MVP will be entered manually by the user.

## 3. User Interface Design Goals

### Overall UX Vision
The vision is for a clean, data-focused, and uncluttered interface that feels like a professional tool. The design should prioritize clarity and quick access to information, reducing the trader's cognitive load and helping them make disciplined decisions.

### Key Interaction Paradigms
The application will be dashboard-centric, providing an at-a-glance view of the trader's current status (equity and risk). Key interactions will include quick data entry via structured forms, "one-click" actions to manage trades, and powerful, interactive filtering of the trade log.

### Core Screens and Views
- **Main Dashboard:** The first screen the user sees, featuring the Live Equity Curve chart and the Total Active Risk widget.
- **Trade Journal:** A filterable and sortable list of all past and active trades.
- **New Trade Entry Form:** A dedicated form/modal for logging new trades.
- **Trade Review & Analysis Screen:** The dedicated area for filtering trades and viewing performance statistics.

### Accessibility
**Standard:** Aims to meet WCAG AA compliance, ensuring the app is usable by people with a wide range of abilities.

### Branding
**Initial Theme:** No specific branding has been defined. The MVP will use a clean, professional, and neutral theme with a focus on readability.

### Target Device and Platforms
**Primary Platform:** A responsive web application designed to be fully functional on both desktop and mobile browsers.

## 4. Technical Assumptions

### Repository Structure: Monorepo
A single repository will be used to hold both the frontend and backend code. This simplifies development and makes it easier to share code and types between them.

### Service Architecture: Monolith
The backend will be built as a single, unified service (a monolith). This approach is simpler and faster for an MVP, avoiding the complexity of microservices.

### Testing Requirements: Unit + Integration Tests
The project will require both unit tests (to test individual pieces of code) and integration tests (to ensure the frontend and backend work together correctly).

### Additional Technical Assumptions and Requests
The application's architecture must be designed to integrate with a third-party market data API for fetching price data.

## 5. Epic List

**Epic 1: Foundation & Core Journaling**  
Goal: Establish the foundational web application and deliver the core functionality for a user to log their equity, enter a new trade, and close an existing trade.

**Epic 2: Risk Management & Live Feedback Engine**  
Goal: Integrate the active risk management rules (2% & 6%) and the live equity curve to provide the user with real-time feedback on their dashboard.

**Epic 3: Psychological and Method Analysis**  
Goal: Enhance the trade journal with the features for logging the trader's specific methods (indicators/signals) and psychological state (mindset tags).

**Epic 4: Trade Review & Performance Analytics**  
Goal: Build the analysis screen where the user can filter their trade history and view key performance statistics, enabling them to learn from past trades.

## Epic 1: Foundation & Core Journaling

### Story 1.1: Set Initial Equity
**As a** trader,  
**I want** to set my initial cash equity,  
**so that** the application has a baseline for all risk and performance calculations.

#### Acceptance Criteria
1. The user can input a numerical cash equity value.
2. The entered value is saved as the starting equity.
3. The current total equity is displayed on the screen.

### Story 1.2: Log a New Trade
**As a** trader,  
**I want** to log the essential details of a new trade,  
**so that** I have a foundational record of my position.

#### Acceptance Criteria
1. A "New Trade" button is available.
2. Clicking the button opens a form with fields for at least: entry price, trade size, and stop-loss price.
3. Submitting the form saves the trade with an "active" status.
4. The new active trade appears in a journal list.

### Story 1.3: Close an Active Trade
**As a** trader,  
**I want** to close an active trade by recording the exit price,  
**so that** the system can calculate my realized profit or loss and update my equity.

#### Acceptance Criteria
1. Active trades in the journal list have a "Close" button.
2. Clicking "Close" prompts the user to enter the final exit price.
3. Upon confirmation, the system calculates the realized P/L for the trade.
4. The trade's status is updated to "closed," and the P/L is displayed.
5. The user's total equity is correctly updated with the realized P/L.

## Epic 2: Risk Management & Live Feedback Engine

### Story 2.1: Implement Per-Trade Risk Calculation (2% Rule)
**As a** trader,  
**I want** the app to automatically calculate the risk of a new trade and warn me if it exceeds 2% of my equity,  
**so that** I can maintain per-trade discipline before committing to a position.

#### Acceptance Criteria
1. When filling out the "New Trade" form, the system calculates the monetary risk ((entry price - stop loss) * size).
2. The system compares the calculated risk to 2% of the user's current total equity.
3. If the risk exceeds 2%, a prominent visual warning is displayed on the form before the user saves the trade.
4. The calculated risk amount is saved with the trade record.

### Story 2.2: Adjust Stop-Loss on an Active Trade
**As a** trader,  
**I want** to adjust the stop-loss on my active trades in the direction of the trade,  
**so that** I can lock in profits or reduce my initial risk.

#### Acceptance Criteria
1. Active trades in the journal have an "Adjust Stop" option.
2. The user can enter a new stop-loss price.
3. The system validates that the new stop can only be moved in the direction of the trade (e.g., for a long position, the new stop must be higher than the old stop).
4. Upon a valid adjustment, the trade's risk is recalculated and the record is updated.

### Story 2.3: Display Total Active Risk on Dashboard (6% Rule)
**As a** trader,  
**I want** to see the total combined risk of all my active trades on my dashboard,  
**so that** I can manage my overall account exposure at a glance.

#### Acceptance Criteria
1. The dashboard contains a widget that sums the saved risk values of all "active" trades.
2. The widget displays the total risk as a monetary value and as a percentage of total equity.
3. The widget's color changes (e.g., from green to yellow to red) as the total risk approaches the 6% limit.
4. This widget updates whenever a new trade is added or an existing trade is closed.

### Story 2.4: Integrate Market Data for Live Equity Curve
**As a** trader,  
**I want** the dashboard to display a live equity curve based on the current market price of my active positions,  
**so that** I can see my real-time performance.

#### Acceptance Criteria
1. The system successfully connects to a third-party market data API.
2. For each active trade, the system fetches the current market price for that asset.
3. The dashboard displays a chart showing the user's total equity, which fluctuates based on the unrealized Profit/Loss of all active trades.
4. The chart and equity value update automatically at a reasonable interval.

## Epic 3: Psychological and Method Analysis

### Story 3.1: Add Method Analysis Fields to Trade Log
**As a** trader,  
**I want** to log the specific indicators, signals, and any key divergences I used for a trade,  
**so that** I can analyze the effectiveness of my trading method over time.

#### Acceptance Criteria
1. The "Method Analysis" section now includes a dedicated field to specify "Bullish Divergence," "Bearish Divergence," or "None."
2. The section still contains dropdowns for other indicators/signals and a notes field for each of the three timeframes.
3. The selected and entered analysis is saved with the trade record.

### Story 3.2: Add Mindset Tagging to Trade Log
**As a** trader,  
**I want** to tag my psychological state when I enter a trade,  
**so that** I can analyze how my emotions affect my performance.

#### Acceptance Criteria
1. The "New Trade" form is extended to include a "Mindset" section.
2. This section allows the user to select one or more pre-defined tags from a list (e.g., "Disciplined," "Anxious," "FOMO," "Patient").
3. The selected tags are saved with the trade record.

### Story 3.3: Implement Indicator Alignment Engine
**As a** trader,  
**I want** the app to analyze my chosen signals and warn me if they conflict with my trade direction, while promoting trades that show strong alignment,  
**so that** I can improve my trade selection discipline.

#### Acceptance Criteria
1. The system contains a basic rules engine that understands if a signal (e.g., "Bullish Divergence") aligns with a trade direction (Long or Short).
2. When saving a trade, the system evaluates the signals from all three timeframes.
3. If a signal conflicts with the trade direction, a warning is displayed on the trade record.
4. If all signals align perfectly with the trade direction, a positive confirmation or promotion (e.g., a green checkmark) is displayed on the trade record.

## Epic 4: Trade Review & Performance Analytics

### Story 4.1: Build Trade Analytics Screen with Filtering
**As a** trader,  
**I want** a dedicated screen where I can filter my entire trade history by my journaled methods and signals,  
**so that** I can analyze specific subsets of my performance.

#### Acceptance Criteria
1. A new "Analysis" screen is added to the application.
2. The screen displays a list of all trades.
3. The user can filter the list by Indicator, Signal, Mindset Tag, and Outcome (Win/Loss).
4. Applying one or more filters correctly updates the list of trades shown.

### Story 4.2: Display Performance Statistics for Filtered Trades
**As a** trader,  
**I want** to see key performance statistics for any group of filtered trades,  
**so that** I can quantitatively understand the profitability and effectiveness of my setups.

#### Acceptance Criteria
1. On the "Analysis" screen, a summary area displays statistics for the currently filtered trades.
2. The system correctly calculates and displays: Win/Loss Ratio, Average Profit (for wins), and Average Loss (for losses).
3. The statistics update in real-time as the filters are changed.

### Story 4.3: Implement Trade Grading System
**As a** trader,  
**I want** each of my trades to receive an objective grade,  
**so that** I can quickly assess the quality of my decision-making, not just the outcome.

#### Acceptance Criteria
1. The system has a grading algorithm that assigns a score (e.g., A, B, C, F) to each closed trade.
2. The grade is calculated based on adherence to risk rules, indicator alignment, and the psychological state tagged.
3. The grade is displayed on each trade's record.
4. The user can filter trades by their grade on the "Analysis" screen.

## 6. Checklist Results Report

**Overall PRD Completeness:** 100%  
**MVP Scope Appropriateness:** Just Right  
**Readiness for Architecture Phase:** Ready  

**Final Decision:** This PRD is comprehensive, properly structured, and READY for the architecture and design phase.

## 7. Next Steps

### UX Expert Prompt
"Please review this PRD, paying close attention to the 'User Interface Design Goals' and the user stories in each epic. Based on this, please begin the process of creating the detailed UI/UX Specification document."

### Architect Prompt
"Please review this PRD, paying close attention to the 'Technical Assumptions' and the functional requirements. Based on this, please begin the process of creating the comprehensive Fullstack Architecture Document."