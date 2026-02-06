/**
 * Page Layout Test Utilities
 * 
 * Shared utilities for testing page layout consistency across all pages.
 * Used to verify that all pages follow the standard layout pattern:
 * Breadcrumb → Tabs → Content
 * 
 * @see .kiro/specs/page-layout-standardization/design.md
 */

import { ComponentFixture } from '@angular/core/testing';

/**
 * Verify that a page component follows the standard layout element order
 * Expected order: breadcrumb → tabs → content
 * 
 * @param fixture - The component fixture to test
 * @returns True if layout order is correct, false otherwise
 */
export function verifyPageLayoutOrder(fixture: ComponentFixture<unknown>): boolean {
  const nativeElement = fixture.nativeElement;
  
  // Get all child elements
  const children = Array.from(nativeElement.children);
  
  // Find indices of key elements
  let breadcrumbIndex = -1;
  let tabsIndex = -1;
  let contentIndex = -1;
  
  children.forEach((child, index) => {
    const element = child as HTMLElement;
    
    // Check for breadcrumb (app-breadcrumb or .orb-breadcrumb)
    if (element.tagName.toLowerCase() === 'app-breadcrumb' || 
        element.classList.contains('orb-breadcrumb')) {
      breadcrumbIndex = index;
    }
    
    // Check for tabs (app-tab-navigation or .orb-tabs)
    if (element.tagName.toLowerCase() === 'app-tab-navigation' || 
        element.classList.contains('orb-tabs')) {
      tabsIndex = index;
    }
    
    // Check for content (various content containers)
    if (element.classList.contains('page-content') || 
        element.classList.contains('orb-content') ||
        element.classList.contains('content-area')) {
      contentIndex = index;
    }
  });
  
  // Verify order: breadcrumb < tabs < content
  // All three should be present and in correct order
  return breadcrumbIndex >= 0 && 
         tabsIndex >= 0 && 
         breadcrumbIndex < tabsIndex &&
         (contentIndex < 0 || tabsIndex < contentIndex);
}

/**
 * Verify that a page component has Overview as the first tab
 * 
 * @param tabs - The tabs configuration array from the component
 * @returns True if first tab is Overview, false otherwise
 */
export function verifyOverviewTabFirst(tabs: { id: string; label: string }[]): boolean {
  if (!tabs || tabs.length === 0) {
    return false;
  }
  
  return tabs[0].id === 'overview' && tabs[0].label === 'Overview';
}

/**
 * Verify that a page component has no max-width constraint
 * 
 * @param fixture - The component fixture to test
 * @returns True if no max-width constraint, false otherwise
 */
export function verifyFullWidthLayout(fixture: ComponentFixture<unknown>): boolean {
  const nativeElement = fixture.nativeElement;
  
  // Get the root element's computed style
  const computedStyle = window.getComputedStyle(nativeElement);
  const maxWidth = computedStyle.maxWidth;
  
  // Check if max-width is 'none' or not set
  // Also check common container elements
  if (maxWidth !== 'none' && maxWidth !== '') {
    return false;
  }
  
  // Check for common container classes that might have max-width
  const containers = nativeElement.querySelectorAll('.page-container, .content-container, .main-content');
  for (const container of Array.from(containers)) {
    const containerStyle = window.getComputedStyle(container as Element);
    const containerMaxWidth = containerStyle.maxWidth;
    
    if (containerMaxWidth !== 'none' && containerMaxWidth !== '') {
      return false;
    }
  }
  
  return true;
}

/**
 * Verify that a page component has consistent left and right padding
 * 
 * @param fixture - The component fixture to test
 * @returns True if padding is consistent, false otherwise
 */
export function verifyConsistentPadding(fixture: ComponentFixture<unknown>): boolean {
  const nativeElement = fixture.nativeElement;
  
  // Get the root element's computed style
  const computedStyle = window.getComputedStyle(nativeElement);
  const paddingLeft = computedStyle.paddingLeft;
  const paddingRight = computedStyle.paddingRight;
  
  // Check if left and right padding are equal
  return paddingLeft === paddingRight;
}

/**
 * Verify that a list page has exactly one tab (Overview)
 * 
 * @param tabs - The tabs configuration array from the component
 * @returns True if exactly one tab with id 'overview', false otherwise
 */
export function verifyListPageTabRestriction(tabs: { id: string; label: string }[]): boolean {
  if (!tabs || tabs.length !== 1) {
    return false;
  }
  
  return tabs[0].id === 'overview';
}
