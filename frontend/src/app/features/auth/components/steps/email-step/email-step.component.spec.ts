import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailStepComponent } from './email-step.component';

describe('EmailStepComponent', () => {
  let component: EmailStepComponent;
  let fixture: ComponentFixture<EmailStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
