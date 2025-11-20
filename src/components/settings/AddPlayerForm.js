import BaseComponent from '../BaseComponent.js';
import storage from '../../core/StorageAdapter.js';
import toast from '../base/Toast.js';
import uiConfig from '../../config/ui.js';
import { STORAGE_KEYS } from '../../utils/constants.js';
import { getIcon } from '../base/Icons.js';
import GoogleSheetsSection from '../GoogleSheetsSection.js';

const { ELEMENT_IDS, DATA_ATTRIBUTES, ICON_SIZES, MESSAGES } = uiConfig;

class AddPlayerForm extends BaseComponent {
    constructor(container, props = {}) {
        super(container);
        this.playerService = props.playerService;
        this.onImportClick = props.onImportClick;
        this.onResetAllClick = props.onResetAllClick;
        this.onClearAllClick = props.onClearAllClick;

        this.googleSheetsSection = null;
    }

    render() {
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);
        const isOpen = !!currentActivity;

        return `
            <div class="accordion add-player-section" role="region" aria-label="Add players">
                <button
                    type="button"
                    class="accordion-header${!currentActivity ? ' disabled' : ''}"
                    id="${ELEMENT_IDS.ADD_PLAYER_ACCORDION_HEADER}"
                    aria-expanded="${isOpen}"
                    aria-controls="${ELEMENT_IDS.ADD_PLAYER_ACCORDION_CONTENT}"
                    ${!currentActivity ? 'aria-disabled="true"' : ''}>
                    <span>Add Players</span>
                    ${getIcon('chevron-down', { size: ICON_SIZES.MEDIUM, className: `accordion-icon${isOpen ? ' open' : ''}` })}
                </button>
                <div
                    class="accordion-content${isOpen ? ' open' : ''}"
                    id="${ELEMENT_IDS.ADD_PLAYER_ACCORDION_CONTENT}"
                    role="region"
                    aria-hidden="${!isOpen}">
                    <!-- Import Players Section -->
                    <div class="player-section import-section">
                        <h4 class="section-title">Import Players from File</h4>
                        <div class="section-content">
                            <button
                                type="button"
                                class="btn btn-secondary"
                                id="${ELEMENT_IDS.IMPORT_BTN}"
                                ${!currentActivity ? 'disabled' : ''}
                                aria-label="Import players from CSV or JSON file">
                                ${getIcon('arrow-down', { size: ICON_SIZES.MEDIUM, className: 'btn-icon' })}
                                Import from File
                            </button>
                            <p class="form-help-text mt-2">
                                Upload a CSV or JSON file with your players' names and positions
                            </p>
                        </div>
                    </div>

                    <!-- Google Sheets Integration Section (mounted separately) -->
                    <div id="${ELEMENT_IDS.GOOGLE_SHEETS_SECTION}"></div>

                    <!-- Manual Add Players Section -->
                    <div class="player-section manual-add-section">
                        <h4 class="section-title">Add Individual Players</h4>
                        <form class="player-form" id="${ELEMENT_IDS.PLAYER_FORM}" aria-label="Add new player form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="${ELEMENT_IDS.PLAYER_NAME_INPUT}">Player Name</label>
                                    <input
                                        type="text"
                                        id="${ELEMENT_IDS.PLAYER_NAME_INPUT}"
                                        class="form-control"
                                        placeholder="e.g., John Smith"
                                        required
                                        autocomplete="off"
                                        ${!currentActivity ? 'disabled' : ''}
                                        aria-required="true"
                                        aria-describedby="player-name-help"
                                    >
                                    <p class="form-help" id="player-name-help">Enter the full name of the player</p>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Positions
                                    <span class="text-tertiary">(select all that apply)</span>
                                </label>
                                <div class="positions-grid" id="positionsGrid" role="group" aria-label="Player positions">
                                    ${this.renderPositionCheckboxes()}
                                </div>
                                <p class="form-help">Select one or more positions this player can fill</p>
                            </div>

                            <div class="form-actions">
                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    ${!currentActivity ? 'disabled' : ''}
                                    aria-label="Add player to roster">
                                    ${getIcon('plus', { size: ICON_SIZES.MEDIUM, className: 'btn-icon' })}
                                    Add Player
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Danger Zone Section -->
                    <div class="player-section danger-zone-section">
                        <h4 class="section-title">Bulk Actions</h4>
                        <div class="form-section danger-zone">
                            <div class="form-section-actions">
                                <button
                                    type="button"
                                    class="btn btn-secondary"
                                    id="${ELEMENT_IDS.RESET_ALL_BTN}"
                                    ${!currentActivity ? 'disabled' : ''}
                                    aria-label="Reset all player ratings to default">
                                    ${getIcon('refresh', { size: ICON_SIZES.MEDIUM, className: 'btn-icon' })}
                                    Reset All Ratings
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-secondary"
                                    id="${ELEMENT_IDS.CLEAR_ALL_BTN}"
                                    ${!currentActivity ? 'disabled' : ''}
                                    aria-label="Remove all players from current session">
                                    ${getIcon('trash', { size: ICON_SIZES.MEDIUM, className: 'btn-icon' })}
                                    Remove All Players
                                </button>
                            </div>
                            <p class="form-help-text mt-3 text-tertiary">
                                ⚠️ These actions cannot be undone. Use with caution.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPositionCheckboxes() {
        const positions = this.playerService.positions;
        const currentActivity = storage.get('selectedActivity', null);

        return Object.entries(positions).map(([key, name]) => `
            <label class="position-checkbox">
                <input
                    type="checkbox"
                    name="position"
                    value="${key}"
                    class="position-input"
                    ${!currentActivity ? 'disabled' : ''}
                >
                <span class="position-label">${name} (${key})</span>
            </label>
        `).join('');
    }

    onMount() {
        this.mountGoogleSheetsSection();

        // Accordion toggle
        const accordionHeader = this.container.querySelector(`#${ELEMENT_IDS.ADD_PLAYER_ACCORDION_HEADER}`);
        if (accordionHeader) {
            accordionHeader.addEventListener('click', () => {
                this.toggleAccordion();
            });
        }

        // Form submission
        const form = this.container.querySelector(`#${ELEMENT_IDS.PLAYER_FORM}`);
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddPlayer();
            });
        }

        // Import button
        const importBtn = this.container.querySelector(`#${ELEMENT_IDS.IMPORT_BTN}`);
        if (importBtn && this.onImportClick) {
            importBtn.addEventListener('click', () => this.onImportClick());
        }

        // Reset/Clear buttons
        const resetAllBtn = this.container.querySelector(`#${ELEMENT_IDS.RESET_ALL_BTN}`);
        const clearAllBtn = this.container.querySelector(`#${ELEMENT_IDS.CLEAR_ALL_BTN}`);

        if (resetAllBtn && this.onResetAllClick) {
            resetAllBtn.addEventListener('click', () => this.onResetAllClick());
        }

        if (clearAllBtn && this.onClearAllClick) {
            clearAllBtn.addEventListener('click', () => this.onClearAllClick());
        }
    }

    onUpdate() {
        this.mountGoogleSheetsSection();
    }

    onDestroy() {
        if (this.googleSheetsSection) {
            this.googleSheetsSection.destroy();
            this.googleSheetsSection = null;
        }
    }

    mountGoogleSheetsSection() {
        const googleSheetsContainer = this.container.querySelector(`#${ELEMENT_IDS.GOOGLE_SHEETS_SECTION}`);
        if (!googleSheetsContainer) return;

        // Check if component already exists and is properly mounted
        if (this.googleSheetsSection && googleSheetsContainer.children.length > 0) {
            // Component is already mounted, just update it
            this.googleSheetsSection.update();
            return;
        }

        // Destroy old component if it exists but is not mounted
        if (this.googleSheetsSection) {
            this.googleSheetsSection.destroy();
        }

        // Create new Google Sheets section component
        this.googleSheetsSection = new GoogleSheetsSection(googleSheetsContainer, {
            playerService: this.playerService
        });

        this.googleSheetsSection.mount();
    }

    handleAddPlayer() {
        const nameInput = this.container.querySelector(`#${ELEMENT_IDS.PLAYER_NAME_INPUT}`);
        const name = nameInput.value.trim();

        const checkedBoxes = this.container.querySelectorAll('.position-input:checked');
        const positions = Array.from(checkedBoxes).map(cb => cb.value);

        if (positions.length === 0) {
            toast.error(MESSAGES.ERRORS.SELECT_POSITION);
            return;
        }

        try {
            this.playerService.add(name, positions);

            // Reset form
            nameInput.value = '';
            checkedBoxes.forEach(cb => cb.checked = false);
            nameInput.focus();
        } catch (error) {
            toast.error(error.message);
        }
    }

    toggleAccordion() {
        const currentActivity = storage.get(STORAGE_KEYS.SELECTED_ACTIVITY, null);

        // Prevent opening if no activity selected
        if (!currentActivity) {
            toast.error(MESSAGES.ERRORS.SELECT_ACTIVITY);
            return;
        }

        const content = this.container.querySelector(`#${ELEMENT_IDS.ADD_PLAYER_ACCORDION_CONTENT}`);
        const icon = this.container.querySelector('.accordion-icon');

        if (content && icon) {
            content.classList.toggle('open');
            icon.classList.toggle('open');
        }
    }
}

export default AddPlayerForm;
