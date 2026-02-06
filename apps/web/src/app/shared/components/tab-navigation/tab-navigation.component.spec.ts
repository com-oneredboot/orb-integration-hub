// file: apps/web/src/app/shared/components/tab-navigation/tab-navigation.component.spec.ts
// author: Kiro AI Assistant
// date: 2025-01-27
// description: Unit tests for TabNavigationComponent

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabNavigationComponent } from './tab-navigation.component';
import { TabConfig } from '../../models/tab-config.model';
import * as fc from 'fast-check';

describe('TabNavigationComponent', () => {
  let component: TabNavigationComponent;
  let fixture: ComponentFixture<TabNavigationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabNavigationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TabNavigationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept tabs input property', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'security', label: 'Security' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    expect(component.tabs).toEqual(tabs);
    expect(component.tabs.length).toBe(2);
  });

  it('should accept activeTabId input property', () => {
    component.activeTabId = 'overview';
    fixture.detectChanges();

    expect(component.activeTabId).toBe('overview');
  });

  it('should render tab buttons for each tab configuration', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'security', label: 'Security' },
      { id: 'settings', label: 'Settings' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
    expect(buttons.length).toBe(3);
  });

  it('should display correct label text for each tab', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'security', label: 'Security' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
    expect(buttons[0].textContent).toContain('Overview');
    expect(buttons[1].textContent).toContain('Security');
  });

  it('should emit tabChange event when tab is clicked', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'security', label: 'Security' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    spyOn(component.tabChange, 'emit');

    const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
    buttons[1].click();

    expect(component.tabChange.emit).toHaveBeenCalledWith('security');
  });

  it('should apply active class to the active tab', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'security', label: 'Security' }
    ];
    component.tabs = tabs;
    component.activeTabId = 'security';
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
    expect(buttons[0].classList.contains('orb-tab-active')).toBe(false);
    expect(buttons[1].classList.contains('orb-tab-active')).toBe(true);
  });

  it('should return true from isActive for the active tab', () => {
    component.activeTabId = 'overview';
    expect(component.isActive('overview')).toBe(true);
    expect(component.isActive('security')).toBe(false);
  });

  it('should render icon when provided', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview', icon: 'fas fa-home' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.orb-tab-icon');
    expect(icon).toBeTruthy();
    expect(icon.classList.contains('fas')).toBe(true);
    expect(icon.classList.contains('fa-home')).toBe(true);
  });

  it('should not render icon when not provided', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.orb-tab-icon');
    expect(icon).toBeFalsy();
  });

  it('should render badge when provided as number', () => {
    const tabs: TabConfig[] = [
      { id: 'members', label: 'Members', badge: 5 }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.orb-tab-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('5');
  });

  it('should render badge when provided as string', () => {
    const tabs: TabConfig[] = [
      { id: 'new', label: 'New Features', badge: 'NEW' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.orb-tab-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('NEW');
  });

  it('should not render badge when not provided', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview' }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.orb-tab-badge');
    expect(badge).toBeFalsy();
  });

  it('should not render badge when badge is null', () => {
    const tabs: TabConfig[] = [
      { id: 'overview', label: 'Overview', badge: null as unknown as undefined }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.orb-tab-badge');
    expect(badge).toBeFalsy();
  });

  it('should render badge when badge is 0', () => {
    const tabs: TabConfig[] = [
      { id: 'members', label: 'Members', badge: 0 }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.orb-tab-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('0');
  });

  it('should render all optional features together', () => {
    const tabs: TabConfig[] = [
      { id: 'members', label: 'Members', icon: 'fas fa-users', badge: 10 }
    ];
    component.tabs = tabs;
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.orb-tab-icon');
    const label = fixture.nativeElement.querySelector('.orb-tab-label');
    const badge = fixture.nativeElement.querySelector('.orb-tab-badge');

    expect(icon).toBeTruthy();
    expect(label.textContent).toBe('Members');
    expect(badge.textContent).toBe('10');
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should handle empty tabs array by providing default Overview tab', () => {
      component.tabs = [];
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.tabs.length).toBe(1);
      expect(component.tabs[0].id).toBe('overview');
      expect(component.tabs[0].label).toBe('Overview');

      // Verify the default tab is rendered
      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent).toContain('Overview');
    });

    it('should default to first tab when activeTabId is invalid', () => {
      const tabs: TabConfig[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      component.tabs = tabs;
      component.activeTabId = 'nonexistent';
      component.ngOnInit();
      fixture.detectChanges();

      // Should default to first tab
      expect(component.activeTabId).toBe('overview');

      // Verify the first tab has the active class
      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      expect(buttons[0].classList.contains('orb-tab-active')).toBe(true);
      expect(buttons[1].classList.contains('orb-tab-active')).toBe(false);
    });

    it('should filter out tabs with missing id', () => {
      const tabs: TabConfig[] = [
        { id: 'overview', label: 'Overview' },
        { id: '', label: 'Invalid Tab' },  // Missing id
        { id: 'security', label: 'Security' }
      ];
      component.tabs = tabs;
      component.ngOnInit();
      fixture.detectChanges();

      // Should have filtered out the invalid tab
      expect(component.tabs.length).toBe(2);
      expect(component.tabs[0].id).toBe('overview');
      expect(component.tabs[1].id).toBe('security');

      // Verify only valid tabs are rendered
      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      expect(buttons.length).toBe(2);
    });

    it('should filter out tabs with missing label', () => {
      const tabs: TabConfig[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'invalid', label: '' },  // Missing label
        { id: 'security', label: 'Security' }
      ];
      component.tabs = tabs;
      component.ngOnInit();
      fixture.detectChanges();

      // Should have filtered out the invalid tab
      expect(component.tabs.length).toBe(2);
      expect(component.tabs[0].id).toBe('overview');
      expect(component.tabs[1].id).toBe('security');
    });

    it('should filter out tabs with both missing id and label', () => {
      const tabs: TabConfig[] = [
        { id: 'overview', label: 'Overview' },
        { id: '', label: '' },  // Both missing
        { id: 'security', label: 'Security' }
      ];
      component.tabs = tabs;
      component.ngOnInit();
      fixture.detectChanges();

      // Should have filtered out the invalid tab
      expect(component.tabs.length).toBe(2);
    });

    it('should provide default Overview tab when all tabs are invalid', () => {
      const tabs: TabConfig[] = [
        { id: '', label: 'Invalid 1' },
        { id: 'invalid2', label: '' },
        { id: '', label: '' }
      ];
      component.tabs = tabs;
      component.ngOnInit();
      fixture.detectChanges();

      // Should have default Overview tab
      expect(component.tabs.length).toBe(1);
      expect(component.tabs[0].id).toBe('overview');
      expect(component.tabs[0].label).toBe('Overview');
    });

    it('should log warning for invalid tab configuration', () => {
      spyOn(console, 'warn');

      const tabs: TabConfig[] = [
        { id: 'overview', label: 'Overview' },
        { id: '', label: 'Invalid Tab' }
      ];
      component.tabs = tabs;
      component.ngOnInit();

      expect(console.warn).toHaveBeenCalledWith(
        'Invalid tab configuration (missing id or label):',
        jasmine.objectContaining({ id: '', label: 'Invalid Tab' })
      );
    });

    it('should log warning when no valid tabs provided after filtering', () => {
      spyOn(console, 'warn');

      const tabs: TabConfig[] = [
        { id: '', label: '' }
      ];
      component.tabs = tabs;
      component.ngOnInit();

      expect(console.warn).toHaveBeenCalledWith(
        'No valid tabs provided after filtering, using default Overview tab'
      );
    });

    it('should log warning for invalid activeTabId', () => {
      spyOn(console, 'warn');

      const tabs: TabConfig[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      component.tabs = tabs;
      component.activeTabId = 'nonexistent';
      component.ngOnInit();

      expect(console.warn).toHaveBeenCalledWith(
        'Invalid activeTabId: "nonexistent", defaulting to first tab'
      );
    });

    it('should handle ngOnChanges when tabs input changes', () => {
      // Initial setup
      component.tabs = [
        { id: 'overview', label: 'Overview' }
      ];
      component.ngOnInit();
      fixture.detectChanges();

      // Change tabs to include invalid tab
      spyOn(console, 'warn');
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: '', label: 'Invalid' }
      ];
      component.ngOnChanges({
        tabs: {
          currentValue: component.tabs,
          previousValue: [{ id: 'overview', label: 'Overview' }],
          firstChange: false,
          isFirstChange: () => false
        }
      });
      fixture.detectChanges();

      // Should have filtered out invalid tab
      expect(component.tabs.length).toBe(1);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should handle ngOnChanges when activeTabId input changes to invalid value', () => {
      // Initial setup
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      component.activeTabId = 'overview';
      component.ngOnInit();
      fixture.detectChanges();

      // Change activeTabId to invalid value
      spyOn(console, 'warn');
      component.activeTabId = 'nonexistent';
      component.ngOnChanges({
        activeTabId: {
          currentValue: 'nonexistent',
          previousValue: 'overview',
          firstChange: false,
          isFirstChange: () => false
        }
      });
      fixture.detectChanges();

      // Should have defaulted to first tab
      expect(component.activeTabId).toBe('overview');
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid activeTabId: "nonexistent", defaulting to first tab'
      );
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    /**
     * Arbitrary generator for TabConfig
     * Generates random tab configurations with valid id and label
     */
    function tabConfigArbitrary(): fc.Arbitrary<TabConfig> {
      return fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        label: fc.string({ minLength: 1, maxLength: 50 }),
        icon: fc.option(
          fc.constantFrom('fas fa-home', 'fas fa-shield-alt', 'fas fa-users', 'fas fa-info-circle', 'fas fa-list')
        ),
        badge: fc.option(
          fc.oneof(
            fc.integer({ min: 0, max: 999 }),
            fc.string({ minLength: 1, maxLength: 10 })
          )
        )
      });
    }

    /**
     * Arbitrary generator for potentially invalid TabConfig
     * Generates tab configurations that may have missing id or label
     */
    function potentiallyInvalidTabConfigArbitrary(): fc.Arbitrary<TabConfig> {
      return fc.record({
        id: fc.string({ maxLength: 20 }),  // Can be empty
        label: fc.string({ maxLength: 50 }),  // Can be empty
        icon: fc.option(
          fc.constantFrom('fas fa-home', 'fas fa-shield-alt', 'fas fa-users')
        ),
        badge: fc.option(
          fc.oneof(
            fc.integer({ min: 0, max: 999 }),
            fc.string({ minLength: 1, maxLength: 10 })
          )
        )
      });
    }

    /**
     * Property 1: Tab rendering completeness
     * **Validates: Requirements 1.1**
     * 
     * For any valid tab configuration array, the TabNavigationComponent should render
     * exactly one button element for each tab configuration with the correct label text.
     */
    it('should render exactly one button for each tab configuration with correct labels', () => {
      fc.assert(
        fc.property(
          fc.array(tabConfigArbitrary(), { minLength: 1, maxLength: 10 }),
          (tabs) => {
            // Set up component with generated tabs
            component.tabs = tabs;
            fixture.detectChanges();

            // Verify exactly one button per tab
            const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
            expect(buttons.length).toBe(tabs.length);

            // Verify each button has the correct label
            tabs.forEach((tab, index) => {
              expect(buttons[index].textContent).toContain(tab.label);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2: Tab click event emission
     * **Validates: Requirements 1.2**
     * 
     * For any tab in the tab configuration array, clicking that tab's button should emit
     * a tabChange event with the correct tab identifier.
     */
    it('should emit tabChange event with correct tab id when any tab is clicked', () => {
      fc.assert(
        fc.property(
          fc.array(tabConfigArbitrary(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tabs, clickIndex) => {
            // Skip if clickIndex is out of bounds
            if (clickIndex >= tabs.length) {
              return true;
            }

            // Set up component with generated tabs
            component.tabs = tabs;
            fixture.detectChanges();

            // Spy on the tabChange event
            const emittedValues: string[] = [];
            const subscription = component.tabChange.subscribe((tabId: string) => {
              emittedValues.push(tabId);
            });

            // Click the tab at the generated index
            const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
            buttons[clickIndex].click();

            // Verify the correct tab id was emitted
            expect(emittedValues.length).toBe(1);
            expect(emittedValues[0]).toBe(tabs[clickIndex].id);

            subscription.unsubscribe();
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3: Active tab visual state
     * **Validates: Requirements 1.3**
     * 
     * For any tab configuration array and any valid active tab identifier, exactly one tab
     * button should have the orb-tab-active CSS class, and it should be the tab matching
     * the active identifier.
     */
    it('should apply active class to exactly one tab matching activeTabId', () => {
      fc.assert(
        fc.property(
          fc.array(tabConfigArbitrary(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (tabs, activeIndex) => {
            // Use modulo to ensure valid index
            const validIndex = activeIndex % tabs.length;

            // Set up component with generated tabs and active tab
            component.tabs = tabs;
            component.activeTabId = tabs[validIndex].id;
            fixture.detectChanges();

            // Verify exactly one tab has the active class
            const activeButtons = fixture.nativeElement.querySelectorAll('.orb-tab-active');
            expect(activeButtons.length).toBe(1);

            // Verify the active tab is the correct one
            expect(activeButtons[0].textContent).toContain(tabs[validIndex].label);

            // Verify all other tabs don't have the active class
            const allButtons = fixture.nativeElement.querySelectorAll('.orb-tab');
            allButtons.forEach((button: HTMLElement, index: number) => {
              if (index === validIndex) {
                expect(button.classList.contains('orb-tab-active')).toBe(true);
              } else {
                expect(button.classList.contains('orb-tab-active')).toBe(false);
              }
            });
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 4: Icon conditional rendering
     * **Validates: Requirements 1.4**
     * 
     * For any tab configuration, if and only if the tab includes an icon property,
     * the rendered tab button should contain an icon element with the specified icon class.
     */
    it('should render icons if and only if icon property is present', () => {
      fc.assert(
        fc.property(
          fc.array(tabConfigArbitrary(), { minLength: 1, maxLength: 10 }),
          (tabs) => {
            // Set up component with generated tabs
            component.tabs = tabs;
            fixture.detectChanges();

            // Get all tab buttons
            const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');

            // Verify each tab's icon rendering matches its configuration
            tabs.forEach((tab, index) => {
              const button = buttons[index];
              const iconElement = button.querySelector('.orb-tab-icon');

              if (tab.icon) {
                // Tab has icon property - icon element should exist
                expect(iconElement).toBeTruthy();
                
                // Verify the icon has the correct classes
                const iconClasses = tab.icon.split(' ');
                iconClasses.forEach((className: string) => {
                  expect(iconElement.classList.contains(className)).toBe(true);
                });
              } else {
                // Tab has no icon property - icon element should not exist
                expect(iconElement).toBeFalsy();
              }
            });
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 5: Badge conditional rendering
     * **Validates: Requirements 1.5**
     * 
     * For any tab configuration, if and only if the tab includes a badge property,
     * the rendered tab button should contain a badge element displaying the badge value.
     */
    it('should render badges if and only if badge property is present', () => {
      fc.assert(
        fc.property(
          fc.array(tabConfigArbitrary(), { minLength: 1, maxLength: 10 }),
          (tabs) => {
            // Set up component with generated tabs
            component.tabs = tabs;
            fixture.detectChanges();

            // Get all tab buttons
            const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');

            // Verify each tab's badge rendering matches its configuration
            tabs.forEach((tab, index) => {
              const button = buttons[index];
              const badgeElement = button.querySelector('.orb-tab-badge');

              if (tab.badge !== undefined && tab.badge !== null) {
                // Tab has badge property - badge element should exist
                expect(badgeElement).toBeTruthy();
                
                // Verify the badge displays the correct value
                expect(badgeElement.textContent).toBe(String(tab.badge));
              } else {
                // Tab has no badge property - badge element should not exist
                expect(badgeElement).toBeFalsy();
              }
            });
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 10: Tab configuration validation
     * **Validates: Requirements 7.4**
     * 
     * For any tab configuration object, it should have both 'id' and 'label' properties
     * defined as non-empty strings. The component should filter out invalid tabs and
     * ensure all rendered tabs have valid id and label.
     */
    it('should ensure all rendered tabs have non-empty id and label properties', () => {
      fc.assert(
        fc.property(
          fc.array(potentiallyInvalidTabConfigArbitrary(), { minLength: 1, maxLength: 10 }),
          (tabs) => {
            // Set up component with potentially invalid tabs
            component.tabs = tabs;
            component.ngOnInit();
            fixture.detectChanges();

            // After validation, all tabs should have non-empty id and label
            component.tabs.forEach((tab) => {
              expect(tab.id).toBeTruthy();
              expect(tab.id.length).toBeGreaterThan(0);
              expect(tab.label).toBeTruthy();
              expect(tab.label.length).toBeGreaterThan(0);
            });

            // Verify rendered tabs match the validated tabs
            const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
            expect(buttons.length).toBe(component.tabs.length);

            // Each rendered tab should have the correct label
            component.tabs.forEach((tab, index) => {
              expect(buttons[index].textContent).toContain(tab.label);
            });

            // Component should have at least one tab (default Overview if all were invalid)
            expect(component.tabs.length).toBeGreaterThanOrEqual(1);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Accessibility Tests
  describe('Accessibility Features', () => {
    it('should have role="tablist" on nav element', () => {
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      fixture.detectChanges();

      const nav = fixture.nativeElement.querySelector('nav');
      expect(nav.getAttribute('role')).toBe('tablist');
    });

    it('should have role="tab" on button elements', () => {
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      buttons.forEach((button: HTMLElement) => {
        expect(button.getAttribute('role')).toBe('tab');
      });
    });

    it('should have aria-selected="true" on active tab', () => {
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      component.activeTabId = 'security';
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      expect(buttons[0].getAttribute('aria-selected')).toBe('false');
      expect(buttons[1].getAttribute('aria-selected')).toBe('true');
    });

    it('should have aria-selected="false" on inactive tabs', () => {
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' },
        { id: 'settings', label: 'Settings' }
      ];
      component.activeTabId = 'security';
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      expect(buttons[0].getAttribute('aria-selected')).toBe('false');
      expect(buttons[1].getAttribute('aria-selected')).toBe('true');
      expect(buttons[2].getAttribute('aria-selected')).toBe('false');
    });

    it('should have aria-controls attribute on tab buttons', () => {
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      expect(buttons[0].getAttribute('aria-controls')).toBe('overview-panel');
      expect(buttons[1].getAttribute('aria-controls')).toBe('security-panel');
    });

    it('should have id attribute on tab buttons', () => {
      component.tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
      expect(buttons[0].getAttribute('id')).toBe('overview-tab');
      expect(buttons[1].getAttribute('id')).toBe('security-tab');
    });

    it('should have aria-hidden="true" on icon elements', () => {
      component.tabs = [
        { id: 'overview', label: 'Overview', icon: 'fas fa-home' }
      ];
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.orb-tab-icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    describe('Keyboard Navigation', () => {
      beforeEach(() => {
        component.tabs = [
          { id: 'tab1', label: 'Tab 1' },
          { id: 'tab2', label: 'Tab 2' },
          { id: 'tab3', label: 'Tab 3' }
        ];
        component.activeTabId = 'tab2';
        fixture.detectChanges();
      });

      it('should navigate to previous tab on ArrowLeft', () => {
        spyOn(component.tabChange, 'emit');

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        spyOn(event, 'preventDefault');
        component.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.tabChange.emit).toHaveBeenCalledWith('tab1');
      });

      it('should wrap to last tab on ArrowLeft from first tab', () => {
        component.activeTabId = 'tab1';
        fixture.detectChanges();

        spyOn(component.tabChange, 'emit');

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        component.handleKeyDown(event);

        expect(component.tabChange.emit).toHaveBeenCalledWith('tab3');
      });

      it('should navigate to next tab on ArrowRight', () => {
        spyOn(component.tabChange, 'emit');

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        spyOn(event, 'preventDefault');
        component.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.tabChange.emit).toHaveBeenCalledWith('tab3');
      });

      it('should wrap to first tab on ArrowRight from last tab', () => {
        component.activeTabId = 'tab3';
        fixture.detectChanges();

        spyOn(component.tabChange, 'emit');

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        component.handleKeyDown(event);

        expect(component.tabChange.emit).toHaveBeenCalledWith('tab1');
      });

      it('should navigate to first tab on Home key', () => {
        spyOn(component.tabChange, 'emit');

        const event = new KeyboardEvent('keydown', { key: 'Home' });
        spyOn(event, 'preventDefault');
        component.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.tabChange.emit).toHaveBeenCalledWith('tab1');
      });

      it('should navigate to last tab on End key', () => {
        spyOn(component.tabChange, 'emit');

        const event = new KeyboardEvent('keydown', { key: 'End' });
        spyOn(event, 'preventDefault');
        component.handleKeyDown(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.tabChange.emit).toHaveBeenCalledWith('tab3');
      });

      it('should not handle other keys', () => {
        spyOn(component.tabChange, 'emit');

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        spyOn(event, 'preventDefault');
        component.handleKeyDown(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(component.tabChange.emit).not.toHaveBeenCalled();
      });

      it('should focus the tab button after keyboard navigation', (done) => {
        const buttons = fixture.nativeElement.querySelectorAll('.orb-tab');
        spyOn(buttons[0] as HTMLElement, 'focus');

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        component.handleKeyDown(event);

        // Focus happens in setTimeout, so we need to wait
        setTimeout(() => {
          expect((buttons[0] as HTMLElement).focus).toHaveBeenCalled();
          done();
        }, 10);
      });
    });
  });
});
