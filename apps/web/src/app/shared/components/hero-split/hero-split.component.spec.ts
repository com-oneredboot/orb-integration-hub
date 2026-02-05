import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeroSplitComponent } from './hero-split.component';

describe('HeroSplitComponent', () => {
  let component: HeroSplitComponent;
  let fixture: ComponentFixture<HeroSplitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroSplitComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HeroSplitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render logo with correct src and alt', () => {
    component.logoSrc = 'test-logo.jpg';
    component.logoAlt = 'Test Logo';
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('.orb-hero-split__logo img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('test-logo.jpg');
    expect(img.alt).toBe('Test Logo');
  });

  it('should render title', () => {
    component.title = 'Test Title';
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.orb-hero-split__title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('Test Title');
  });

  it('should render subtitle when provided', () => {
    component.subtitle = 'Test Subtitle';
    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('.orb-hero-split__subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle.textContent).toBe('Test Subtitle');
  });

  it('should not render subtitle when empty', () => {
    component.subtitle = '';
    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('.orb-hero-split__subtitle');
    expect(subtitle).toBeFalsy();
  });

  it('should render custom content slot', () => {
    // Custom content is projected via ng-content, so we test by checking if the slot exists
    const customContent = fixture.nativeElement.querySelector('.orb-hero-split__custom-content');
    expect(customContent).toBeTruthy();
  });

  it('should render actions slot', () => {
    // Actions are projected via ng-content with select="[buttons]"
    const actions = fixture.nativeElement.querySelector('.orb-hero-split__actions');
    expect(actions).toBeTruthy();
  });

  it('should use default values', () => {
    expect(component.logoSrc).toBe('assets/orb-logo.jpg');
    expect(component.logoAlt).toBe('Orb Integration Hub Logo');
    expect(component.title).toBe('Orb Integration Hub');
    expect(component.subtitle).toBe('');
  });
});
