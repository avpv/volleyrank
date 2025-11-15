/**
 * UI Configuration
 * Centralized UI constraints and settings
 *
 * This file provides a single source of truth for all UI-related constants
 * such as input constraints, form limits, and display settings.
 */

/**
 * Input Field Constraints
 */
export const INPUT_CONSTRAINTS = {
    /** Team count input */
    TEAM_COUNT: {
        MIN: 1,
        MAX: 10,
        DEFAULT: 2
    },

    /** Position composition input */
    COMPOSITION: {
        MIN: 0,
        MAX: 6,
        DEFAULT: 1
    },

    /** Position weight input */
    WEIGHT: {
        MIN: 0.1,
        MAX: 5.0,
        STEP: 0.1,
        DEFAULT: 1.0  // Default position weight
    },

    /** Position composition default value */
    COMPOSITION_DEFAULT: 0,

    /** Text truncation */
    TEXT_TRUNCATE: {
        DEFAULT_MAX_LENGTH: 50
    }
};

/**
 * Balance Quality Display Thresholds
 * NOTE: These should match BALANCE_THRESHOLDS.QUALITY in config/rating.js
 * Used for UI display only - calculation uses rating.js values
 */
export const BALANCE_DISPLAY = {
    /** Excellent balance indicator */
    EXCELLENT: 100,

    /** Very Good balance indicator */
    VERY_GOOD: 200,

    /** Good balance indicator */
    GOOD: 300,

    /** Fair balance indicator */
    FAIR: 500,

    /** Poor balance (above FAIR threshold) */
    // POOR: > 500
};

/**
 * Animation and Transition Settings
 */
export const ANIMATION = {
    /** Immediate/instant delay for display changes (ms) */
    IMMEDIATE: 10,

    /** Short animation duration (ms) */
    SHORT: 100,

    /** Navigation delay (ms) - delay before route transition */
    NAVIGATION_DELAY: 100,

    /** Standard animation duration (ms) */
    STANDARD: 300,

    /** Modal transition duration (ms) */
    MODAL_TRANSITION: 300,

    /** Long animation duration (ms) */
    LONG: 500,

    /** Activity switch delay (ms) - delay when switching activities */
    ACTIVITY_SWITCH_DELAY: 1500,

    /** Settings reload delay (ms) - delay before reloading after settings change */
    RELOAD_DELAY: 2000
};

/**
 * Debounce Settings
 */
export const DEBOUNCE = {
    /** Event handling debounce (ms) */
    EVENT: 100,

    /** Input field debounce (ms) */
    INPUT: 300,

    /** Auto-save debounce (ms) */
    SAVE: 500,

    /** Search debounce (ms) */
    SEARCH: 300
};

/**
 * Toast Notification Settings
 */
export const TOAST = {
    /** Toast animation duration (ms) */
    ANIMATION_DURATION: 300,

    /** Very short toast duration (ms) - for quick confirmations */
    SHORT_DURATION: 1500,

    /** Quick toast duration (ms) - for simple actions */
    QUICK_DURATION: 2000,

    /** Medium toast duration (ms) - for important info */
    MEDIUM_DURATION: 2500,

    /** Default toast display duration (ms) - standard notifications */
    DEFAULT_DURATION: 3000,

    /** Error toast display duration (ms) - errors need more time */
    ERROR_DURATION: 5000,

    /** Long toast duration (ms) - for processes that take time */
    LONG_DURATION: 10000
};

/**
 * Modal Settings
 */
export const MODAL = {
    /** Modal animation duration (ms) */
    ANIMATION_DURATION: 100,

    /** Modal z-index */
    Z_INDEX: 1000
};

/**
 * Layout Settings
 */
export const LAYOUT = {
    /** Layout adjustment delay (ms) */
    ADJUSTMENT_DELAY: 300,

    /** Sidebar transition duration (ms) */
    SIDEBAR_TRANSITION: 300
};

/**
 * DOM Element IDs
 * Centralized element identifiers used across the application
 */
export const ELEMENT_IDS = {
    /** Main application container */
    APP_MAIN: 'appMain',

    /** Sidebar container element */
    SIDEBAR_CONTAINER: 'pageSidebar',

    /** Mobile sidebar toggle button */
    SIDEBAR_TOGGLE: 'sidebarToggle',

    /** Sidebar backdrop overlay */
    SIDEBAR_BACKDROP: 'sidebarBackdrop',

    /** Toast notification container */
    TOAST_CONTAINER: 'toast-container',

    /** Activity select dropdown */
    ACTIVITY_SELECT: 'activitySelect',

    /** Player form */
    PLAYER_FORM: 'playerForm',

    /** Player name input field */
    PLAYER_NAME_INPUT: 'playerNameInput',

    /** Import button */
    IMPORT_BTN: 'importBtn',

    /** Reset all button */
    RESET_ALL_BTN: 'resetAllBtn',

    /** Clear all button */
    CLEAR_ALL_BTN: 'clearAllBtn',

    /** Add player accordion header */
    ADD_PLAYER_ACCORDION_HEADER: 'addPlayerAccordionHeader',

    /** Add player accordion content */
    ADD_PLAYER_ACCORDION_CONTENT: 'addPlayerAccordionContent',

    /** Import file input */
    IMPORT_FILE_INPUT: 'importFileInput',

    /** Import data textarea */
    IMPORT_DATA_INPUT: 'importDataInput',

    /** Import preview container */
    IMPORT_PREVIEW: 'importPreview',

    /** Google Sheets integration section */
    GOOGLE_SHEETS_SECTION: 'googleSheetsSection',

    /** Google Sheets connect button */
    GOOGLE_SHEETS_CONNECT_BTN: 'googleSheetsConnectBtn',

    /** Google Sheets disconnect button */
    GOOGLE_SHEETS_DISCONNECT_BTN: 'googleSheetsDisconnectBtn',

    /** Google Sheets export button */
    GOOGLE_SHEETS_EXPORT_BTN: 'googleSheetsExportBtn',

    /** Google Sheets import button */
    GOOGLE_SHEETS_IMPORT_BTN: 'googleSheetsImportBtn',

    /** Google Sheets spreadsheet ID input */
    GOOGLE_SHEETS_SPREADSHEET_ID: 'googleSheetsSpreadsheetId',

    /** Google Sheets status indicator */
    GOOGLE_SHEETS_STATUS: 'googleSheetsStatus'
};

/**
 * CSS Class Names
 * Centralized CSS classes for state management and styling
 */
export const UI_CLASSES = {
    /** Modal open state on body element */
    MODAL_OPEN: 'modal-open',

    /** Modal visible state */
    MODAL_VISIBLE: 'modal-visible',

    /** Generic open state (sidebar, accordion, etc.) */
    OPEN: 'open',

    /** Generic visible state */
    VISIBLE: 'visible',

    /** Disabled state */
    DISABLED: 'disabled',

    /** Active state (navigation, tabs, etc.) */
    ACTIVE: 'active',

    /** Show animation state */
    SHOW: 'show',

    /** Hide animation state */
    HIDE: 'hide'
};

/**
 * Data Attributes
 * Centralized data-* attribute names
 */
export const DATA_ATTRIBUTES = {
    /** Route identifier attribute */
    ROUTE: 'data-route',

    /** Action identifier attribute */
    ACTION: 'data-action',

    /** Player ID attribute */
    PLAYER_ID: 'data-player-id',

    /** Session ID attribute */
    SESSION_ID: 'data-session-id',

    /** Activity key attribute */
    ACTIVITY_KEY: 'data-activity-key'
};

/**
 * Export default configuration object
 */
export default {
    INPUT_CONSTRAINTS,
    BALANCE_DISPLAY,
    ANIMATION,
    DEBOUNCE,
    TOAST,
    MODAL,
    LAYOUT,
    ELEMENT_IDS,
    UI_CLASSES,
    DATA_ATTRIBUTES
};
