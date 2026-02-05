// file: apps/web/src/app/features/customers/applications/components/environment-detail-page/environment-detail-page.component.spec.ts
// author: Kiro AI Assistant
// date: 2025-01-27
// description: Integration tests for EnvironmentDetailPageComponent
// Validates page layout standardization requirements

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { EnvironmentDetailPageComponent } from './environment-detail-page.component';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';

describe('EnvironmentDetailPageComponent - Integration Tests', () => {
  let component: EnvironmentDetailPageComponent;
  let fixture: ComponentFixture<EnvironmentDetailPageComponent>;
  let store: MockStore;

  // Mock data
  const mockApplication: IApplications = {
    applicationId: 'app-123',
    organizationId: 'org-123',
    ownerId: 'user-123',
    name: 'Test Application',
    description: 'Test Description',
    status: ApplicationStatus.Active,
    environments: [Environment.Development, Environment.Staging],
    apiKey: 'test-api-key',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockOrganization: IOrganizations = {
    organizationId: 'org-123',
    ownerId: 'user-123',
    name: 'Test Organization',
    description: 'Test Org Description',
    status: OrganizationStatus.Active,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockConfig: IApplicationEnvironmentConfig = {
    applicationId: 'app-123',
    organizationId: 'org-123',
    environment: Environment.Development,
    allowedOrigins: ['https://example.com'],
    rateLimitPerMinute: 60,
    rateLimitPerDay: 10000,
    webhookUrl: '',
    webhookEnabled: false,
    webhookMaxRetries: 3,
    webhookRetryDelaySeconds: 60,
    webhookEvents: [],
    webhookSecret: 'secret-123',
    featureFlags: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const initialState = {
    applications: {
      selectedApplication: mockApplication,
      isLoading: false,
      error: null,
    },
    organizations: {
      organizations: [mockOrganization],
      isLoading: false,
      error: null,
    },
    environmentConfig: {
      selectedConfig: mockConfig,
      isLoading: false,
      isSaving: false,
      loadError: null,
      saveError: null,
    },
    environments: {
      apiKeys: [],
      isGenerating: false,
      isRevoking: false,
      generatedKey: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentDetailPageComponent],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (key: string) => {
                if (key === 'id') return 'app-123';
                if (key === 'env') return Environment.Development;
                return null;
              },
            }),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(EnvironmentDetailPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  /**
   * Integration Test 1: Page uses TabNavigationComponent
   * **Validates: Requirements 6.1**
   * 
   * Verifies that the Environment Detail page uses the TabNavigationComponent
   * for navigation as part of the page layout standardization.
   */
  it('should use TabNavigationComponent for navigation', () => {
    fixture.detectChanges();

    // Verify TabNavigationComponent is present in the DOM
    const tabNavigation = fixture.nativeElement.querySelector('app-tab-navigation');
    expect(tabNavigation).toBeTruthy();
  });

  /**
   * Integration Test 2: Page has Overview tab as first tab
   * **Validates: Requirements 2.2, 6.2**
   * 
   * Verifies that the Environment Detail page displays an Overview tab as the
   * primary (first) tab, following the standard page layout pattern.
   */
  it('should have Overview tab as the first tab', () => {
    fixture.detectChanges();

    // Verify tabs configuration
    expect(component.tabs).toBeDefined();
    expect(component.tabs.length).toBeGreaterThan(0);

    // Verify first tab is Overview
    const firstTab = component.tabs[0];
    expect(firstTab.id).toBe('overview');
    expect(firstTab.label).toBe('Overview');
  });

  /**
   * Integration Test 3: Page renders with full-width layout
   * **Validates: Requirements 2.1, 6.3, 8.1, 8.3**
   * 
   * Verifies that the Environment Detail page renders with a full-width layout
   * without max-width constraints, following the layout standardization requirements.
   */
  it('should render with full-width layout without max-width constraints', () => {
    fixture.detectChanges();

    // Get the main content container
    const contentContainer = fixture.nativeElement.querySelector('.env-detail-content');
    expect(contentContainer).toBeTruthy();

    // Get computed styles
    const computedStyles = window.getComputedStyle(contentContainer);

    // Verify no max-width constraint (should be 'none' or a very large value)
    const maxWidth = computedStyles.maxWidth;
    expect(maxWidth === 'none' || parseInt(maxWidth) > 2000).toBe(true);
  });

  /**
   * Integration Test 4: Layout order is breadcrumb → tabs → content
   * **Validates: Requirements 2.5**
   * 
   * Verifies that the page follows the standard layout pattern with elements
   * in the correct order: Breadcrumb → Tabs → Content.
   */
  it('should follow layout order: breadcrumb → tabs → content', () => {
    fixture.detectChanges();

    // Get the main content container
    const contentContainer = fixture.nativeElement.querySelector('.env-detail-content');
    expect(contentContainer).toBeTruthy();

    // Get all direct children of the content container
    const children = Array.from(contentContainer.children);

    // Find the indices of key elements
    let breadcrumbIndex = -1;
    let tabNavigationIndex = -1;
    let contentIndex = -1;

    children.forEach((child, index) => {
      const element = child as HTMLElement;
      
      // Check for breadcrumb (either direct component or container)
      if (element.querySelector('app-breadcrumb') || element.classList.contains('orb-breadcrumb-container')) {
        breadcrumbIndex = index;
      }
      
      // Check for tab navigation
      if (element.tagName.toLowerCase() === 'app-tab-navigation' || element.querySelector('app-tab-navigation')) {
        tabNavigationIndex = index;
      }
      
      // Check for main content sections
      if (element.classList.contains('env-detail-sections') || 
          element.classList.contains('env-detail-loading') ||
          element.classList.contains('env-detail-error')) {
        contentIndex = index;
      }
    });

    // Verify all elements are present
    expect(breadcrumbIndex).toBeGreaterThanOrEqual(0);
    expect(tabNavigationIndex).toBeGreaterThanOrEqual(0);

    // Verify correct order: breadcrumb comes before tabs
    expect(breadcrumbIndex).toBeLessThan(tabNavigationIndex);

    // If content is present, verify tabs come before content
    if (contentIndex >= 0) {
      expect(tabNavigationIndex).toBeLessThan(contentIndex);
    }
  });

  /**
   * Integration Test 5: TabNavigationComponent receives correct props
   * 
   * Verifies that the TabNavigationComponent receives the correct tabs
   * configuration and activeTabId from the parent component.
   */
  it('should pass correct props to TabNavigationComponent', () => {
    fixture.detectChanges();

    // Verify component has tabs configuration
    expect(component.tabs).toBeDefined();
    expect(component.tabs.length).toBeGreaterThan(0);

    // Verify component has activeTab state
    expect(component.activeTab).toBeDefined();
    expect(component.activeTab).toBe('overview');

    // Verify onTabChange handler exists
    expect(component.onTabChange).toBeDefined();
    expect(typeof component.onTabChange).toBe('function');
  });

  /**
   * Integration Test 6: Tab change handler updates active tab
   * 
   * Verifies that the onTabChange handler correctly updates the active tab state.
   */
  it('should update active tab when onTabChange is called', () => {
    fixture.detectChanges();

    // Initial state
    expect(component.activeTab).toBe('overview');

    // Simulate tab change
    component.onTabChange('security');

    // Verify active tab was updated
    expect(component.activeTab).toBe('security');
  });

  /**
   * Integration Test 7: Page maintains consistent padding
   * **Validates: Requirements 8.4**
   * 
   * Verifies that the page content container has consistent left and right padding.
   */
  it('should maintain consistent left and right padding', () => {
    fixture.detectChanges();

    // Get the main content container
    const contentContainer = fixture.nativeElement.querySelector('.env-detail-content');
    expect(contentContainer).toBeTruthy();

    // Get computed styles
    const computedStyles = window.getComputedStyle(contentContainer);

    // Get padding values
    const paddingLeft = parseInt(computedStyles.paddingLeft);
    const paddingRight = parseInt(computedStyles.paddingRight);

    // Verify left and right padding are equal
    expect(paddingLeft).toBe(paddingRight);

    // Verify padding is reasonable (not zero, not excessive)
    expect(paddingLeft).toBeGreaterThan(0);
    expect(paddingLeft).toBeLessThan(100);
  });

  /**
   * Integration Test 8: Breadcrumb is present and functional
   * **Validates: Requirements 5.1**
   * 
   * Verifies that the breadcrumb component is present and displays
   * the correct navigation path.
   */
  it('should display breadcrumb navigation', () => {
    fixture.detectChanges();

    // Verify breadcrumb component is present
    const breadcrumb = fixture.nativeElement.querySelector('app-breadcrumb');
    expect(breadcrumb).toBeTruthy();

    // Verify breadcrumb items are configured
    expect(component.breadcrumbItems).toBeDefined();
    expect(component.breadcrumbItems.length).toBeGreaterThan(0);

    // Verify breadcrumb includes expected items
    const breadcrumbLabels = component.breadcrumbItems.map(item => item.label);
    expect(breadcrumbLabels).toContain('Organizations');
    expect(breadcrumbLabels).toContain('Applications');
    expect(breadcrumbLabels).toContain('Environments');
  });

  /**
   * Integration Test 9: Overview tab has icon
   * **Validates: Requirements 1.4**
   * 
   * Verifies that the Overview tab includes an icon as specified in the design.
   */
  it('should display icon in Overview tab', () => {
    fixture.detectChanges();

    // Verify first tab has an icon
    const firstTab = component.tabs[0];
    expect(firstTab.icon).toBeDefined();
    expect(firstTab.icon).toBe('fas fa-info-circle');
  });

  /**
   * Integration Test 10: Page handles loading state
   * 
   * Verifies that the page correctly displays loading state while data is being fetched.
   */
  it('should display loading state when data is loading', () => {
    // Update store to loading state
    store.setState({
      ...initialState,
      environmentConfig: {
        ...initialState.environmentConfig,
        isLoading: true,
        selectedConfig: null,
      },
    });

    fixture.detectChanges();

    // Verify loading indicator is displayed
    const loadingElement = fixture.nativeElement.querySelector('.env-detail-loading');
    expect(loadingElement).toBeTruthy();
  });

  /**
   * Integration Test 11: Page handles error state
   * 
   * Verifies that the page correctly displays error state when data loading fails.
   */
  it('should display error state when validation fails', () => {
    fixture.detectChanges();

    // Set validation error
    component.validationError = 'Environment not configured for this application';
    fixture.detectChanges();

    // Verify error message is displayed
    const errorElement = fixture.nativeElement.querySelector('.env-detail-error');
    expect(errorElement).toBeTruthy();
    expect(errorElement.textContent).toContain('Environment not configured');
  });

  /**
   * Integration Test 12: TabNavigationComponent is positioned correctly
   * 
   * Verifies that the TabNavigationComponent is positioned after the breadcrumb
   * and before the main content area.
   */
  it('should position TabNavigationComponent between breadcrumb and content', () => {
    fixture.detectChanges();

    const contentContainer = fixture.nativeElement.querySelector('.env-detail-content');
    const children = Array.from(contentContainer.children);

    // Find elements
    let breadcrumbElement: Element | null = null;
    let tabNavigationElement: Element | null = null;
    let contentElement: Element | null = null;

    children.forEach((child) => {
      const element = child as HTMLElement;
      
      if (element.querySelector('app-breadcrumb') || element.classList.contains('orb-breadcrumb-container')) {
        breadcrumbElement = element;
      } else if (element.tagName.toLowerCase() === 'app-tab-navigation' || element.querySelector('app-tab-navigation')) {
        tabNavigationElement = element;
      } else if (element.classList.contains('env-detail-sections')) {
        contentElement = element;
      }
    });

    // Verify all elements exist
    expect(breadcrumbElement).toBeTruthy();
    expect(tabNavigationElement).toBeTruthy();

    // Verify tab navigation is between breadcrumb and content
    const breadcrumbIndex = children.indexOf(breadcrumbElement!);
    const tabNavIndex = children.indexOf(tabNavigationElement!);
    
    expect(tabNavIndex).toBeGreaterThan(breadcrumbIndex);
    
    if (contentElement) {
      const contentIndex = children.indexOf(contentElement);
      expect(tabNavIndex).toBeLessThan(contentIndex);
    }
  });
});
