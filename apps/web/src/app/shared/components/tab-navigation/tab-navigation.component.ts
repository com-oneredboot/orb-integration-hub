// file: apps/web/src/app/shared/components/tab-navigation/tab-navigation.component.ts
// author: Kiro AI Assistant
// date: 2025-01-27
// description: Reusable tab navigation component for consistent tab-based navigation

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabConfig } from '../../models/tab-config.model';

@Component({
  selector: 'app-tab-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tab-navigation.component.html',
  styleUrls: ['./tab-navigation.component.scss']
})
export class TabNavigationComponent implements OnInit, OnChanges {
  /** Array of tab configurations to display */
  @Input() tabs: TabConfig[] = [];

  /** Currently active tab identifier */
  @Input() activeTabId = '';

  /** Event emitted when a tab is selected */
  @Output() tabChange = new EventEmitter<string>();

  /**
   * Initialize component and validate tab configuration
   */
  ngOnInit(): void {
    this.validateAndFilterTabs();
    this.validateActiveTabId();
  }

  /**
   * Handle input changes and validate activeTabId
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tabs']) {
      this.validateAndFilterTabs();
    }
    if (changes['activeTabId']) {
      this.validateActiveTabId();
    }
  }

  /**
   * Validate tabs array and filter out invalid tabs
   * Ensures at least one valid tab exists (defaults to Overview tab)
   */
  private validateAndFilterTabs(): void {
    // Filter out invalid tabs (missing id or label)
    const originalLength = this.tabs.length;
    this.tabs = this.tabs.filter(tab => {
      if (!tab.id || !tab.label) {
        console.warn('Invalid tab configuration (missing id or label):', tab);
        return false;
      }
      return true;
    });

    // If all tabs were filtered out, provide default Overview tab
    if (this.tabs.length === 0) {
      if (originalLength > 0) {
        console.warn('No valid tabs provided after filtering, using default Overview tab');
      }
      this.tabs = [{ id: 'overview', label: 'Overview' }];
    }
  }

  /**
   * Validate activeTabId and default to first tab if invalid
   */
  private validateActiveTabId(): void {
    if (this.tabs.length === 0) {
      return;
    }

    const validTab = this.tabs.find(tab => tab.id === this.activeTabId);
    if (!validTab) {
      console.warn(`Invalid activeTabId: "${this.activeTabId}", defaulting to first tab`);
      this.activeTabId = this.tabs[0].id;
    }
  }

  /**
   * Handle tab selection
   * @param tabId - The identifier of the selected tab
   */
  selectTab(tabId: string): void {
    this.tabChange.emit(tabId);
  }

  /**
   * Check if a tab is currently active
   * @param tabId - The identifier of the tab to check
   * @returns True if the tab is active, false otherwise
   */
  isActive(tabId: string): boolean {
    return this.activeTabId === tabId;
  }
}
