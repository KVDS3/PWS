import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarProductosAdmin } from './agregar-productos-admin';

describe('AgregarProductosAdmin', () => {
  let component: AgregarProductosAdmin;
  let fixture: ComponentFixture<AgregarProductosAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarProductosAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgregarProductosAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
