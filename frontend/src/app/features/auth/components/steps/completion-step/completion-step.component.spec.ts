import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompletionStepComponent } from './completion-step.component';

describe('CompletionStepComponent', () => {
  let component: CompletionStepComponent;
  let fixture: ComponentFixture<CompletionStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompletionStepComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompletionStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
