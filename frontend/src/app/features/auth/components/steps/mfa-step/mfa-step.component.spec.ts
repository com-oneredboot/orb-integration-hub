import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MfaStepComponent } from './mfa-step.component';

describe('MfaStepComponent', () => {
  let component: MfaStepComponent;
  let fixture: ComponentFixture<MfaStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MfaStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MfaStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
