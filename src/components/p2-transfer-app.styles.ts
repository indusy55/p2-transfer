import { css } from 'lit';

export const appStyles = css`
  :host {
    display: block;
    min-height: 100dvh;
    background: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-ref-typeface-plain);
  }

  * {
    box-sizing: border-box;
  }

  /* ─── Home ─── */

  .home {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--md-sys-spacing-lg);
    gap: var(--md-sys-spacing-xxl);
  }

  .home-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--md-sys-spacing-md);
    text-align: center;
  }

  .home-logo {
    width: 72px;
    height: 72px;
    border-radius: var(--md-sys-shape-corner-large);
    background: var(--md-sys-color-primary-container);
    display: grid;
    place-items: center;
    margin-bottom: var(--md-sys-spacing-sm);
  }

  .home-logo md-icon {
    --md-icon-size: 36px;
    color: var(--md-sys-color-on-primary-container);
  }

  .home-title {
    margin: 0;
    font-family: var(--md-sys-typescale-headline-large-font);
    font-size: var(--md-sys-typescale-headline-large-size);
    font-weight: var(--md-sys-typescale-headline-large-weight);
    line-height: var(--md-sys-typescale-headline-large-line-height);
    color: var(--md-sys-color-on-surface);
  }

  .home-subtitle {
    margin: 0;
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    line-height: var(--md-sys-typescale-body-large-line-height);
    color: var(--md-sys-color-on-surface-variant);
    max-width: 320px;
  }

  .home-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--md-sys-spacing-md);
    width: min(400px, 100%);
  }

  .action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--md-sys-spacing-md);
    padding: var(--md-sys-spacing-lg) var(--md-sys-spacing-md);
    border-radius: var(--md-sys-shape-corner-extra-large);
    cursor: pointer;
    border: 1px solid var(--md-sys-color-outline-variant);
    background: var(--md-sys-color-surface-container-low);
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .action-card:hover {
    background: var(--md-sys-color-surface-container);
    border-color: var(--md-sys-color-outline);
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  }

  .action-card:active {
    background: var(--md-sys-color-surface-container-high);
  }

  .action-card-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--md-sys-shape-corner-full);
    display: grid;
    place-items: center;
  }

  .action-card-icon md-icon {
    --md-icon-size: 28px;
  }

  .action-card.send .action-card-icon {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .action-card.receive .action-card-icon {
    background: var(--md-sys-color-tertiary-container);
    color: var(--md-sys-color-on-tertiary-container);
  }

  .action-card-label {
    font-family: var(--md-sys-typescale-title-medium-font);
    font-size: var(--md-sys-typescale-title-medium-size);
    font-weight: var(--md-sys-typescale-title-medium-weight);
    line-height: var(--md-sys-typescale-title-medium-line-height);
    color: var(--md-sys-color-on-surface);
  }

  /* ─── Workspace (shared send/receive layout) ─── */

  .workspace {
    width: min(100%, 520px);
    min-height: 100dvh;
    margin-inline: auto;
    padding: 0 var(--md-sys-spacing-lg) var(--md-sys-spacing-xxl);
    display: flex;
    flex-direction: column;
  }

  .topbar {
    height: 64px;
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-sm);
    margin-bottom: var(--md-sys-spacing-lg);
    flex-shrink: 0;
  }

  .topbar h1 {
    margin: 0;
    flex: 1;
    font-family: var(--md-sys-typescale-title-large-font);
    font-size: var(--md-sys-typescale-title-large-size);
    font-weight: var(--md-sys-typescale-title-large-weight);
    line-height: var(--md-sys-typescale-title-large-line-height);
  }

  .connection-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: var(--md-sys-shape-corner-full);
    font-family: var(--md-sys-typescale-label-medium-font);
    font-size: var(--md-sys-typescale-label-medium-size);
    font-weight: var(--md-sys-typescale-label-medium-weight);
    line-height: var(--md-sys-typescale-label-medium-line-height);
    background: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface-variant);
  }

  .connection-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--md-sys-color-outline);
  }

  .connection-badge[data-state="connected"]::before {
    background: var(--md-sys-color-primary);
  }

  .connection-badge[data-state="error"]::before {
    background: var(--md-sys-color-error);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: var(--md-sys-spacing-xl);
    flex: 1;
  }

  /* ─── Card containers ─── */

  .card {
    background: var(--md-sys-color-surface-container-low);
    border-radius: var(--md-sys-shape-corner-extra-large);
    padding: var(--md-sys-spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--md-sys-spacing-md);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-sm);
    font-family: var(--md-sys-typescale-title-small-font);
    font-size: var(--md-sys-typescale-title-small-size);
    font-weight: var(--md-sys-typescale-title-small-weight);
    line-height: var(--md-sys-typescale-title-small-line-height);
    color: var(--md-sys-color-on-surface-variant);
  }

  .card-header md-icon {
    --md-icon-size: 18px;
    color: var(--md-sys-color-on-surface-variant);
  }

  /* ─── Pair code display (sender) ─── */

  .code-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--md-sys-spacing-sm);
    padding: var(--md-sys-spacing-md) 0;
  }

  .code-digits {
    display: flex;
    gap: var(--md-sys-spacing-sm);
  }

  .code-digit {
    width: 44px;
    height: 56px;
    display: grid;
    place-items: center;
    background: var(--md-sys-color-surface-container-highest);
    border-radius: var(--md-sys-shape-corner-medium);
    font-family: var(--md-sys-typescale-headline-large-font);
    font-size: var(--md-sys-typescale-headline-large-size);
    font-weight: 500;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: var(--md-sys-color-on-surface);
  }

  .code-actions {
    display: flex;
    justify-content: center;
    padding-top: var(--md-sys-spacing-xs);
  }

  .code-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 56px;
  }

  /* ─── Pair code input (receiver) ─── */

  .code-input-row {
    display: flex;
    gap: var(--md-sys-spacing-sm);
    justify-content: center;
    padding: var(--md-sys-spacing-md) 0;
  }

  .code-input-digit {
    width: 44px;
    height: 56px;
    border: 2px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-surface-container-lowest);
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-sys-typescale-headline-large-font);
    font-size: var(--md-sys-typescale-headline-large-size);
    font-weight: 500;
    text-align: center;
    outline: none;
    transition: border-color 0.15s;
    caret-color: var(--md-sys-color-primary);
  }

  .code-input-digit:focus {
    border-color: var(--md-sys-color-primary);
  }

  .code-input-digit:disabled {
    opacity: 0.5;
  }

  /* ─── Nickname ─── */

  .nickname-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-md);
    background: var(--md-sys-color-surface-container-low);
    border-radius: var(--md-sys-shape-corner-large);
  }

  .nickname-info {
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-sm);
    min-width: 0;
  }

  .nickname-label {
    font-family: var(--md-sys-typescale-label-medium-font);
    font-size: var(--md-sys-typescale-label-medium-size);
    font-weight: var(--md-sys-typescale-label-medium-weight);
    line-height: var(--md-sys-typescale-label-medium-line-height);
    color: var(--md-sys-color-on-surface-variant);
    flex-shrink: 0;
  }

  .nickname-value {
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: 500;
    line-height: var(--md-sys-typescale-body-large-line-height);
    color: var(--md-sys-color-on-surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nickname-input {
    border: none;
    border-bottom: 2px solid var(--md-sys-color-primary);
    background: transparent;
    color: var(--md-sys-color-on-surface);
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: 500;
    line-height: var(--md-sys-typescale-body-large-line-height);
    padding: 2px 0;
    outline: none;
    min-width: 0;
    width: 120px;
  }

  /* ─── Drop zone / file picker ─── */

  .drop-zone {
    border: 2px dashed var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: var(--md-sys-spacing-xl) var(--md-sys-spacing-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--md-sys-spacing-md);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .drop-zone:hover {
    border-color: var(--md-sys-color-primary);
    background: color-mix(in srgb, var(--md-sys-color-primary) 5%, transparent);
  }

  .drop-zone.has-file {
    border-style: solid;
    border-color: var(--md-sys-color-outline-variant);
    cursor: default;
  }

  .drop-zone-icon {
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-full);
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    display: grid;
    place-items: center;
  }

  .drop-zone-icon md-icon {
    --md-icon-size: 24px;
  }

  .drop-zone-text {
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    color: var(--md-sys-color-on-surface-variant);
    text-align: center;
  }

  .file-input {
    display: none;
  }

  /* ─── File info ─── */

  .file-info {
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-md);
    padding: var(--md-sys-spacing-md);
    background: var(--md-sys-color-surface-container);
    border-radius: var(--md-sys-shape-corner-large);
  }

  .file-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-secondary-container);
    color: var(--md-sys-color-on-secondary-container);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .file-icon md-icon {
    --md-icon-size: 20px;
  }

  .file-details {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: 500;
    line-height: var(--md-sys-typescale-body-large-line-height);
    color: var(--md-sys-color-on-surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-size {
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    color: var(--md-sys-color-on-surface-variant);
  }

  .file-change {
    flex-shrink: 0;
  }

  /* ─── Progress ─── */

  .progress-section {
    display: flex;
    flex-direction: column;
    gap: var(--md-sys-spacing-sm);
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-label {
    font-family: var(--md-sys-typescale-label-large-font);
    font-size: var(--md-sys-typescale-label-large-size);
    font-weight: var(--md-sys-typescale-label-large-weight);
    line-height: var(--md-sys-typescale-label-large-line-height);
    color: var(--md-sys-color-on-surface);
  }

  .progress-value {
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    color: var(--md-sys-color-on-surface-variant);
    font-variant-numeric: tabular-nums;
  }

  md-linear-progress {
    --md-linear-progress-active-indicator-height: 6px;
    --md-linear-progress-track-height: 6px;
    --md-linear-progress-track-shape: 9999px;
    --md-linear-progress-active-indicator-color: var(--md-sys-color-primary);
    --md-linear-progress-track-color: var(--md-sys-color-surface-container-highest);
  }

  /* ─── Primary action button area ─── */

  .actions {
    display: flex;
    justify-content: center;
    padding-top: var(--md-sys-spacing-sm);
  }

  .actions-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--md-sys-spacing-sm);
    padding-top: var(--md-sys-spacing-sm);
  }

  .actions md-filled-button {
    --md-filled-button-container-height: 48px;
    --md-filled-button-label-text-size: 0.9375rem;
    min-width: 160px;
  }

  /* ─── Status ─── */

  .status-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--md-sys-spacing-sm);
    padding: var(--md-sys-spacing-md);
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-surface-container);
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    color: var(--md-sys-color-on-surface-variant);
    text-align: center;
  }

  .status-message md-icon {
    --md-icon-size: 18px;
  }

  /* ─── Success state ─── */

  .success-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--md-sys-spacing-lg);
    padding: var(--md-sys-spacing-xl) 0;
  }

  .success-icon {
    width: 64px;
    height: 64px;
    border-radius: var(--md-sys-shape-corner-full);
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    display: grid;
    place-items: center;
  }

  .success-icon md-icon {
    --md-icon-size: 32px;
  }

  .success-text {
    font-family: var(--md-sys-typescale-title-medium-font);
    font-size: var(--md-sys-typescale-title-medium-size);
    font-weight: var(--md-sys-typescale-title-medium-weight);
    line-height: var(--md-sys-typescale-title-medium-line-height);
    color: var(--md-sys-color-on-surface);
  }

  /* ─── Waiting state ─── */

  .waiting-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--md-sys-spacing-md);
    padding: var(--md-sys-spacing-xl) 0;
    color: var(--md-sys-color-on-surface-variant);
    text-align: center;
  }

  .waiting-state span {
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    line-height: var(--md-sys-typescale-body-large-line-height);
  }

  /* ─── Transfer list ─── */

  .transfer-list {
    display: flex;
    flex-direction: column;
    gap: var(--md-sys-spacing-sm);
  }

  .transfer-item {
    display: grid;
    grid-template-columns: 40px 1fr auto;
    align-items: center;
    gap: var(--md-sys-spacing-md);
    padding: var(--md-sys-spacing-md);
    background: var(--md-sys-color-surface-container-low);
    border-radius: var(--md-sys-shape-corner-large);
  }

  .transfer-item-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--md-sys-shape-corner-medium);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .transfer-item-icon md-icon {
    --md-icon-size: 20px;
  }

  .transfer-item-icon.send {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .transfer-item-icon.receive {
    background: var(--md-sys-color-tertiary-container);
    color: var(--md-sys-color-on-tertiary-container);
  }

  .transfer-item[data-status="complete"] .transfer-item-icon {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
  }

  .transfer-item-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .transfer-item-name {
    font-family: var(--md-sys-typescale-body-large-font);
    font-size: var(--md-sys-typescale-body-large-size);
    font-weight: 500;
    line-height: var(--md-sys-typescale-body-large-line-height);
    color: var(--md-sys-color-on-surface);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .transfer-item-meta {
    font-family: var(--md-sys-typescale-body-medium-font);
    font-size: var(--md-sys-typescale-body-medium-size);
    line-height: var(--md-sys-typescale-body-medium-line-height);
    color: var(--md-sys-color-on-surface-variant);
  }

  .transfer-paused {
    color: var(--md-sys-color-error);
  }

  .transfer-pending {
    color: var(--md-sys-color-tertiary);
  }

  .transfer-rejected {
    color: var(--md-sys-color-on-surface-variant);
  }

  .transfer-item md-linear-progress {
    margin-top: 4px;
  }

  .transfer-item-actions {
    display: flex;
    align-items: center;
    gap: var(--md-sys-spacing-xs);
    flex-shrink: 0;
  }

  /* ─── Responsive ─── */

  @media (max-width: 400px) {
    .home-actions {
      grid-template-columns: 1fr;
    }

    .code-digit,
    .code-input-digit {
      width: 38px;
      height: 48px;
      font-size: 1.5rem;
    }
  }

  @media (min-width: 600px) {
    .workspace {
      padding-inline: var(--md-sys-spacing-xl);
    }

    .code-digit,
    .code-input-digit {
      width: 52px;
      height: 64px;
    }
  }
`;
